<script setup lang="ts">
import { usePlaygroundEnv, usePlaygroundTheme } from '@rinova/playground'

/** 侧栏底部缝位：只放一行环境标识，不超过 64px */
const env = usePlaygroundEnv<{ apiBase?: string; appName?: string }>()
const theme = usePlaygroundTheme()
</script>

<template>
  <div class="demo-env" :title="`apiBase: ${env.apiBase ?? '—'}`">
    <span class="demo-env__dot" />
    <span class="demo-env__text">{{ env.appName ?? 'demo' }} · {{ env.apiBase ?? '—' }}</span>
    <span class="demo-env__theme">{{ theme }}</span>
  </div>
</template>

<style scoped lang="less">
.demo-env {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 2px;
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
}

.demo-env__dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--rp-color-success);
}

.demo-env__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.demo-env__theme {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 0 5px;
  border: 1px solid var(--rp-color-border);
  border-radius: 4px;
  font-size: 10.5px;
}
</style>
