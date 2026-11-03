<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '文件即场景',
  order: 1,
  tags: ['核心'],
  description: '目录结构与侧栏一一对应。',
})
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="文件即场景" lead="侧栏不是配置出来的，是磁盘长出来的。">
    <h2>目录 → 侧栏</h2>
    <pre><code>src/scenes/
├── button/
│   ├── basic.vue      → Button / Basic
│   └── size.vue       → Button / Size
└── card/
    └── basic.vue      → Card / Basic</code></pre>

    <h2>规则</h2>
    <ul>
      <li>文件名自动转标题（<code>size-large.vue</code> → Size Large），中文文件名原样保留</li>
      <li>同层按 <code>sceneMeta.order</code> 升序，未写的排最后</li>
      <li>场景就是普通 SFC，可以用 <code>script setup</code>、可以 import 任何东西</li>
      <li>源码面板读取的是文件原文（构建期 <code>?raw</code>），代码改了文档自动跟着改</li>
    </ul>

    <blockquote>新增、删除、重命名场景文件都不需要重启 dev server，侧栏会热更新。</blockquote>
  </Prose>
</template>
