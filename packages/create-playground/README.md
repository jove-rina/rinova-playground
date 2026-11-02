# create-rinova-playground

用一条命令生成一个能跑的 `@rinova/playground` 项目，自带 2 个示例组件和 5 个场景。

```bash
pnpm create rinova-playground my-lib
# npm create rinova-playground@latest my-lib
# yarn create rinova-playground my-lib
```

需要 Node ≥ 22.12。

## 它会生成什么

```
my-lib/
├── index.html
├── package.json
├── playground.config.ts        # title / scenes / port
├── vite.config.ts              # vue() + playground()
├── tsconfig.json
├── .gitignore
├── README.md
└── src/
    ├── main.ts                 # createPlayground()
    ├── components/             # MyButton.vue、MyCard.vue（演示用，可删）
    └── scenes/
        ├── button/basic.vue    # 点击计数
        ├── button/disabled.vue
        ├── button/size.vue
        ├── card/basic.vue
        └── card/slots.vue
```

依赖写的是 `@rinova/playground` / `@rinova/playground-vite` 的 `^0.1.0`，从 npm 装。

## 选项

| 选项 | 说明 |
|---|---|
| `--no-install` | 只生成文件，不装依赖 |
| `--force` | 目标目录非空时仍然写入 |
| `--packages <dir>` | 把 `@rinova/*` 依赖指向本地 `packages` 目录（开发框架本身时用） |
| `-h` / `--help` | 显示帮助 |

## 生成之后

```bash
cd my-lib
pnpm install
pnpm dev        # → http://localhost:5273
pnpm build      # 纯静态产物，可直接托管
```

新增一个场景：在 `src/scenes/` 下放 `.vue` 文件即可，侧栏自动出现，不需要注册。

开启契约清单（给 AI 读组件 props）：在 `playground.config.ts` 里加一行

```ts
components: ['src/components/**/*.vue'],
```

再 `pnpm build`，`.playground/manifest.json`、`llms.txt`、`coverage.md` 会一起产出。

## 部署注意

路由用的是 History API（`/button/size`），静态托管需要把 404 回退到 `index.html`。部署到子路径时同时配 `playground.config.ts` 的 `base`。

## License

MIT
