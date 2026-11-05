# rinova-playground

面向 Vue3 的「文件即场景」组件演示框架。你只放 `.vue` 文件，它负责侧栏、源码面板、输入/输出面板、契约清单和 AI 可读的能力描述。

```bash
pnpm create rinova-playground my-lib
cd my-lib && pnpm i && pnpm dev
```

```vue
<!-- src/scenes/button/size.vue —— 就这一个文件，侧栏立刻出现「Button / Size」 -->
<script setup lang="ts">
import { ref } from 'vue'
import { MyButton } from '@my/lib'
const size = ref('large')
</script>

<template>
  <MyButton :size="size">Button</MyButton>
</template>
```

## 状态

v0.7.1 已发布到 npm：`@rinova/playground`、`@rinova/playground-vite`、`@rinova/playground-mcp`、`create-rinova-playground`。M0–M5、M6、M8、v0.7 AI 能力面验收全绿（v0.6 编辑能力暂缓）。

```bash
pnpm install
pnpm dev        # 示例项目  → http://localhost:5273
pnpm dev:docs   # 文档站     → http://localhost:5280
pnpm build      # 构建示例（产物含 manifest.json / llms.txt / coverage.md）
pnpm verify     # 65 项验收（三个示例全查：目录三层、页/场景一致、API 绑定、契约结构、env 段、llms 手册、场景校验规则）
pnpm verify:mcp        # MCP 冒烟（15 项：七个工具 + 默认当前目录）
pnpm verify:mcp:reload # 清单重写后自动重读（4 项）
pnpm verify:mcp:edge   # 找不到清单 / --project / --manifest / 坏 JSON（5 项）
pnpm verify:loop       # AI 写作闭环（写场景 → 清单热更新 → 校验；会临时写测试床文件）
```

## 示例

| 目录 | 作用 | 跑起来 |
|---|---|---|
| `examples/minimal-lib` | 测试床：4 个组件页 / 22 个场景，覆盖 props / events / exposes / slots 与一个组合表单 | `pnpm dev` → :5273 |
| `examples/docs-site` | 文档站，用框架自己搭自己 | `pnpm dev:docs` → :5280 |
| `examples/real-lib` | 真实组件库接入（shadcn-vue + Tailwind 4，11 个组件 / 19 props） | `pnpm --filter @rinova/example-real-lib dev` → :5281 |

## 目录约定

```text
src/scenes/<分组>/<组件页>/<场景>.vue
src/scenes/<分组>/<组件页>/meta.ts   # 可选：页标题 / 说明 / 排序
```

一个组件页 = 一个页面，页内纵向排该组件的所有场景，右侧是 `概要 / Props / Events / Exposes / Slots` 索引。

## MCP

`@rinova/playground-mcp` 把契约清单挂给 Cursor / Claude Code，提供 7 个**只读**工具：`capability_search`、`capability_get`、`scenario_list`、`coverage_report`、`env_get`、`scene_scaffold`、`scene_validate`。

前提：项目里配了 `components`（可选 `modules`），并且跑过一次 `pnpm dev` 或 `pnpm build`，项目根下要有 `.playground/manifest.json`。

```json
{
  "mcpServers": {
    "rinova-playground": {
      "command": "npx",
      "args": ["-y", "@rinova/playground-mcp"]
    }
  }
}
```

- **不锁版本、不传 `--project`**：默认按客户端进程的当前目录找 `.playground/manifest.json`，找不到就向上找 6 层（客户端常常从包子目录启动）
- 项目不在当前目录（monorepo 多包、服务从别处启动）时再加 `--project <项目根>`，或用 `--manifest <.playground/manifest.json 的绝对路径>` 直接指定
- Cursor：项目级 `.cursor/mcp.json`，或全局 `~/.cursor/mcp.json`
- Claude Code：项目根 `.mcp.json`，或 `claude mcp add rinova-playground -- npx -y @rinova/playground-mcp`
- 清单是构建产物：dev server 重算后，正在跑的 MCP 会话会在**下一次工具调用**时自动重读（比对 mtime + size），不用重启客户端
- 开发框架本身时用本地 dist，避免 npx 拉到线上旧包：本仓库根的 `.mcp.json` 就是这么配的

## 文档

- [产品文档索引](docs/README.md)
- [产品定义](docs/01-产品定义.md)
- [核心概念](docs/02-核心概念.md)
- [功能规格与验收](docs/03-功能规格与验收.md)
- [依赖与组件基线](docs/04-依赖与组件基线.md)
- [路线图](docs/05-路线图.md)
- [风险与开放问题](docs/06-风险与开放问题.md)

## License

MIT
