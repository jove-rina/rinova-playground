<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '布局原语',
  order: 3,
  tags: ['布局'],
  description: 'PwDemoGrid / PwDemo / PwSceneNote：几行 flex 封装，纯便利品。',
})
</script>

<script setup lang="ts">
import { PwDemo, PwDemoGrid, PwSceneNote } from '@rinova/playground'
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="布局原语" lead="一个场景要并排展示多种形态时用；不满意就自己写 div，没有校验拦你。">
    <PwDemoGrid :min="200">
      <PwDemo title="默认（row）">
        <span class="demo-chip">A</span>
        <span class="demo-chip">B</span>
      </PwDemo>
      <PwDemo title="surface = card">
        <span class="demo-chip">A</span>
        <span class="demo-chip">B</span>
      </PwDemo>
      <PwDemo title="direction = column" direction="column">
        <span class="demo-chip">A</span>
        <span class="demo-chip">B</span>
      </PwDemo>
      <PwDemo title="带注释" surface="card">
        <span class="demo-chip">A</span>
        <template #note>注释走 #note 插槽</template>
      </PwDemo>
    </PwDemoGrid>

    <PwSceneNote text="PwSceneNote 就是一块带左边框的说明，适合在场景里解释「为什么会这样」。" />

    <pre data-lang="vue"><code>&lt;PwDemoGrid :min="200"&gt;
  &lt;PwDemo title="默认（row）"&gt;…&lt;/PwDemo&gt;
  &lt;PwDemo title="带注释" surface="card"&gt;
    …
    &lt;template #note&gt;注释走 #note 插槽&lt;/template&gt;
  &lt;/PwDemo&gt;
&lt;/PwDemoGrid&gt;</code></pre>

    <p>
      <code>min</code> 是「每列最小宽度」，不是列数：容器放得下几列就排几列，放不下自动折行。
      要固定列数用 <code>:columns="2"</code>。
    </p>
  </Prose>
</template>

<style scoped lang="less">
.demo-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--rp-color-border);
  border-radius: var(--rp-radius);
  background: var(--rp-color-surface);
  font-family: var(--rp-font-mono);
  font-size: 12px;
}
</style>
