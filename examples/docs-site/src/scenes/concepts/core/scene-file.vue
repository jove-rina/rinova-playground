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
    <h2>目录 → 侧栏 → 页内索引</h2>
    <pre data-lang="text"><code>src/scenes/
├── button/                 # 分组
│   └── button/             # 组件页（侧栏第二级）
│       ├── basic.vue       # 场景：页内一节
│       └── size.vue
└── card/
    └── card/
        └── basic.vue</code></pre>

    <h2>规则</h2>
    <ul>
      <li><strong>必须三层</strong>：分组 / 组件页 / 场景；分组目录下不能直接放 <code>.vue</code></li>
      <li>一个组件页 = 一个页面，页内纵向排所有场景，右侧是「概要 / Props / Events / Exposes / Slots」索引</li>
      <li>文件名自动转标题（<code>size-large.vue</code> → Size Large），中文文件名原样保留</li>
      <li>页内按 <code>sceneMeta.order</code> 升序；页与页之间用 <code>&lt;页&gt;/meta.ts</code> 的 <code>order</code></li>
      <li>场景就是普通 SFC，可以用 <code>script setup</code>、可以 import 任何东西</li>
    </ul>

    <blockquote>新增、删除、重命名场景文件都不需要重启 dev server；改已有的 <code>sceneMeta</code> 也会即时重扫。</blockquote>
  </Prose>
</template>
