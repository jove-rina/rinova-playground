<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { Check, Copy, X } from '@lucide/vue'
import config from 'virtual:playground/config'
import { scenes } from 'virtual:playground/scenes'
import PwButton from '../components/PwButton.vue'
import PwToastHost from '../components/PwToastHost.vue'
import { toast } from '../components/toast'
import CodeBlock from '../code/CodeBlock.vue'
import '../styles/theme.css'
import PlaygroundSidebar from './PlaygroundSidebar.vue'
import PlaygroundStage from './PlaygroundStage.vue'
import PlaygroundToolbar from './PlaygroundToolbar.vue'
import type { SceneDescriptor } from '../types'

const STORAGE_KEY = 'rinova-playground:ui-theme'
const title = config.title ?? 'Playground'

const groups = computed(() => {
  const map = new Map<string, SceneDescriptor[]>()
  for (const scene of scenes) {
    const list = map.get(scene.group) ?? []
    list.push(scene)
    map.set(scene.group, list)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const activeId = ref(scenes[0]?.id ?? '')
const activeScene = computed(() => scenes.find((scene) => scene.id === activeId.value) ?? scenes[0])

const showCode = ref(false)
const sidebarRef = ref<InstanceType<typeof PlaygroundSidebar> | null>(null)
const width = ref<'auto' | 'tablet' | 'mobile'>('auto')

/* ---------------- 主题 ---------------- */

type Preference = 'light' | 'dark' | 'auto'

function readStoredTheme(): Preference | null {
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

function toggleTheme() {
  preference.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, preference.value)
}

/* ---------------- 源码 ---------------- */

const source = ref('')
const sourceState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const copied = ref(false)

watch(
  [activeId, showCode],
  async () => {
    if (!showCode.value || !activeScene.value) return
    sourceState.value = 'loading'
    try {
      source.value = await activeScene.value.raw()
      sourceState.value = 'ready'
    } catch {
      sourceState.value = 'error'
    }
  },
  { immediate: true }
)

async function copySource() {
  try {
    await navigator.clipboard.writeText(source.value)
    copied.value = true
    toast('已复制源码', 'success')
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    toast('复制失败，请手动选择', 'error')
  }
}

/* ---------------- 路由 ---------------- */

function readHash() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  if (raw && scenes.some((scene) => scene.id === raw)) activeId.value = raw
}

watch(activeId, (id) => {
  if (id && window.location.hash !== `#/${id}`) {
    window.history.replaceState(null, '', `#/${id}`)
  }
})

/* ---------------- 快捷键 ---------------- */

function onKeydown(event: KeyboardEvent) {
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

function onMediaChange(event: MediaQueryListEvent) {
  systemDark.value = event.matches
}

onMounted(() => {
  document.title = title
  systemDark.value = media.matches
  media.addEventListener('change', onMediaChange)
  readHash()
  if (activeId.value && !window.location.hash) {
    window.history.replaceState(null, '', `#/${activeId.value}`)
  }
  window.addEventListener('hashchange', readHash)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  media.removeEventListener('change', onMediaChange)
  window.removeEventListener('hashchange', readHash)
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
      :scene-count="scenes.length"
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

      <section v-if="showCode && activeScene" class="pw-code-panel">
        <header class="pw-code-panel__head">
          <span class="pw-code-panel__file">{{ activeScene.rel }}</span>
          <div class="pw-code-panel__actions">
            <PwButton size="sm" variant="text" :title="copied ? '已复制' : '复制源码'" @click="copySource">
              <template #icon>
                <Check v-if="copied" :size="13" />
                <Copy v-else :size="13" />
              </template>
            </PwButton>
            <PwButton size="sm" variant="text" title="关闭（Esc）" @click="showCode = false">
              <template #icon><X :size="13" /></template>
            </PwButton>
          </div>
        </header>
        <div class="pw-code-panel__body">
          <CodeBlock
            v-if="sourceState === 'ready'"
            :code="source"
            :lang="activeScene.lang"
          />
          <span v-else-if="sourceState === 'error'" class="pw-code-panel__hint">
            源码读取失败：{{ activeScene.rel }}
          </span>
          <span v-else class="pw-code-panel__hint">读取源码中…</span>
        </div>
      </section>
    </main>

    <PwToastHost />
  </div>
</template>

<style scoped>
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

.pw-code-panel {
  display: flex;
  flex-direction: column;
  height: 40%;
  min-height: 180px;
  border-top: 1px solid var(--rp-color-border);
  background: var(--rp-color-bg);
}

.pw-code-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 36px;
  flex: 0 0 36px;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-code-panel__file {
  font-family: var(--rp-font-mono);
  font-size: 12px;
  color: var(--rp-color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-code-panel__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.pw-code-panel__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pw-code-panel__hint {
  display: block;
  padding: 16px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
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
