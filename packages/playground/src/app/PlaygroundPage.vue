<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Code2, Maximize, Moon, SlidersHorizontal, Smartphone, Sun, Tablet } from '@lucide/vue'
import { api, pageComponents } from 'virtual:playground/api'
import type { ComponentApi } from '../types'
import PlaygroundApiTable from './PlaygroundApiTable.vue'
import PlaygroundEditorPicker from './PlaygroundEditorPicker.vue'
import PlaygroundPageIndex from './PlaygroundPageIndex.vue'
import PlaygroundSceneSection from './PlaygroundSceneSection.vue'
import type { PageDescriptor, SceneDescriptor } from '../types'

const props = defineProps<{
  page: PageDescriptor
  scenes: SceneDescriptor[]
  width: 'auto' | 'tablet' | 'mobile'
  theme: 'light' | 'dark'
  showCode: boolean
  showArgs: boolean
  hasArgs: boolean
}>()

const emit = defineEmits<{
  'update:width': [value: 'auto' | 'tablet' | 'mobile']
  'toggle-theme': []
  'toggle-code': []
  'toggle-args': []
  'update:active': [name: string]
  focus: [name: string]
}>()

const scrollEl = ref<HTMLElement | null>(null)
const active = ref(props.scenes[0]?.name ?? '')

/** 场景视图 / API 视图 */
const view = ref<'scenes' | 'api'>('scenes')
const focusApi = ref('')

const contract = computed<ComponentApi | null>(() => {
  const name = props.page.component ?? pageComponents[props.page.id]
  return name ? (api[name] ?? null) : null
})

/** 场景里的 API 标签被点击：切到 API 视图并定位到那一行 */
const openApi = (key: string): void => {
  focusApi.value = ''
  view.value = 'api'
  nextTick(() => {
    focusApi.value = key
  })
}

/** API 表的「演示」列：切回场景视图并滚过去 */
const openScene = (name: string): void => {
  view.value = 'scenes'
  nextTick(() => jump(name))
}
const sectionRefs = new Map<string, { mount: () => Promise<void> }>()
/** 程序化滚动期间暂停滚动联动，避免高亮跑到上一节 */
let suppressScrollSpyUntil = 0

const setSectionRef = (name: string) => (instance: unknown) => {
  if (instance) sectionRefs.set(name, instance as { mount: () => Promise<void> })
  else sectionRefs.delete(name)
}

const widths = [
  { value: 'auto' as const, label: '自适应', icon: Maximize },
  { value: 'tablet' as const, label: '平板 820px', icon: Tablet },
  { value: 'mobile' as const, label: '手机 420px', icon: Smartphone },
]

const visibleCount = computed(() => props.scenes.filter((scene) => !scene.hidden).length)

const maxWidth = computed(() =>
  props.width === 'tablet' ? '820px' : props.width === 'mobile' ? '420px' : 'none'
)

/** 滚动联动：取最后一个顶边越过阈值的场景 */
const onScroll = (): void => {
  const container = scrollEl.value
  if (!container) return
  if (Date.now() < suppressScrollSpyUntil) return
  const threshold = container.getBoundingClientRect().top + 96
  let current = props.scenes[0]?.name ?? ''
  for (const scene of props.scenes) {
    const el = document.getElementById(scene.name)
    if (!el) continue
    if (el.getBoundingClientRect().top <= threshold) current = scene.name
  }
  if (current && current !== active.value) {
    active.value = current
    emit('update:active', current)
  }
}

const jump = async (name: string): Promise<void> => {
  const el = document.getElementById(name)
  const container = scrollEl.value
  if (!el || !container) return
  active.value = name
  emit('update:active', name)
  emit('focus', name)

  suppressScrollSpyUntil = Date.now() + 900
  // 懒挂载会让目标场景高度变化，先挂载再滚动，避免落在错位置
  await sectionRefs.get(name)?.mount()
  await nextTick()
  const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top
  container.scrollTo({ top: container.scrollTop + delta - 8, behavior: 'smooth' })
}

watch(active, () => nextTick(onScroll))

onMounted(() => {
  if (window.location.hash) {
    const name = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    if (props.scenes.some((scene) => scene.name === name)) {
      active.value = name
      emit('update:active', name)
      nextTick(() => document.getElementById(name)?.scrollIntoView({ block: 'start' }))
    }
  }
})
</script>

<template>
  <div class="pw-page">
    <header class="pw-page__head">
      <div class="pw-page__crumb">
        <template v-if="page.group !== page.title">
          <span class="pw-page__group">{{ page.group }}</span>
          <span class="pw-page__sep">/</span>
        </template>
        <span class="pw-page__name">{{ page.title }}</span>
        <span class="pw-page__count">{{ visibleCount }} 个场景</span>
      </div>

      <div class="pw-page__actions">
        <div class="pw-view" role="tablist" aria-label="视图">
          <button
            type="button"
            class="pw-view__btn"
            :class="{ 'is-active': view === 'scenes' }"
            @click="view = 'scenes'"
          >
            场景
          </button>
          <button
            v-if="contract"
            type="button"
            class="pw-view__btn"
            :class="{ 'is-active': view === 'api' }"
            @click="view = 'api'"
          >
            API
          </button>
        </div>

        <div class="pw-width" role="group" aria-label="预览宽度">
          <button
            v-for="item in widths"
            :key="item.value"
            type="button"
            class="pw-width__btn"
            :class="{ 'is-active': width === item.value }"
            :title="item.label"
            @click="emit('update:width', item.value)"
          >
            <component :is="item.icon" :size="14" />
          </button>
        </div>
        <PlaygroundEditorPicker />
        <button type="button" class="pw-head-btn" :title="theme === 'dark' ? '浅色' : '深色'" @click="emit('toggle-theme')">
          <Moon v-if="theme === 'light'" :size="14" />
          <Sun v-else :size="14" />
        </button>
        <button
          type="button"
          class="pw-head-btn"
          :class="{ 'is-active': showArgs }"
          :disabled="!hasArgs"
          title="显示 / 隐藏参数区"
          @click="emit('toggle-args')"
        >
          <SlidersHorizontal :size="14" />
        </button>
        <button
          type="button"
          class="pw-head-btn"
          :class="{ 'is-active': showCode }"
          title="查看当前场景源码"
          @click="emit('toggle-code')"
        >
          <Code2 :size="14" />
        </button>
      </div>
    </header>

    <div ref="scrollEl" class="pw-page__scroll" @scroll.passive="onScroll">
      <div class="pw-page__body">
        <div class="pw-page__frame" :style="{ maxWidth: view === 'api' ? 'none' : maxWidth }">
          <p v-if="page.description && view === 'scenes'" class="pw-page__desc">{{ page.description }}</p>

          <div v-if="view === 'scenes'" class="pw-page__main">
            <PlaygroundSceneSection
              v-for="scene in scenes"
              :key="scene.id"
              :ref="setSectionRef(scene.name)"
              :scene="scene"
              :show-args="showArgs"
              :theme="theme"
              @focus="jump"
              @inspect="openApi"
            />
          </div>
          <PlaygroundApiTable
            v-else-if="contract"
            :contract="contract"
            :scenes="scenes"
            :focus="focusApi"
            :notes="page.apiNotes"
            @jump="openScene"
          />
          <p v-else class="pw-page__api-empty">
            这一页没有绑定组件。在 <code>&lt;页&gt;/meta.ts</code> 里写 <code>component: 'MyButton'</code> 就会生成 API 表。
          </p>
        </div>
        <PlaygroundPageIndex v-if="view === 'scenes'" :scenes="scenes" :active="active" @jump="jump" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.pw-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  &__head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    border-bottom: 1px solid var(--rp-color-border);
  }

  &__crumb {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    font-size: 13px;
  }

  &__group {
    color: var(--rp-color-text-muted);
  }

  &__sep {
    color: var(--rp-color-border);
  }

  &__name {
    font-weight: 600;
  }

  &__count {
    margin-left: 6px;
    color: var(--rp-color-text-muted);
    font-size: 11.5px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 20px 24px 40px;
  }

  &__frame {
    flex: 1;
    min-width: 0;
    margin: 0 auto;
    transition: max-width 0.2s ease;
  }

  &__desc {
    margin: 0 0 20px;
    color: var(--rp-color-text-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  &__body {
    display: flex;
    align-items: flex-start;
    gap: 32px;
    width: 100%;
  }

  &__main {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 28px;
    min-width: 0;
  }
}

.pw-view {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--rp-color-border);
  border-radius: 8px;

  &__btn {
    padding: 3px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;

    &:hover {
      color: var(--rp-color-text);
    }

    &.is-active {
      background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
      color: var(--rp-color-primary);
      font-weight: 600;
    }
  }
}

.pw-page__api-empty {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 12.5px;

  code {
    padding: 1px 5px;
    border: 1px solid var(--rp-color-border);
    border-radius: 4px;
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }
}

.pw-width {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--rp-color-border);
  border-radius: 8px;

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--rp-color-text-muted);
    cursor: pointer;

    &:hover {
      color: var(--rp-color-text);
    }

    &.is-active {
      background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
      color: var(--rp-color-primary);
    }
  }
}

/* 页头所有图标按钮统一：28×28、圆角 8、1px 边框、图标 14 */
.pw-head-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--rp-color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;

  &:hover {
    border-color: var(--rp-color-primary);
    color: var(--rp-color-primary);
  }

  &.is-active {
    border-color: var(--rp-color-primary);
    background: color-mix(in srgb, var(--rp-color-primary) 10%, transparent);
    color: var(--rp-color-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
