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

| 工具 | 入参 | 返回 |
|---|---|---|
| `capability_search` | `query`、`limit?` | 命中的组件 + prop 名 + 场景数 |
| `capability_get` | `component` | props/events/slots/exposed 全量契约，每个 prop 带 `文件:行号`，附相关场景与未覆盖 props |
| `scenario_list` | `component?` | 场景 id、标题、分组、文件路径 |
| `coverage_report` | — | 未覆盖 props 清单 + 覆盖率 |

只读：不改项目文件，也不启动浏览器。写场景仍由人或 AI 直接写 `.vue` 文件（「文件即场景」主线不变）。

## 验证

```bash
node --experimental-strip-types scripts/probe-mcp.ts   # 仓库根执行，7/7 通过
```
