<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '包裹层 wrap',
  order: 1,
  description: 'ctx.wrap() 包住的是演示画布里的场景，不包侧栏和页头 —— 第三方 provider 改不到框架外壳。',
})
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const root = ref<HTMLElement | null>(null)
const wrapped = ref<boolean | null>(null)
const theme = ref('')

onMounted(() => {
  const hit = root.value?.closest('[data-pw-plugin="locale"]')
  wrapped.value = Boolean(hit)
  theme.value = hit?.getAttribute('data-demo-theme') ?? ''
})
</script>

<template>
  <div ref="root" class="demo-wrap">
    <p class="demo-wrap__row">
      <span class="demo-wrap__key">被包裹层包住</span>
      <span :class="['demo-wrap__flag', wrapped ? 'is-ok' : 'is-no']">
        {{ wrapped === null ? '检测中…' : wrapped ? '是' : '否' }}
      </span>
    </p>
    <p class="demo-wrap__row">
      <span class="demo-wrap__key">包裹层主题</span>
      <code>{{ theme || '—' }}</code>
    </p>
    <p class="demo-wrap__hint">
      这段判断用的是 <code>closest('[data-pw-plugin="locale"]')</code>，没有调任何框架 API ——
      包裹层就是这么一条普通 DOM 祖先链。真实项目里换成 ElConfigProvider 或 router。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.demo-wrap__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;

  code {
    font-family: var(--rp-font-mono);
    font-size: 12.5px;
  }
}

.demo-wrap__key {
  width: 84px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

.demo-wrap__flag {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;

  &.is-ok {
    background: color-mix(in srgb, var(--rp-color-success) 14%, transparent);
    color: var(--rp-color-success);
  }

  &.is-no {
    background: color-mix(in srgb, var(--rp-color-danger) 14%, transparent);
    color: var(--rp-color-danger);
  }
}

.demo-wrap__hint {
  color: var(--rp-color-text-muted);
  font-size: 12px;
  line-height: 1.6;
}
</style>
