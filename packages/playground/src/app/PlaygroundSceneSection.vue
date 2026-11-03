<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import CodeBlock from '../code/CodeBlock.vue'
import PwApiBrief from '../components/PwApiBrief.vue'
import PlaygroundSceneArgs from './PlaygroundSceneArgs.vue'
import PlaygroundEditorMenu from './PlaygroundEditorMenu.vue'
import PlaygroundSceneSource from './PlaygroundSceneSource.vue'
import PlaygroundSceneOutput from './PlaygroundSceneOutput.vue'
import PwSceneBoundary from '../components/PwSceneBoundary.vue'
import { provideSceneContext } from '../payload/context'
import { currentArgsSlots } from '../payload/args'
import { currentOutputSlots } from '../payload/output'
import type { Component } from 'vue'
import type { SceneDescriptor } from '../types'

const props = defineProps<{ scene: SceneDescriptor; showArgs?: boolean; theme?: 'light' | 'dark' }>()
const emit = defineEmits<{ focus: [name: string] }>()

/** 让场景内的 useSceneArgs / useSceneOutput 知道自己属于哪个场景 */
provideSceneContext(props.scene.name)

const rootEl = ref<HTMLElement | null>(null)
const component = shallowRef<Component | null>(null)
const mounted = ref(false)


const fileName = computed(() => props.scene.rel.split('/').pop() ?? props.scene.rel)
const apiItems = computed(() => (props.scene.api ?? []).map((name) => ({ name })))

/** 本场景是否声明了入参 / 出参；决定「参数 | 出参」并排还是单栏 */
const ownsSlot = (sceneId: string): boolean => !sceneId || sceneId === props.scene.name
const hasArgs = computed(() => currentArgsSlots.value.some((slot) => ownsSlot(slot.sceneId)))
const hasOutput = computed(() => currentOutputSlots.value.some((slot) => ownsSlot(slot.sceneId)))
const showArgsBlock = computed(() => props.showArgs !== false && hasArgs.value)
const singleColumn = computed(() => !showArgsBlock.value || !hasOutput.value)

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
  <section :id="scene.name" ref="rootEl" class="pw-scene">
    <header class="pw-scene__head">
      <h2 class="pw-scene__title">
        <a :href="`#${scene.name}`" class="pw-scene__anchor" @click.prevent="emit('focus', scene.name)">
          <span class="pw-scene__hash" aria-hidden="true">#</span>{{ scene.title }}
        </a>
      </h2>
      <div class="pw-scene__actions">
        <PlaygroundEditorMenu :rel="scene.rel" />
      </div>
    </header>

    <p v-if="scene.description" class="pw-scene__desc">{{ scene.description }}</p>
    <PwApiBrief v-if="apiItems.length" :items="apiItems" />

    <div class="pw-scene__preview">
      <PwSceneBoundary :title="scene.title" :file="scene.rel">
        <component :is="component" v-if="component" />
        <div v-else class="pw-scene__skeleton" aria-hidden="true" />
      </PwSceneBoundary>
    </div>

    <div v-if="showArgsBlock || hasOutput" class="pw-scene__io" :class="{ 'is-single': singleColumn }">
      <PlaygroundSceneArgs v-if="showArgsBlock" :scene-name="scene.name" />
      <PlaygroundSceneOutput v-if="hasOutput" :scene-name="scene.name" />
    </div>

    <PlaygroundSceneSource :scene="scene" />
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

  &__actions {
    margin-left: auto;
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
    padding: 18px;
    border: 1px solid var(--rp-color-border);
    border-radius: var(--rp-radius);
    background: var(--rp-color-bg);
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

@keyframes pw-skeleton {
  to {
    background-position: -200% 0;
  }
}
</style>
