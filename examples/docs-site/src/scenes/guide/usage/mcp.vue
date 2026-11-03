<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: 'MCP 接入', order: 4, tags: ['AI', 'mcp'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="MCP 接入" lead="把契约清单挂到 Cursor / Claude Code，让 AI 知道你有哪些组件、每个 prop 怎么用。">
    <h2>两步</h2>
    <ol>
      <li>项目里配 <code>components</code>，跑一次 <code>pnpm dev</code> 生成 <code>.playground/manifest.json</code></li>
      <li>在客户端配置里加一个 stdio server</li>
    </ol>

    <pre><code>{
  "mcpServers": {
    "rinova-playground": {
      "command": "npx",
      "args": ["-y", "@rinova/playground-mcp", "--project", "."]
    }
  }
}</code></pre>

    <h2>四个工具</h2>
    <table>
      <thead><tr><th>工具</th><th>用途</th></tr></thead>
      <tbody>
        <tr><td><code>capability_search</code></td><td>按关键词找组件</td></tr>
        <tr><td><code>capability_get</code></td><td>取完整契约，每个 prop 带文件行号</td></tr>
        <tr><td><code>scenario_list</code></td><td>列场景，可按组件过滤</td></tr>
        <tr><td><code>coverage_report</code></td><td>哪些 props 还没有场景</td></tr>
      </tbody>
    </table>

    <blockquote>MCP 只读。写场景仍然是「在 src/scenes 下放一个 .vue 文件」，AI 只是替你写这个文件，不会引入注册 API。</blockquote>
  </Prose>
</template>
