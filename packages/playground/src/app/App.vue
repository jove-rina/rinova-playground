<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import config from 'virtual:playground/config'
import { pages, scenes } from 'virtual:playground/scenes'
import PwToastHost from '../components/PwToastHost.vue'
import { currentArgs } from '../payload/args'
import { currentOutput } from '../payload/output'
import '../styles/theme.less'
import PlaygroundPage from './PlaygroundPage.vue'
import PlaygroundParamsPanel from './PlaygroundParamsPanel.vue'
import PlaygroundSidebar from './PlaygroundSidebar.vue'
import PlaygroundSourcePanel from './PlaygroundSourcePanel.vue'
import type { PageDescriptor, SceneDescriptor } from '../types'

const STORAGE_KEY = 'rinova-playground:ui-theme'
const title = config.title ?? 'Playground'

const isPage = (value: PageDescriptor): boolean => value.group !== ''

/** 每个页下的场景（hidden 不进索引与侧栏，但锚点仍可直达） */
const scenesOfPage = (pageId: string): SceneDescriptor[] =>
  scenes.filter((scene) => scene.pageId === pageId)

/** 侧栏计数与页内索引只算可见场景 */
const visibleScenesOfPage = (pageId: string): SceneDescriptor[] =>
  scenesOfPage(pageId).filter((scene) => !scene.hidden)

interface NavGroup {
  name: string
  pages: { id: string; title: string; count: number }[]
}

const pageGroups = computed<NavGroup[]>(() => {
  const map = new Map<string, NavGroup>()
  for (const page of pages.filter(isPage)) {
    const entry: NavGroup = map.get(page.group) ?? { name: page.group, pages: [] }
    const count = visibleScenesOfPage(page.id).length
    if (count === 0) continue
    entry.pages.push({ id: page.id, title: page.title, count })
    map.set(page.group, entry)
  }
  return [...map.values()]
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

const showCode = ref(false)
const showPayload = ref(false)
const hasPayload = computed(() => currentArgs.value !== null || currentOutput.value !== null)

watch(hasPayload, (value) => {
  if (!value) showPayload.value = false
})

const sidebarRef = ref<InstanceType<typeof PlaygroundSidebar> | null>(null)
const width = ref<'auto' | 'tablet' | 'mobile'>('auto')

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

watchEffect(() => {
  document.documentElement.dataset.pwTheme = theme.value
})

const toggleTheme = (): void => {
  preference.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, preference.value)
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

/** 切换页时重置到该页第一个场景 */
watch(activePageId, (id) => {
  writeLocation()
  const list = scenesOfPage(id)
  activeSceneName.value = list[0]?.name ?? ''
  window.history.replaceState(null, '', `${basePath}${id}`)
})

const focusScene = (name: string): void => {
  activeSceneName.value = name
  window.history.replaceState(null, '', `${basePath}${activePageId.value}#${name}`)
}

/* ---------------- 快捷键 ---------------- */

const onKeydown = (event: KeyboardEvent): void => {
  const meta = event.metaKey || event.ctrlKey
  if (meta && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    sidebarRef.value?.focusSearch()
    return
  }
  if (event.key === 'Escape' && showCode.value) {
    showCode.value = false
  }
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
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  media.removeEventListener('change', onMediaChange)
  window.removeEventListener('popstate', readLocation)
  window.removeEventListener('hashchange', readLocation)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="pw-app">
    <PlaygroundSidebar
      ref="sidebarRef"
      :title="title"
      :groups="pageGroups"
      :active-page-id="activePageId"
      :scene-count="visibleCount"
      @select="activePageId = $event"
    />

    <main class="pw-main">
      <div class="pw-content">
      <template v-if="activePage">
        <PlaygroundPage
          :key="activePage.id"
          :page="activePage"
          :scenes="activeScenes"
          :width="width"
          :theme="theme"
          :show-code="showCode"
          :show-payload="showPayload"
          :has-payload="hasPayload"
          @update:width="width = $event"
          @update:active="activeSceneName = $event"
          @toggle-theme="toggleTheme"
          @toggle-code="showCode = !showCode"
          @toggle-payload="showPayload = !showPayload"
          @focus="focusScene"
        />
      </template>
      <div v-else class="pw-empty">
        没有找到任何场景。目录约定：<code>src/scenes/&lt;分组&gt;/&lt;组件页&gt;/&lt;场景&gt;.vue</code>
      </div>

      <div v-if="showPayload && hasPayload" class="pw-inspector">
        <PlaygroundParamsPanel :theme="theme" :scene-name="activeSceneName" />
      </div>
      </div>

      <div v-if="showCode && activeScene" class="pw-source-slot">
        <PlaygroundSourcePanel :scene="activeScene" :theme="theme" @close="showCode = false" />
      </div>
    </main>

    <PwToastHost />
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

.pw-source-slot {
  height: 42%;
  min-height: 200px;
  border-top: 1px solid var(--rp-color-border);
  background: var(--rp-color-bg);
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
