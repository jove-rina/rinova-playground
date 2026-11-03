<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: 'API 文档表', order: 3, tags: ['api', 'jsdoc'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="API 文档表" lead="Demo 之外还要能查契约：每个 prop 是什么、事件回调拿到什么、插槽传什么。">
    <h2>怎么打开</h2>
    <p>在该组件页的 <code>meta.ts</code> 里声明 <code>component</code>，页头就会出现「场景 / API」切换：</p>
    <pre><code>import { definePageMeta } from '@rinova/playground'

export const pageMeta = definePageMeta({
  title: 'Input',
  component: 'MyInput',   // 不写则按页目录名匹配同名组件
})</code></pre>

    <h2>表里有什么</h2>
    <table>
      <thead><tr><th>列</th><th>来源</th></tr></thead>
      <tbody>
        <tr><td>名称 / 类型 / 默认值</td><td>组件的 TypeScript 类型（<code>vue-component-meta</code>）</td></tr>
        <tr><td>说明</td><td>组件的 JSDoc</td></tr>
        <tr><td>演示</td><td><code>sceneMeta.api</code> 声明了哪些场景在演示它</td></tr>
      </tbody>
    </table>

    <h2>四张表</h2>
    <ul>
      <li><strong>Props</strong>：类型、默认值、是否必填、说明</li>
      <li><strong>Events</strong>：参数列表（如 <code>[event: FocusEvent]</code>）与完整签名</li>
      <li><strong>Slots</strong>：插槽名与作用域类型</li>
      <li><strong>Exposes</strong>：<code>defineExpose</code> 暴露的方法与类型</li>
    </ul>

    <h2>要写 JSDoc</h2>
    <pre><code>defineProps&lt;{
  /** 有值时显示清空按钮 */
  clearable?: boolean
}&gt;()

defineExpose&lt;{
  /** 让输入框获得焦点 */
  focus: () =&gt; void
}&gt;({ focus })</code></pre>
    <p>没写说明的行会标黄提示，<code>coverage.md</code> 里也会汇总「缺 JSDoc 的 API」清单。</p>

    <blockquote>
      已知限制：<code>defineEmits</code> 的 JSDoc 拿不到（vue-component-meta 的限制），
      事件说明用 <code>pageMeta.apiNotes: { 'events:press': '说明' }</code> 补。
    </blockquote>
  </Prose>
</template>
