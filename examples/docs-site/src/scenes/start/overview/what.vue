<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '这是什么',
  order: 1,
  description: '一句话说明这个框架解决什么问题。',
})
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose
    title="rinova-playground"
    lead="面向 Vue3 的「文件即场景」组件演示框架。你只放 .vue 文件，它负责侧栏、源码面板、入参出参面板和契约清单。"
  >
    <h2>对外只有三个概念</h2>
    <table>
      <thead>
        <tr><th>概念</th><th>作用</th></tr>
      </thead>
      <tbody>
        <tr><td><code>playground.config.ts</code></td><td>唯一配置文件</td></tr>
        <tr><td><code>scenes/**/*.vue</code></td><td>一个文件 = 一个场景，目录即侧栏层级</td></tr>
        <tr><td><code>sceneMeta</code> / <code>useSceneArgs</code></td><td>可选：标题排序、入参出参</td></tr>
      </tbody>
    </table>

    <h2>加一个场景要做的事</h2>
    <p>在 <code>src/scenes/</code> 下新建一个 <code>.vue</code> 文件，保存，侧栏出现。没有注册表，没有路由表，没有 argTypes。</p>
    <pre><code>&lt;script setup lang="ts"&gt;
import { MyButton } from '../../../components'
&lt;/script&gt;

&lt;template&gt;
  &lt;MyButton&gt;点我&lt;/MyButton&gt;
&lt;/template&gt;</code></pre>

    <blockquote>这个文档站本身就是用 rinova-playground 搭的——左栏每个条目，就是 src/scenes 下的一个文件。</blockquote>
  </Prose>
</template>
