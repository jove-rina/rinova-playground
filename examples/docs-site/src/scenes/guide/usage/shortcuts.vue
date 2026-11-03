<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  order: 4,
  title: '快捷键',
})
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="快捷键" lead="四个键就够用。">
    <table>
      <thead><tr><th>快捷键</th><th>作用</th></tr></thead>
      <tbody>
        <tr><td><code>⌘K</code> / <code>Ctrl+K</code></td><td>聚焦场景搜索</td></tr>
        <tr><td><code>⌘F</code> / <code>Ctrl+F</code></td><td>代码面板内查找</td></tr>
        <tr><td><code>Esc</code></td><td>关闭代码面板</td></tr>
      </tbody>
    </table>

    <h2>预览宽度</h2>
    <p>工具栏中间三个图标分别对应自适应 / 平板 820px / 手机 420px，用来快速看响应式表现。</p>
  </Prose>
</template>
