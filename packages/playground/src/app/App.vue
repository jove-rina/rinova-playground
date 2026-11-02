<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import config from 'virtual:playground/config'
import { scenes } from 'virtual:playground/scenes'
import PwToastHost from '../components/PwToastHost.vue'
import '../styles/theme.less'
import PlaygroundSidebar from './PlaygroundSidebar.vue'
import PlaygroundSourcePanel from './PlaygroundSourcePanel.vue'
import PlaygroundStage from './PlaygroundStage.vue'
import PlaygroundToolbar from './PlaygroundToolbar.vue'
import type { SceneDescriptor } from '../types'

const STORAGE_KEY = 'rinova-playground:ui-theme'
const title = config.title ?? 'Playground'

const groups = computed(() => {
  const map = new Map<string, SceneDescriptor[]>()
  for (const scene of scenes) {
    if (scene.hidden) continue
    const list = map.get(scene.group) ?? []
    list.push(scene)
    map.set(scene.group, list)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const visibleCount = computed(() => scenes.filter((scene) => !scene.hidden).length)
const activeId = ref(scenes.find((scene) => !scene.hidden)?.id ?? scenes[0]?.id ?? '')
const activeScene = computed(() => scenes.find((scene) => scene.id === activeId.value) ?? scenes[0])

const showCode = ref(false)
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

const toggleTheme = () => {
  preference.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, preference.value)
}

/* ---------------- 路由（History API） ---------------- */

const basePath = (() => {
  const raw = config.base ?? '/'
  return raw.endsWith('/') ? raw : `${raw}/`
})()

/** 从 location.pathname 解析出场景 id（去掉 base 与尾部斜杠） */
const sceneIdFromPath = (): string => {
  const path = decodeURIComponent(window.location.pathname)
  const trimmed = path.startsWith(basePath) ? path.slice(basePath.length) : path.replace(/^\//, '')
  return trimmed.replace(/\/+$/, '')
}

const readLocation = () => {
  const id = sceneIdFromPath()
  if (id && scenes.some((scene) => scene.id === id)) activeId.value = id
}

watch(activeId, (id) => {
  if (!id) return
  const target = `${basePath}${id}`
  if (decodeURIComponent(window.location.pathname) !== target) {
    window.history.pushState(null, '', target)
  }
})

/* ---------------- 快捷键 ---------------- */

const onKeydown = (event: KeyboardEvent) => {
  const meta = event.metaKey || event.ctrlKey
  if (meta && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    sidebarRef.value?.focusSearch()
    return
  }
  if (meta && event.key === '.') {
    event.preventDefault()
    return
  }
  if (event.key === 'Escape' && showCode.value) {
    showCode.value = false
  }
}

/* ---------------- 生命周期 ---------------- */

const media = window.matchMedia('(prefers-color-scheme: dark)')

const onMediaChange = (event: MediaQueryListEvent) => {
  systemDark.value = event.matches
}

onMounted(() => {
  document.title = title
  systemDark.value = media.matches
  media.addEventListener('change', onMediaChange)
  readLocation()
  if (activeId.value && sceneIdFromPath() !== activeId.value) {
    window.history.replaceState(null, '', `${basePath}${activeId.value}`)
  }
  window.addEventListener('popstate', readLocation)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  media.removeEventListener('change', onMediaChange)
  window.removeEventListener('popstate', readLocation)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="pw-app">
    <PlaygroundSidebar
      ref="sidebarRef"
      :title="title"
      :groups="groups"
      :active-id="activeId"
      :scene-count="visibleCount"
      @select="activeId = $event"
    />

    <main class="pw-main">
      <PlaygroundToolbar
        v-if="activeScene"
        :group="activeScene.group"
        :title="activeScene.title"
        :show-code="showCode"
        :width="width"
        :theme="theme"
        @toggle-code="showCode = !showCode"
        @update:width="width = $event"
        @toggle-theme="toggleTheme"
      />

      <PlaygroundStage v-if="activeScene" :scene="activeScene" :width="width" />
      <div v-else class="pw-empty">没有找到任何场景，请在 scenes 目录下新建 .vue 文件。</div>

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
  flex-direction: column;
  flex: 1;
  min-width: 0;
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
}
</style>
