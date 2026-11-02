<script setup lang="ts">
import { computed, ref, shallowRef, watch, type Component } from 'vue'
import { getPreviewOverride } from '../preview/override'
import type { SceneDescriptor } from '../types'

const props = defineProps<{
  scene: SceneDescriptor
  width: 'auto' | 'tablet' | 'mobile'
}>()

const comp = shallowRef<Component | null>(null)
const error = ref('')
let token = 0

const override = computed(() => getPreviewOverride(props.scene.id))
/** 组件 key 带上 override 版本，源码改动后强制重挂载 */
const mountKey = computed(() => `${props.scene.id}:${override.value?.rev ?? 0}`)

watch(
  () => [props.scene, override.value?.rev, override.value?.src] as const,
  async ([scene, , src]) => {
    const current = ++token
    comp.value = null
    error.value = ''
    try {
      const mod = src ? await import(/* @vite-ignore */ `${src}?rev=${current}`) : await scene.load()
      if (current === token) comp.value = (mod as { default: Component }).default
    } catch (err) {
      if (current === token) error.value = err instanceof Error ? err.message : String(err)
    }
  },
  { immediate: true }
)
</script>

<template>
  <section class="pw-stage" :class="`pw-stage--${width}`">
    <div class="pw-stage__frame">
      <p v-if="scene.description" class="pw-stage__desc">{{ scene.description }}</p>
      <div class="pw-stage__inner">
        <p v-if="error" class="pw-stage__error">
          <strong>场景加载失败</strong>
          <code>{{ scene.rel }}</code>
          <span>{{ error }}</span>
        </p>
        <component :is="comp" v-else-if="comp" :key="mountKey" />
        <span v-else class="pw-stage__loading">加载中…</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--rp-color-surface);
  padding: 24px;
}

.pw-stage__frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.pw-stage__inner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;

  /* 场景内容不要被压缩：窄容器时横向滚动，而不是把按钮挤成几行 */
  & > :deep(*) {
    flex: 0 0 auto;
  }
}

.pw-stage__desc {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 12.5px;
  line-height: 1.6;
}

.pw-stage--tablet .pw-stage__frame {
  max-width: 820px;
  margin: 0 auto;
}

.pw-stage--mobile .pw-stage__frame {
  max-width: 420px;
  margin: 0 auto;
}

.pw-stage__loading {
  color: var(--rp-color-text-muted);
  font-size: 13px;
}

.pw-stage__error {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--rp-color-danger) 40%, var(--rp-color-border));
  border-radius: var(--rp-radius);
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  font-size: 13px;
}

.pw-stage__error strong {
  color: var(--rp-color-danger);
}

.pw-stage__error code {
  font-family: var(--rp-font-mono);
  font-size: 12px;
  color: var(--rp-color-text-muted);
}

.pw-stage__error span {
  white-space: pre-wrap;
  color: var(--rp-color-text-muted);
}
</style>
