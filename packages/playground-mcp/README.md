# @rinova/playground-mcp

把 rinova-playground 生成的契约清单（`.playground/manifest.json`）暴露成 MCP 工具，让 Claude Code / Cursor 这类客户端能「读组件能力、看场景、查覆盖」。

## 前置

项目里要先生成清单，也就是 `playground.config.ts` 配了 `components`，然后跑过 `pnpm dev` 或 `pnpm build`。

```ts
export default defineConfig({
  components: ['src/components/**/*.vue'],
})
```

## 接入

**Claude Code** —— 项目根的 `.mcp.json`：

```json
{
  "mcpServers": {
    "rinova-playground": {
      "command": "npx",
      "args": ["-y", "@rinova/playground-mcp", "--project", "."]
    }
  }
}
```

**Cursor** —— `~/.cursor/mcp.json` 同结构。

**本地仓库调试**：

```json
{
  "mcpServers": {
    "rinova-playground": {
      "command": "node",
      "args": ["packages/playground-mcp/dist/index.js", "--project", "examples/minimal-lib"]
    }
  }
}
```

参数：`--project <dir>`（默认当前目录）、`--manifest <file>`（默认 `<project>/.playground/manifest.json`）。

## 工具

| 工具 | 输入 | 返回 |
|---|---|---|
| `capability_search` | `query`、`limit?` | 命中的组件 + prop 名 + 场景数 |
| `capability_get` | `component` | props/events/slots/exposed 全量契约，组件路径带行号、成员带 `← L<n>`；单 prop 字段超过 8 个时只给总数 |
| `fields_of` | `component`、`prop`、`limit?` | 某个 prop / 事件参数展开后的字段（默认前 20 个） |
| `scenario_list` | `component?` | 场景 id、标题、分组、文件路径 |
| `coverage_report` | `detail` / `limit` | 默认按组件汇总覆盖率；`detail=true` 才逐条列出未覆盖 props |
| `env_get` | — | 环境段的人读版：globals / 插件 / 分组 / 页面表 |
| `scene_scaffold` | `page`、`slug`、`api?` | 该建的文件路径与内容（返回文本，不写盘） |
| `scene_validate` | `path?` | 场景校验：目录层级、scoped、全局选择器、废弃 API、sceneMeta、页绑定 |

只读：不改项目文件，也不启动浏览器。写场景仍由人或 AI 直接写 `.vue` 文件（「文件即场景」主线不变）。

## 验证

```bash
pnpm verify:mcp   # 仓库根执行，17/17 通过
```
