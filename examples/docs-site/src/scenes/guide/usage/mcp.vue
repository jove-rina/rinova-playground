<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: 'MCP 与 AI 闭环', order: 4, tags: ['AI', 'mcp'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose
    title="MCP 与 AI 闭环"
    lead="把环境清单挂到 Cursor / Claude Code：AI 先知道你有什么组件、怎么写场景，写完还能自己校验。"
  >
    <h2>AI 能读到的三份东西</h2>
    <table>
      <thead><tr><th>产物</th><th>给谁</th><th>内容</th></tr></thead>
      <tbody>
        <tr><td><code>.playground/manifest.json</code></td><td>机器</td><td>组件 / 模块契约 + <code>env</code> 段（globals、插件、分组、页面清单）</td></tr>
        <tr><td><code>.playground/llms.txt</code></td><td>模型</td><td>七节手册：环境 → 写作规则 → 最小骨架 → 页面清单 → 组件契约 → 模块契约 → 待办</td></tr>
        <tr><td><code>.playground/coverage.md</code></td><td>人</td><td>props 覆盖情况与缺 JSDoc 的 API</td></tr>
      </tbody>
    </table>
    <p>三份都是生成物，跟着 <code>pnpm dev</code> / <code>pnpm build</code> 一起更新；场景增删改后清单 400ms 内重算，正在跑的 MCP 会话会在下一次工具调用时自动读到新内容（不用重启客户端）。</p>
    <p>不传参数时按当前目录找清单，找不到就向上找 6 层；monorepo 多包才需要 <code>--project</code>。</p>

    <h2>接入</h2>
    <ol>
      <li>项目里配 <code>components</code>，跑一次 <code>pnpm dev</code> 生成 <code>.playground/manifest.json</code></li>
      <li>在客户端配置里加一个 stdio server</li>
    </ol>

    <pre data-lang="json"><code>{
  "mcpServers": {
    "rinova-playground": {
      "command": "npx",
      "args": ["-y", "@rinova/playground-mcp"]
    }
  }
}</code></pre>

    <h2>七个工具</h2>
    <table>
      <thead><tr><th>工具</th><th>用途</th></tr></thead>
      <tbody>
        <tr><td><code>capability_search</code></td><td>按关键词找组件</td></tr>
        <tr><td><code>capability_get</code></td><td>取完整契约，每个 prop 带文件行号</td></tr>
        <tr><td><code>env_get</code></td><td>globals / 插件 / 分组 / 页面表</td></tr>
        <tr><td><code>scene_scaffold</code></td><td>算出该建的文件路径与场景骨架（返回文本，不落盘）</td></tr>
        <tr><td><code>scene_validate</code></td><td>校验目录层级 / 样式 scoped / 全局选择器 / 废弃 API / meta 字段 / 页绑定</td></tr>
        <tr><td><code>scenario_list</code></td><td>列场景，可按组件过滤</td></tr>
        <tr><td><code>coverage_report</code></td><td>哪些 props 还没有场景</td></tr>
      </tbody>
    </table>

    <h2>闭环怎么走</h2>
    <ol>
      <li><code>env_get</code> 看环境，<code>capability_get</code> 取要演示的组件契约</li>
      <li><code>scene_scaffold</code> 拿到文件路径与骨架，用客户端自己的文件工具写入</li>
      <li>dev server 热更新，清单自动重算</li>
      <li><code>scene_validate(path=新文件)</code> 校验，<code>coverage_report</code> 看缺口有没有补上</li>
    </ol>

    <blockquote>MCP 只读，不写你的源码、不引入注册 API。写文件永远是客户端的一次显式操作。</blockquote>
  </Prose>
</template>
