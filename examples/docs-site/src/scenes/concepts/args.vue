<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '入参 / 出参',
  order: 13,
  tags: ['表单', '实时'],
  description: '右侧「参数」按钮打开表单，改动直接驱动这个标签。',
})
</script>

<script setup lang="ts">
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import DemoBadge from '../../components/DemoBadge.vue'
import Prose from '../../components/Prose.vue'

const args = useSceneArgs(
  {
    text: '入参实时生效',
    tone: 'success' as 'neutral' | 'success' | 'danger',
    size: 'md' as 'sm' | 'md',
    rounded: true,
  },
  {
    options: { tone: ['neutral', 'success', 'danger'], size: ['sm', 'md'] },
    labels: { text: '文案', tone: '色调', size: '尺寸', rounded: '圆角' },
  }
)

useSceneOutput(() => ({ text: args.text, tone: args.tone, size: args.size, rounded: args.rounded }))
</script>

<template>
  <Prose title="入参 / 出参" lead="点击右上角「参数」，右侧出现表单，改了立即生效（生产环境同样可用）。">
    <div class="demo">
      <DemoBadge :text="args.text" :tone="args.tone" :size="args.size" :rounded="args.rounded" />
    </div>

    <h2>场景侧写法</h2>
    <pre><code>const args = useSceneArgs(
  { text: '入参实时生效', tone: 'success' as 'neutral' | 'success' | 'danger' },
  { options: { tone: ['neutral', 'success', 'danger'] }, labels: { text: '文案' } }
)

useSceneOutput(() => ({ tone: args.tone }))</code></pre>

    <table>
      <thead><tr><th>值的类型</th><th>渲染成</th></tr></thead>
      <tbody>
        <tr><td>boolean</td><td>开关</td></tr>
        <tr><td>number</td><td>数字输入框</td></tr>
        <tr><td>string</td><td>文本输入框</td></tr>
        <tr><td>string + options</td><td>下拉框</td></tr>
      </tbody>
    </table>

    <blockquote>入参驱动组件是纯前端响应式，静态站也能用；出参每 400ms 取一次快照。</blockquote>
  </Prose>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 20px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}
</style>
