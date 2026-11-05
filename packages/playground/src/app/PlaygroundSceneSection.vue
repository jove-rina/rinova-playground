<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Share2 } from '@lucide/vue'
import CodeBlock from '../code/CodeBlock.vue'
import { copyText } from '../code/clipboard'
import { toast } from '../components/toast'
import PwApiBrief from '../components/PwApiBrief.vue'
import PlaygroundSceneArgs from './PlaygroundSceneArgs.vue'
import PlaygroundSceneSource from './PlaygroundSceneSource.vue'
import PlaygroundSceneOutput from './PlaygroundSceneOutput.vue'
import PlaygroundPluginWrappers from './PlaygroundPluginWrappers.vue'
import PwSceneBoundary from '../components/PwSceneBoundary.vue'
import { provideSceneContext } from '../payload/context'
import { pluginWrapperEntries } from '../plugin'
import { currentArgsSlots } from '../payload/args'
import { api, pageComponents } from 'virtual:playground/api'
import { currentOutputSlots } from '../payload/output'
import config from 'virtual:playground/config'
import type { Component } from 'vue'
import type { ComponentApi, SceneDescriptor } from '../types'

const props = defineProps<{ scene: SceneDescriptor; theme?: 'light' | 'dark' }>()
const emit = defineEmits<{ focus: [name: string]; inspect: [key: string] }>()

/** 让场景内的 useSceneArgs / useSceneOutput 知道自己属于哪个场景 */
provideSceneContext(props.scene.name)

const rootEl = ref<HTMLElement | null>(null)
const component = shallowRef<Component | null>(null)
const mounted = ref(false)


const fileName = computed(() => props.scene.rel.split('/').pop() ?? props.scene.rel)

/**
 * 文档场景：不套演示画布，按文档排版直接铺在页面上。
 * 由插件在扫描时定好（Markdown 场景恒为 true，`.vue` 页看 pageMeta.doc），运行时不再猜。
 */
const isDoc = computed(() => props.scene.doc)

/** 分享：把地址栏 hash 同步成这个场景，再复制「当前页地址 + 锚点」 */
const share = async (): Promise<void> => {
  emit('focus', props.scene.name)
  const { origin, pathname, search } = window.location
  const url = `${origin}${pathname}${search}#${encodeURIComponent(props.scene.name)}`
  const ok = await copyText(url)
  toast(ok ? '已复制场景链接' : '复制失败，请手动复制地址')
}

/** 演示画布主题：默认浅色，'auto' 跟随外壳；组件不一定支持暗色 */
const stageTheme = computed<'light' | 'dark'>(() => {
  const stage = config.theme?.stage ?? 'light'
  return stage === 'auto' ? (props.theme ?? 'light') : stage
})
/** 该场景演示的 API：名字 + 类型/默认值（从契约里查） */
const contractOfPage = computed<ComponentApi | null>(() => {
  const name = pageComponents[props.scene.pageId]
  return name ? (api[name] ?? null) : null
})

const apiItems = computed(() =>
  (props.scene.api ?? []).map((name) => {
    const source = contractOfPage.value
    const prop = source?.props.find((item) => item.name === name)
    const event = source?.events.find((item) => item.name === name)
    return {
      name,
      type: prop?.type ?? event?.type,
      default: prop?.default,
    }
  })
)

/** section → API 表里的 tab 名 */
const SECTION_KIND: Record<string, string> = {
  props: 'props',
  events: 'events',
  exposes: 'exposed',
  slots: 'slots',
}

const inspect = (name: string): void => {
  emit('inspect', `${SECTION_KIND[props.scene.section] ?? 'props'}:${name}`)
}

/** 本场景是否声明了输入 / 输出；决定「输入 | 输出」并排还是单栏 */
const ownsSlot = (sceneId: string): boolean => !sceneId || sceneId === props.scene.name
const hasArgs = computed(() => currentArgsSlots.value.some((slot) => ownsSlot(slot.sceneId)))
const hasOutput = computed(() => currentOutputSlots.value.some((slot) => ownsSlot(slot.sceneId)))
const singleColumn = computed(() => !hasArgs.value || !hasOutput.value)

let observer: IntersectionObserver | null = null

/** 进入视口附近才挂载，一页十几个场景也只跑 2~3 个实例 */
const mount = async (): Promise<void> => {
  if (mounted.value) return
  mounted.value = true
  try {
    const mod = await props.scene.load()
    component.value = mod.default
  } catch (error) {
    console.warn(`[rinova-playground] 场景加载失败：${props.scene.rel}`, error)
  }
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    void mount()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void mount()
        observer?.disconnect()
      }
    },
    { rootMargin: '600px 0px' }
  )
  if (rootEl.value) observer.observe(rootEl.value)
})

onBeforeUnmount(() => observer?.disconnect())

/** 页内索引点击落到本场景时，立即挂载 */
defineExpose({ mount })
</script>

<template>
  <section :id="scene.name" ref="rootEl" class="pw-scene" :class="{ 'is-doc': isDoc }">
    <header class="pw-scene__head">
      <h2 class="pw-scene__title">
        <a :href="`#${scene.name}`" class="pw-scene__anchor" @click.prevent="emit('focus', scene.name)">
          <span class="pw-scene__hash" aria-hidden="true">#</span>{{ scene.title }}
        </a>
      </h2>

      <div class="pw-scene__actions">
        <button type="button" class="pw-scene__action" :data-tip="`复制「${scene.title}」的链接`"
          aria-label="复制场景链接" @click="share">
          <Share2 :size="12" :stroke-width="2" />
          <span>分享</span>
        </button>
      </div>
    </header>

    <p v-if="scene.description" class="pw-scene__desc">{{ scene.description }}</p>
    <PwApiBrief v-if="apiItems.length" :items="apiItems" @inspect="inspect" />

    <div class="pw-scene__preview" :class="{ 'is-doc': isDoc }">
      <div v-if="isDoc" class="pw-scene__doc">
        <PwSceneBoundary :title="scene.title" :file="scene.rel">
          <component :is="component" v-if="component" />
          <div v-else class="pw-scene__skeleton" aria-hidden="true" />
        </PwSceneBoundary>
      </div>
      <div v-else class="pw-scene__canvas" :data-pw-stage="stageTheme">
        <PwSceneBoundary :title="scene.title" :file="scene.rel">
          <PlaygroundPluginWrappers :entries="pluginWrapperEntries">
            <component :is="component" v-if="component" />
            <div v-else class="pw-scene__skeleton" aria-hidden="true" />
          </PlaygroundPluginWrappers>
        </PwSceneBoundary>
      </div>
    </div>

    <div v-if="hasArgs || hasOutput" class="pw-scene__io" :class="{ 'is-single': singleColumn }">
      <PlaygroundSceneArgs v-if="hasArgs" :scene-name="scene.name" />
      <PlaygroundSceneOutput v-if="hasOutput" :scene-name="scene.name" />
    </div>

    <PlaygroundSceneSource v-if="scene.showSource" :scene="scene" />
  </section>
</template>

<style scoped lang="less">
.pw-scene {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--rp-color-border);
  scroll-margin-top: 16px;

  &:last-child {
    border-bottom: 0;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  /* 文档场景没有 h1，场景标题就是这一段的标题，比正文 h2 高一级 */
  &.is-doc &__title {
    font-size: 18px;
    letter-spacing: -0.01em;
  }

  &__anchor {
    color: var(--rp-color-text);
    text-decoration: none;

    &:hover .pw-scene__hash {
      color: var(--rp-color-primary);
    }
  }

  &__hash {
    margin-right: 6px;
    color: var(--rp-color-text-muted);
    font-weight: 400;
    transition: color 0.15s ease;
  }

  /* 贴着标题，不再顶到行最右；默认隐藏，鼠标进到场景或键盘聚焦时再出现 */
  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &:hover &__actions,
  &__actions:focus-within {
    opacity: 1;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 1px solid var(--rp-color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;

    &:hover {
      border-color: var(--rp-color-primary);
      color: var(--rp-color-primary);
    }
  }

  &__desc {
    margin: 0;
    color: var(--rp-color-text-muted);
    font-size: 12.5px;
    line-height: 1.7;
  }

  &__preview {
    border: 1px solid var(--rp-color-border);
    border-radius: var(--rp-radius);
    overflow: hidden;

    /* 文档场景（.md）直接铺在页面上：它不是 demo，不该套演示画布的白卡片 */
    &.is-doc {
      border: 0;
      border-radius: 0;
      overflow: visible;
    }
  }

  /* 画布自带 token（见 theme.less 的 [data-pw-stage]），与外壳主题解耦。
     宽度贴合 demo 内容（max-width: 100%），避免组件只有 500px 时拉出一大片空白白卡 */
  &__canvas {
    padding: 18px;
    background: var(--rp-color-bg);
    color: var(--rp-color-text);
  }

  &__skeleton {
    height: 88px;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      var(--rp-color-surface) 0%,
      color-mix(in srgb, var(--rp-color-border) 40%, transparent) 50%,
      var(--rp-color-surface) 100%
    );
    background-size: 200% 100%;
    animation: pw-skeleton 1.2s linear infinite;
  }

  &__io {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 12px;
    align-items: start;

    &.is-single {
      grid-template-columns: minmax(0, 1fr);
    }

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

/* 预览宽度由容器决定（设备外壳 / 手动宽度），媒体查询看不到，所以用 container query */
@container pw-preview (max-width: 760px) {
  .pw-scene__io {
    grid-template-columns: minmax(0, 1fr);
  }

}

@keyframes pw-skeleton {
  to {
    background-position: -200% 0;
  }
}
</style>