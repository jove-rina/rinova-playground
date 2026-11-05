<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'usePlaygroundTheme',
  order: 5,
  tags: ['hooks', '主题'],
  description: '插件 UI 或自定义展示要跟随外壳明暗时用它，不要去猜 DOM 上的 data 属性。',
})
</script>

<script setup lang="ts">
import { usePlaygroundTheme } from '@rinova/playground'
import Prose from '../../../components/Prose.vue'

const theme = usePlaygroundTheme()
</script>

<template>
  <Prose
    title="usePlaygroundTheme"
    lead="返回 ComputedRef，外壳切明暗时组件自己重渲染。下面两颗胶囊会跟着高亮。"
  >
    <div class="demo-theme">
      <span class="demo-theme__chip" :class="{ 'is-active': theme === 'light' }">light</span>
      <span class="demo-theme__chip" :class="{ 'is-active': theme === 'dark' }">dark</span>
      <span class="demo-theme__hint">点页头右上角的月亮/太阳切换</span>
    </div>

    <pre data-lang="ts"><code>const theme = usePlaygroundTheme()   // ComputedRef&lt;'light' | 'dark'&gt;</code></pre>

    <p>
      框架不替第三方组件库切 <code>dark</code> class：Element Plus、naive 各有各的开关。
      它只告诉你「现在是哪个主题」，怎么用由你决定。
    </p>
  </Prose>
</template>

<style scoped lang="less">
.demo-theme {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 18px;
  padding: 16px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}

.demo-theme__chip {
  padding: 3px 10px;
  border: 1px solid var(--rp-color-border);
  border-radius: 999px;
  color: var(--rp-color-text-muted);
  font-family: var(--rp-font-mono);
  font-size: 12px;

  &.is-active {
    border-color: var(--rp-color-primary);
    background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
    color: var(--rp-color-primary);
  }
}

.demo-theme__hint {
  color: var(--rp-color-text-muted);
  font-size: 12px;
}
</style>
