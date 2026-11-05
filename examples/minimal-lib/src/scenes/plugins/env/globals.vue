<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '全局变量 globals',
  order: 1,
  description: 'playground.config.ts 的 globals 会原样传给每个场景，不需要任何框架 API 之外的胶水。',
})
</script>

<script setup lang="ts">
import { usePlaygroundEnv } from '@rinova/playground'

const env = usePlaygroundEnv<{ apiBase?: string; appName?: string }>()
</script>

<template>
  <div class="demo-env-values">
    <p>
      <span class="demo-env-values__key">apiBase</span>
      <code class="demo-env-values__value">{{ env.apiBase ?? '未配置' }}</code>
    </p>
    <p>
      <span class="demo-env-values__key">appName</span>
      <code class="demo-env-values__value">{{ env.appName ?? '未配置' }}</code>
    </p>
    <p class="demo-env-values__hint">
      这两个值来自 <code>playground.config.ts</code> 的 <code>globals</code>；插件返回值会覆盖同名字段。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-env-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;

  p {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }
}

.demo-env-values__key {
  width: 64px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

.demo-env-values__value {
  font-family: var(--rp-font-mono);
  font-size: 12.5px;
}

.demo-env-values__hint {
  color: var(--rp-color-text-muted);
  font-size: 12px;
  line-height: 1.6;
}
</style>
