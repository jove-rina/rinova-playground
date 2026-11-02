# real-lib · 真实组件库接入

用真实组件库（[shadcn-vue](https://www.shadcn-vue.com/) + reka-ui + Tailwind 4）验证 rinova-playground 在「别人家的组件」上能不能用，而不是只在自己写的 demo 组件上好看。

```bash
pnpm --filter @rinova/example-real-lib dev     # → http://localhost:5281
pnpm --filter @rinova/example-real-lib build   # 产物 dist/ + 契约清单
```

## 里面是什么

组件不是手写的，是 shadcn-vue CLI 生成的源码（`src/components/ui/`，共 11 个 `.vue`）：

| 组件 | 来源 | 拿得出的 props |
|---|---|---|
| Button | cva 变体 + reka-ui Primitive | `variant` `size` `as` `asChild` |
| Badge | cva 变体 | `variant` `asChild` |
| Input | `useVModel` 被动绑定 | `modelValue` `defaultValue` |
| Switch | 直接转发 `SwitchRootProps` | 11 个（`modelValue` `disabled` `trueValue` …） |
| Card 系列 | slot 组合（Header/Title/Content/Footer…） | `size` |

场景 7 个，覆盖入参下拉切换（variant/size）、双向绑定（Input/Switch）、出参快照（点击次数、输入长度）、slot 组合（Card）。

## 它证明了什么

1. **契约清单在真实库上能提取**：`pnpm build` 输出 `契约清单：11 个组件 / 19 props`，`Switch` 的 11 个 reka-ui 透传 props 也抓到了，未覆盖项对补场景有实际指导意义。
2. **和 Tailwind 4 共存**：外壳用 Less + `--rp-*` 变量，场景用 Tailwind 原子类，互不干扰。
3. **入参面板能驱动第三方受控组件**：Switch 直接 `v-model="args.on"`，面板一改，真实组件立刻响应。

## 两个接入要点（踩过的）

- **场景根元素要自己撑满宽度**：预览区把场景内容按「内容宽度」排版并居中（`flex: 0 0 auto`），所以根元素不加 `w-full` 时，内部 `flex-wrap` 不会换行，只会横向滚动。每个场景根都写了 `w-full`。
- **`cn` 工具函数别用 npm 上的 `cn` 包**：shadcn-vue CLI 会把 `@/lib/utils` 解析成依赖 `cn`，需要改回项目内的 `src/lib/utils.ts`（clsx + tailwind-merge），并删掉那个依赖。
