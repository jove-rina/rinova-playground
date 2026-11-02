# rinova-playground

面向 Vue3 的「文件即场景」组件演示框架。你只放 `.vue` 文件，它负责侧栏、源码面板、入参/出参面板、契约清单和 AI 可读的能力描述。

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

v0.1.0 已发布到 npm：`@rinova/playground`、`@rinova/playground-vite`、`@rinova/playground-mcp`、`create-rinova-playground`。M0–M5 验收全绿。

```bash
pnpm install
pnpm dev        # 示例项目  → http://localhost:5273
pnpm dev:docs   # 文档站     → http://localhost:5280
pnpm build      # 构建示例（产物含 manifest.json / llms.txt / coverage.md）
pnpm verify     # 11 项验收
pnpm verify:mcp # MCP server 冒烟（7 项）
```

## MCP

`@rinova/playground-mcp` 把契约清单挂给 Claude Code / Cursor，提供 `capability_search`、`capability_get`、`scenario_list`、`coverage_report` 四个只读工具。仓库根的 `.mcp.json` 已配好，客户端打开本仓库即可直接用。

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
