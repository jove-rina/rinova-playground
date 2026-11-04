<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Maximize,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Tablet,
} from '@lucide/vue'
import { api, pageComponents } from 'virtual:playground/api'
import type { ComponentApi } from '../types'
import PwInput from '../components/PwInput.vue'
import PlaygroundApiTable from './PlaygroundApiTable.vue'
import PlaygroundEditorPicker from './PlaygroundEditorPicker.vue'
import PlaygroundPageIndex from './PlaygroundPageIndex.vue'
import PlaygroundSceneSection from './PlaygroundSceneSection.vue'
import type { PageDescriptor, SceneDescriptor } from '../types'
import { CUSTOM_WIDTH, clampWidth, resolveViewport, VIEWPORT_PRESETS, type ViewportState } from './viewport'

const props = defineProps<{
  page: PageDescriptor
  scenes: SceneDescriptor[]
  viewport: ViewportState
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}>()

const emit = defineEmits<{
  'update:viewport': [value: ViewportState]
  'toggle-theme': [event?: MouseEvent]
  'toggle-sidebar': []
  'collapse-sidebar': []
  'update:active': [name: string]
  focus: [name: string]
}>()

const INDEX_KEY = 'rinova-playground:index-open'
/** 右侧场景索引的展开状态，存 localStorage */
const indexOpen = ref(localStorage.getItem(INDEX_KEY) !== '0')
const toggleIndex = (): void => {
  indexOpen.value = !indexOpen.value
  localStorage.setItem(INDEX_KEY, indexOpen.value ? '1' : '0')
}

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

const icons = { auto: Maximize, mobile: Smartphone, tablet: Tablet, desktop: Monitor }
const presets = VIEWPORT_PRESETS.map((preset) => ({ ...preset, icon: icons[preset.id] }))

const current = computed(() => resolveViewport(props.viewport))
/** 只有固定宽度才套设备外壳；自适应就是铺满 */
const shell = computed(() => (current.value.px ? current.value.shell : 'none'))

const deviceEl = ref<HTMLElement | null>(null)
/** 设备实际渲染宽度：目标宽度可能被可用空间夹住，caption 要显示真实值 */
const measuredWidth = ref(0)
let deviceObserver: ResizeObserver | null = null

const deviceLabel = computed(() => {
  const width = `${measuredWidth.value}px`
  if (props.viewport.id === 'custom') return `自定义 · ${width}`
  const preset = VIEWPORT_PRESETS.find((item) => item.id === props.viewport.id)
  return `${preset?.label ?? '预览'} ${width}`
})

const customOpen = ref(props.viewport.id === 'custom')
const customValue = ref(String(props.viewport.id === 'custom' ? props.viewport.px : 480))

const pick = (id: ViewportState['id']): void => {
  customOpen.value = id === 'custom'
  if (id === 'custom') {
    applyCustom()
    return
  }
  emit('update:viewport', { id, px: 0 })
}

const applyCustom = (): void => {
  const px = clampWidth(Number(customValue.value) || CUSTOM_WIDTH.min)
  customValue.value = String(px)
  emit('update:viewport', { id: 'custom', px })
}

const onCustomInput = (value: string): void => {
  customValue.value = value
}

const onCustomEnter = (): void => {
  applyCustom()
}

const visibleCount = computed(() => props.scenes.filter((scene) => !scene.hidden).length)

/** 自适应铺满；固定宽度用所选值（设备外壳另外画） */
const maxWidth = computed(() => (current.value.px ? `${current.value.px}px` : 'none'))

/** 滚动联动：取最后一个顶边越过阈值的场景 */
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  deviceObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    // 边框盒宽度 = 外壳总宽（含边框厚度），和预设的 390 / 820 对得上
    const width = entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width ?? 0
    measuredWidth.value = Math.round(width)
  })
  if (deviceEl.value) deviceObserver.observe(deviceEl.value)
})

onBeforeUnmount(() => deviceObserver?.disconnect())

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
      <button
        type="button"
        class="pw-head-btn"
        :title="sidebarOpen ? '收起侧栏（⌘.）' : '展开侧栏（⌘.）'"
        @click="emit('toggle-sidebar')"
      >
        <PanelLeftClose v-if="sidebarOpen" :size="14" />
        <PanelLeftOpen v-else :size="14" />
      </button>

      <div class="pw-page__crumb">
        <!-- 分组标签只在「页名 ≠ 组名」时出现，避免出现 Button Button 这种重复 -->
        <span v-if="page.group !== page.title" class="pw-page__group">{{ page.group }}</span>
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
            v-for="item in presets"
            :key="item.id"
            type="button"
            class="pw-width__btn"
            :class="{ 'is-active': viewport.id === item.id }"
            :title="item.px ? `${item.label} ${item.px}px` : item.label"
            :aria-pressed="viewport.id === item.id"
            @click="pick(item.id)"
          >
            <component :is="item.icon" :size="14" />
          </button>
          <button
            type="button"
            class="pw-width__btn"
            :class="{ 'is-active': viewport.id === 'custom' }"
            title="自定义宽度"
            :aria-pressed="viewport.id === 'custom'"
            @click="pick('custom')"
          >
            <SlidersHorizontal :size="14" />
          </button>

          <label v-if="customOpen" class="pw-width__custom">
            <PwInput
              size="sm"
              type="number"
              :model-value="customValue"
              :placeholder="`${CUSTOM_WIDTH.min}–${CUSTOM_WIDTH.max}`"
              @update:model-value="onCustomInput"
              @keydown.enter="onCustomEnter"
              @blur="onCustomEnter"
            />
            <span class="pw-width__unit">px</span>
          </label>
        </div>
        <PlaygroundEditorPicker />
        <button type="button" class="pw-head-btn" :title="theme === 'dark' ? '浅色' : '深色'" @click="emit('toggle-theme', $event)">
          <Moon v-if="theme === 'light'" :size="14" />
          <Sun v-else :size="14" />
        </button>
        <button
          v-if="view === 'scenes'"
          type="button"
          class="pw-head-btn pw-head-btn--index"
          :title="indexOpen ? '收起索引' : '展开索引'"
          :aria-pressed="indexOpen"
          @click="toggleIndex"
        >
          <PanelRightClose v-if="indexOpen" :size="14" />
          <PanelRightOpen v-else :size="14" />
        </button>
      </div>
    </header>

    <div class="pw-page__work">
      <div
        class="pw-device-wrap"
        :class="shell === 'none' ? 'is-auto' : `pw-device-wrap--${shell}`"
        :style="shell === 'none' ? undefined : { '--pw-device-w': `${current.px}px` }"
      >
      <div ref="deviceEl" class="pw-device">
        <div v-if="shell === 'desktop'" class="pw-device__bar" aria-hidden="true"><i /><i /><i /></div>
        <span v-if="shell === 'phone'" class="pw-device__sensor" aria-hidden="true" />

        <div ref="scrollEl" class="pw-page__scroll" :class="{ 'is-api': view === 'api' }" @scroll.passive="onScroll">
          <div class="pw-page__body" :class="{ 'is-device': shell !== 'none', 'is-phone': shell === 'phone' }">
        <div class="pw-page__frame" :style="{ maxWidth: view === 'api' ? 'none' : maxWidth }">
          <p v-if="page.description && view === 'scenes'" class="pw-page__desc">{{ page.description }}</p>

          <div v-if="view === 'scenes'" class="pw-page__main">
            <PlaygroundSceneSection
              v-for="scene in scenes"
              :key="scene.id"
              :ref="setSectionRef(scene.name)"
              :scene="scene"
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
          </div>
        </div>
      </div>

        <p v-if="shell !== 'none'" class="pw-device__caption">{{ deviceLabel }}</p>
      </div>

      <!-- 右侧索引是页面级别的导航，不属于被预览的内容，放在设备外壳之外 -->
      <div v-if="view === 'scenes'" class="pw-index-slot" :class="{ 'is-collapsed': !indexOpen }">
        <PlaygroundPageIndex :scenes="scenes" :active="active" @jump="jump" />
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
    /* 与侧栏品牌条（.pw-sidebar__brand 的 49px）严格等高：两条横线在分界处必须接上 */
    height: 49px;
    padding: 0 24px;
    border-bottom: 1px solid var(--rp-color-border);
  }

  &__crumb {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
  }

  /* 分组：实心标签，比原来的灰色「Card /」更容易认出来 */
  &__group {
    flex: 0 0 auto;
    /* 负 margin 抵消标签左右内边距（8px + 1px 边框），让标签里的文字和正文左边缘对齐 */
    margin-left: -9px;
    padding: 1px 8px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: var(--rp-color-surface);
    color: var(--rp-color-text);
    font-size: 11.5px;
    font-weight: 500;
    line-height: 18px;
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
    /* 设备壳里的屏幕要有实底，否则外框底色会透上来 */
    background: var(--rp-color-bg);
    /* 用 ::-webkit-scrollbar 自定义 6px 细条。注意别同时写 scrollbar-width /
       scrollbar-color —— Chromium 里标准属性会覆盖 webkit 规则，滚动条会变成常驻粗条 */

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    /* 闲置时透明，指针进到滚动区才显形：否则常驻的浅色条会和索引分隔线并成"双线" */
    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: transparent;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--rp-color-text-muted) 26%, transparent);
    }

    &:hover::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--rp-color-text-muted) 45%, transparent);
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }

  /**
   * API 视图：外层不滚，改由 .pw-api__body 自己滚。
   * 这样页签行是固定的，滚动条只属于内容区。
   */
  &__scroll.is-api {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;

    .pw-page__body {
      flex: 1;
      align-items: stretch;
      gap: 0;
      min-height: 0;
      padding-top: 0;
    }

    .pw-page__frame {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
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
  align-items: center;
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

  &__custom {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 2px;
    padding-left: 6px;
    border-left: 1px solid var(--rp-color-border);

    :deep(.pw-input) {
      width: 78px;
      border-color: transparent;
      background: transparent;
    }
  }

  &__unit {
    color: var(--rp-color-text-muted);
    font-size: 11px;
  }
}

/* ---------------- 预览设备外壳 ---------------- */

.pw-device-wrap {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  /* 自适应：不套壳，铺满 */
  &.is-auto {
    padding: 0;
    gap: 0;
  }

  &:not(.is-auto) {
    padding: 18px 20px 12px;
  }

  &:not(.is-auto) .pw-device {
    /* 目标宽度可能大于可用空间（如 1280 桌面），夹住避免撑破页面 */
    width: min(var(--pw-device-w), 100%);
    max-width: 100%;
    padding: 10px;
    border: 1px solid var(--rp-color-border);
    border-radius: 30px;
    background: color-mix(in srgb, var(--rp-color-text) 6%, var(--rp-color-bg));
    box-shadow: 0 26px 54px -34px color-mix(in srgb, var(--rp-color-text) 60%, transparent);
  }

  /* 注意：这些覆盖要和上面的 :not(.is-auto) .pw-device 同权重或更高，否则圆角不生效 */
  &--phone:not(.is-auto) .pw-device {
    padding: 12px;
    border-radius: 40px;
  }

  &--tablet:not(.is-auto) .pw-device {
    padding: 12px;
    border-radius: 26px;
  }

  &--desktop:not(.is-auto) .pw-device {
    padding: 0;
    overflow: hidden;
    border-radius: 12px;
  }

  /* 屏幕圆角：与外框同心，内容滚到边缘会被裁掉 */
  &--phone .pw-page__scroll {
    border-radius: 28px;
  }

  &--tablet .pw-page__scroll {
    border-radius: 15px;
  }

  &--desktop .pw-page__scroll {
    border-radius: 0;
  }
}

.pw-device {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  width: 100%;
  /* 预览宽度是容器宽度，不是浏览器窗口宽度：内部响应式用 container query */
  container-type: inline-size;
  container-name: pw-preview;

  &__bar {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-bottom: 1px solid var(--rp-color-border);
    background: var(--rp-color-surface);

    i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--rp-color-text-muted) 42%, transparent);
    }
  }

  &__sensor {
    position: absolute;
    top: 5px;
    left: 50%;
    width: 56px;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--rp-color-text-muted) 42%, transparent);
    transform: translateX(-50%);
  }

  &__caption {
    margin: 0;
    color: var(--rp-color-text-muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
}

/* 页面级工作区：左边是预览（可能套设备外壳），右边是场景索引 —— 索引不在外壳里 */
.pw-page__work {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* 索引槽：收起时宽度归零（索引自己的宽度和分隔线一起被裁掉） */
.pw-index-slot {
  flex: 0 0 auto;
  width: 216px;
  min-height: 0;
  overflow: hidden;
  /* 分隔线画在槽位上：索引内容只有几条时线也要通到页面底部 */
  border-left: 1px solid var(--rp-color-border);
  transition: width 0.18s ease;

  &.is-collapsed {
    width: 0;
    border-left-color: transparent;
  }
}

/* 窗口不够宽时索引直接让位（否则正文只剩三百来像素），开关一起收起。
   选择器要压过下面的 .pw-head-btn { display: flex }，所以带上 .pw-page__head */
@media (max-width: 1080px) {
  .pw-index-slot,
  .pw-page__head .pw-head-btn--index {
    display: none;
  }
}

@container pw-preview (max-width: 560px) {
  .pw-page__scroll {
    padding: 14px 14px 28px;
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