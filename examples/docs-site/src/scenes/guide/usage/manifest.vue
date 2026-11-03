<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: '契约清单', order: 2, tags: ['manifest', 'AI'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="契约清单" lead="配了 components 之后，插件会用 vue-component-meta 把组件的 props / emits / slots 提取出来。">
    <h2>产物</h2>
    <p>写在项目根的 <code>.playground/</code>，构建时再复制进 <code>dist/</code>：</p>
    <table>
      <thead><tr><th>文件</th><th>用途</th></tr></thead>
      <tbody>
        <tr><td><code>manifest.json</code></td><td>结构化契约 + 关联场景 + 未覆盖 props</td></tr>
        <tr><td><code>llms.txt</code></td><td>同一份内容的纯文本视图，直接喂给模型</td></tr>
        <tr><td><code>coverage.md</code></td><td>props 覆盖报告（哪些 prop 没有场景）</td></tr>
      </tbody>
    </table>

    <h2>触发时机</h2>
    <ul>
      <li>dev server 启动</li>
      <li><code>pnpm build</code></li>
      <li>组件文件保存后 800ms（防抖）</li>
    </ul>

    <blockquote>覆盖判定是启发式：某个 prop 名出现在场景源码里就算「有覆盖」。它的用途是告诉你先去补哪些场景，而不是做严格的绑定分析。</blockquote>
  </Prose>
</template>
