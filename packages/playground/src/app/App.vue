<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import config from 'virtual:playground/config'
import { pages, scenes } from 'virtual:playground/scenes'
import PwToastHost from '../components/PwToastHost.vue'
import PwTooltip from '../components/PwTooltip.vue'
import { currentOutputSlots } from '../payload/output'
import { providePlaygroundTheme } from '../plugin'
import '../styles/api.less'
import '../styles/theme.less'
import PlaygroundPage from './PlaygroundPage.vue'
import PlaygroundPluginPanel from './PlaygroundPluginPanel.vue'
import PlaygroundSidebar from './PlaygroundSidebar.vue'
import { DEFAULT_VIEWPORT, type ViewportState } from './viewport'
import type { PageDescriptor, SceneDescriptor } from '../types'

const STORAGE_KEY = 'rinova-playground:ui-theme'
const SIDEBAR_KEY = 'rinova-playground:sidebar-open'
const VIEWPORT_KEY = 'rinova-playground:viewport'
const title = config.title ?? 'Playground'

const isPage = (value: PageDescriptor): boolean => value.group !== ''

/** 每个页下的场景（hidden 不进索引与侧栏，但锚点仍可直达） */
const scenesOfPage = (pageId: string): SceneDescriptor[] =>
  scenes.filter((scene) => scene.pageId === pageId)

/** 侧栏计数与页内索引只算可见场景 */
const visibleScenesOfPage = (pageId: string): SceneDescriptor[] =>
  scenesOfPage(pageId).filter((scene) => !scene.hidden)

interface NavPage {
  id: string
  title: string
  count: number
  depth: 1 | 2
  children: NavPage[]
}

interface NavGroup {
  name: string
  pages: NavPage[]
}

/**
 * 侧栏树：分组（config.groups 声明序）→ 组件页（pageMeta.order）→ 子组件页。
 * 一个组件页下可以有子组件页（目录再深一层），父页即使自己没有场景也要保留，否则子页会丢。
 */
const pageGroups = computed<NavGroup[]>(() => {
  const groups = new Map<
    string,
    { name: string; groupOrder: number; pages: NavPage[]; nodes: Map<string, NavPage> }
  >()

  for (const page of pages.filter(isPage)) {
    let group = groups.get(page.group)
    if (!group) {
      group = {
        name: page.group,
        groupOrder: page.groupOrder ?? Number.MAX_SAFE_INTEGER,
        pages: [],
        nodes: new Map<string, NavPage>(),
      }
      groups.set(page.group, group)
    }

    const node: NavPage = {
      id: page.id,
      title: page.title,
      count: visibleScenesOfPage(page.id).length,
      depth: page.depth ?? 1,
      children: [],
    }
    group.nodes.set(page.id, node)
    const parent = page.parentId ? group.nodes.get(page.parentId) : undefined
    if (parent) parent.children.push(node)
    else group.pages.push(node)
  }

  const prune = (node: NavPage): NavPage | null => {
    node.children = node.children.map(prune).filter((child): child is NavPage => child !== null)
    if (node.count === 0 && node.children.length === 0) return null
    return node
  }

  return [...groups.values()]
    .sort((a, b) => a.groupOrder - b.groupOrder)
    .map((group) => ({ name: group.name, pages: group.pages.map(prune).filter((page): page is NavPage => page !== null) }))
    .filter((group) => group.pages.length > 0)
})

const visibleCount = computed(() => scenes.filter((scene) => !scene.hidden).length)

const firstPageId = computed(
  () => pages.filter(isPage).find((page) => visibleScenesOfPage(page.id).length > 0)?.id ?? ''
)
const activePageId = ref(firstPageId.value)
const activePage = computed(
  () => pages.find((page) => page.id === activePageId.value) ?? pages.filter(isPage)[0]
)
const activeScenes = computed(() => (activePage.value ? scenesOfPage(activePage.value.id) : []))
const activeSceneName = ref(activeScenes.value[0]?.name ?? '')
const activeScene = computed(
  () => activeScenes.value.find((scene) => scene.name === activeSceneName.value) ?? activeScenes.value[0]
)



const pageRef = ref<InstanceType<typeof PlaygroundPage> | null>(null)

/**
 * 从全局搜索点一个场景：同页直接滚过去；跨页先记下要落到的场景，
 * 切页的 watch 会把它当作初始场景，页面挂载后再由 PlaygroundPage 滚到位置。
 */
const pendingScene = ref('')
const jumpToScene = (pageId: string, sceneName: string): void => {
  if (pageId === activePageId.value) {
    pageRef.value?.jumpTo(sceneName)
    return
  }
  pendingScene.value = sceneName
  activePageId.value = pageId
}

/** 左侧栏展开 / 收起，存 localStorage */
const readSidebarOpen = (): boolean => localStorage.getItem(SIDEBAR_KEY) !== '0'
const sidebarOpen = ref(readSidebarOpen())
const toggleSidebar = (): void => {
  sidebarOpen.value = !sidebarOpen.value
  localStorage.setItem(SIDEBAR_KEY, sidebarOpen.value ? '1' : '0')
}
/** 预览宽度：预设 + 自定义，写 localStorage，刷新后保持 */
const readViewport = (): ViewportState => {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWPORT_KEY) ?? 'null') as ViewportState | null
    if (!raw || typeof raw.id !== 'string') return { ...DEFAULT_VIEWPORT }
    return { id: raw.id, px: Number(raw.px) || 0 }
  } catch {
    return { ...DEFAULT_VIEWPORT }
  }
}
const viewport = ref<ViewportState>(readViewport())
const setViewport = (next: ViewportState): void => {
  viewport.value = next
  localStorage.setItem(VIEWPORT_KEY, JSON.stringify(next))
}

/* ---------------- 主题 ---------------- */

type Preference = 'light' | 'dark' | 'auto'

const readStoredTheme = (): Preference | null => {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

const preference = ref<Preference>(readStoredTheme() ?? config.theme?.ui ?? 'auto')
const systemDark = ref(false)
const theme = computed<'light' | 'dark'>(() =>
  preference.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : preference.value
)

/** 插件 UI 跟随外壳主题：给它们一个 computed，而不是让它们猜 DOM */
providePlaygroundTheme(theme)

watchEffect(() => {
  document.documentElement.dataset.pwTheme = theme.value
})

const applyTheme = (next: 'light' | 'dark'): void => {
  preference.value = next
  localStorage.setItem(STORAGE_KEY, next)
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { ready: Promise<void> }
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

/** 浅色/深色切换：从按钮位置揭开式过渡（View Transitions），降级时不打断交互 */
const toggleTheme = (event?: MouseEvent): void => {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  const doc = document as ViewTransitionDocument
  // 键盘触发（detail === 0）没有有意义的坐标，直接用无动效路径
  if (!event || event.detail === 0 || !doc.startViewTransition || reduceMotion.matches) {
    applyTheme(next)
    return
  }

  const x = event.clientX
  const y = event.clientY
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = doc.startViewTransition(async () => {
    applyTheme(next)
    // 等 Vue 把 data-pw-theme 落到 DOM 上，快照才是新主题
    await nextTick()
  })

  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
    .catch(() => {})
}

/* ---------------- 路由（History API）：/<分组>/<组件页>#<场景> ---------------- */

const basePath = (() => {
  // routeBase 只影响场景 URL 前缀，不影响 Vite 的 base（MPA / 多入口部署用）；
  // 单站部署沿用 base。
  const raw = (config as { routeBase?: string }).routeBase ?? config.base ?? '/'
  return raw.endsWith('/') ? raw : `${raw}/`
})()

const pathSegments = (): string => {
  const pathname = decodeURIComponent(window.location.pathname)
  const trimmed = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname.replace(/^\//, '')
  return trimmed.replace(/\/+$/, '')
}

const hashName = (): string => decodeURIComponent(window.location.hash.replace(/^#/, ''))

const readLocation = (): void => {
  const pageId = pathSegments()
  if (pageId && pages.some((page) => page.id === pageId)) {
    activePageId.value = pageId
  }
  const name = hashName()
  if (name && activeScenes.value.some((scene) => scene.name === name)) {
    activeSceneName.value = name
  }
}

const writeLocation = (): void => {
  const pageId = activePageId.value
  if (!pageId) return
  const target = `${basePath}${pageId}`
  if (decodeURIComponent(window.location.pathname) !== target) {
    window.history.pushState(null, '', target)
  }
}

/** 切换页时重置到该页第一个场景（从搜索跳进来时落到指定场景） */
watch(activePageId, (id) => {
  writeLocation()
  const list = scenesOfPage(id)
  const target = pendingScene.value && list.some((scene) => scene.name === pendingScene.value) ? pendingScene.value : ''
  pendingScene.value = ''
  activeSceneName.value = target || list[0]?.name || ''
  window.history.replaceState(null, '', `${basePath}${id}`)
})

const focusScene = (name: string): void => {
  activeSceneName.value = name
  window.history.replaceState(null, '', `${basePath}${activePageId.value}#${name}`)
}

/* ---------------- 生命周期 ---------------- */

const media = window.matchMedia('(prefers-color-scheme: dark)')

const onMediaChange = (event: MediaQueryListEvent): void => {
  systemDark.value = event.matches
}

onMounted(() => {
  document.title = title
  systemDark.value = media.matches
  media.addEventListener('change', onMediaChange)
  readLocation()
  if (activePageId.value) {
    window.history.replaceState(null, '', `${basePath}${activePageId.value}${window.location.hash}`)
  }
  window.addEventListener('popstate', readLocation)
  window.addEventListener('hashchange', readLocation)
})

onBeforeUnmount(() => {
  media.removeEventListener('change', onMediaChange)
  window.removeEventListener('popstate', readLocation)
  window.removeEventListener('hashchange', readLocation)
})
</script>

<template>
  <div class="pw-app" :class="{ 'is-sidebar-collapsed': !sidebarOpen }">
    <PlaygroundSidebar
      v-show="sidebarOpen"
      :title="title"
      :groups="pageGroups"
      :scenes="scenes"
      :active-page-id="activePageId"
      :scene-count="visibleCount"
      @select="activePageId = $event"
      @select-scene="jumpToScene"
    />

    <main class="pw-main">
      <div class="pw-content">
      <template v-if="activePage">
        <PlaygroundPage
          :key="activePage.id"
          ref="pageRef"
          :page="activePage"
          :scenes="activeScenes"
          :initial-active="activeSceneName"
          :viewport="viewport"
          :theme="theme"
          :sidebar-open="sidebarOpen"
          @update:viewport="setViewport"
          @collapse-sidebar="toggleSidebar"
          @update:active="activeSceneName = $event"
          @toggle-theme="toggleTheme"
          @toggle-sidebar="toggleSidebar"
          @focus="focusScene"
        />
      </template>
      <div v-else class="pw-empty">
        没有找到任何场景。目录约定：<code>src/scenes/&lt;分组&gt;/&lt;组件页&gt;/&lt;场景&gt;.vue</code>
      </div>
      </div>

    </main>

    <PwToastHost />
    <PwTooltip />
    <PlaygroundPluginPanel />
  </div>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
}

.pw-app .pw-sidebar {
  transition: width 0.18s ease, flex-basis 0.18s ease;
}

.pw-app.is-sidebar-collapsed .pw-sidebar {
  flex-basis: 0;
  width: 0;
  overflow: hidden;
  border-right-width: 0;
}

.pw-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.pw-content {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.pw-inspector {
  flex: 0 0 320px;
  width: 320px;
  min-height: 0;
  border-left: 1px solid var(--rp-color-border);
  overflow: hidden;
}


.pw-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--rp-color-text-muted);
  font-size: 13px;

  code {
    padding: 1px 5px;
    border: 1px solid var(--rp-color-border);
    border-radius: 4px;
    font-family: var(--rp-font-mono);
  }
}
</style>