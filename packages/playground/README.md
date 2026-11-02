# @rinova/playground

Vue3 的「文件即场景」组件演示框架。往 `src/scenes/` 里放 `.vue` 文件，侧栏、预览、源码面板、入参/出参面板自己就长出来了 —— 没有注册 API，没有配置要改。

```bash
pnpm add @rinova/playground
pnpm add -D @rinova/playground-vite
```

需要 Vue `^3.5`（peer）。场景扫描由 `@rinova/playground-vite` 完成，Vite 项目请一起装。

## 30 秒接入

`index.html`

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

`src/main.ts`

```ts
import '@rinova/playground/style.css'
import { createPlayground } from '@rinova/playground'

createPlayground()
```

`vite.config.ts`

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { playground } from '@rinova/playground-vite'

export default defineConfig({
  plugins: [vue(), playground()],
})
```

`playground.config.ts`（可选，不写也能跑）

```ts
import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'My Lib',
  scenes: 'src/scenes',
  components: ['src/components/**/*.vue'], // 配了才产出契约清单
})
```

`src/scenes/button/size.vue` —— 存盘，侧栏立刻出现「Button / Size」：

```vue
<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: '尺寸', order: 1 })
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { MyButton } from '../../components'

const size = ref<'sm' | 'md' | 'lg'>('lg')
</script>

<template>
  <MyButton :size="size">Button</MyButton>
</template>
```

`sceneMeta` 必须写在**普通 `<script>`** 里并以 `export const sceneMeta` 导出（构建期由 Vite 插件执行，拿不到组件状态）。不写 meta 时标题由文件名推导：`size.vue` → `Size`。

## 配置项

| 字段 | 默认 | 说明 |
|---|---|---|
| `title` | `'Playground'` | 侧栏品牌标题，同时写进 `document.title` |
| `scenes` | `'src/scenes'` | 场景扫描根目录（相对项目根） |
| `sources` | `true` | 是否显示源码面板 |
| `codeViewer` | `'monaco'` | `'monaco'` 只读编辑器 / `'shiki'` 静态高亮块（更轻，不加载编辑器 worker） |
| `theme.ui` | `'auto'` | `'light' \| 'dark' \| 'auto'` |
| `theme.code` | 随明暗用 `vitesse-light` / `vitesse-dark` | **v0.1 尚未接线，改这个值暂时无效** |
| `exclude` | — | 排除的 glob（相对 `scenes` 根） |
| `base` | Vite 默认 | 部署子路径 |
| `port` | Vite 默认（5173） | dev server 端口 |
| `components` | — | 契约清单要扫的组件 glob；不配则不生成 `.playground/manifest.json` |
| `tsconfig` | 项目根 `tsconfig.json` | 组件契约提取用的 tsconfig |
| `groups` | — | 分组（`scenes` 下一级目录名）→ 侧栏显示名，**声明顺序即侧栏顺序**：`{ 'tao-common': 'Tao 通用组件' }` |
| `groupIndex` | `false` | 为每个分组自动合成一个「概览」落地页，点分组标题即可进入 |

## 场景内 API

### defineSceneMeta

| 字段 | 说明 |
|---|---|
| `title` | 覆盖由文件名推导的标题 |
| `order` | 同层排序，数值小的在前 |
| `tags` | 搜索/筛选标签 |
| `description` | 说明文字，显示在预览区上方 |
| `files` | 额外展示的源码文件（相对项目根） |
| `hideInNav` | 不在侧栏出现，但可通过链接直达 |

`SceneMeta` 类型里还有 `payload` 字段，但构建期拿不到组件状态，**请改用下面的 `useSceneArgs` / `useSceneOutput`**。

### useSceneArgs —— 入参面板

```ts
const args = useSceneArgs(
  { size: 'md' as 'sm' | 'md' | 'lg', disabled: false },
  {
    labels: { size: '尺寸', disabled: '禁用' },
    options: { size: ['sm', 'md', 'lg'] },
  }
)
```

返回响应式对象：面板改表单 → 这里同步变 → 组件重渲染。按值类型自动选控件（`boolean` → 开关，`number` → 数字框，`string` → 输入框，带 `options` → 下拉）。

纯前端响应式，**生产静态站同样可用**，不依赖 dev server。

> 字面量会被拓宽成 `string`，直接传给只接受联合类型的 prop 会报 TS2322，所以写 `'md' as 'sm' | 'md' | 'lg'`。

### useSceneOutput —— 出参快照

```ts
useSceneOutput(() => ({ size: args.size, clicked: count.value }))
```

面板以 400ms 轮询这个 getter，把返回值显示在出参区。

### 一个场景多个 demo —— 参数槽位

同一场景里放多个 demo 时，各自调用一次并在选项里写 `slot`，面板会按槽位名分块，
互不干扰（改一块的入参只影响那一个 demo）：

```ts
const primary = useSceneArgs({ label: '主按钮', size: 'md' }, { slot: '主按钮' })
const ghost = useSceneArgs({ label: '次按钮', size: 'sm' }, { slot: '次按钮' })

useSceneOutput(() => ({ clicked: primaryCount.value }), '主按钮')
useSceneOutput(() => ({ clicked: ghostCount.value }), '次按钮')
```

槽位按代码里声明的顺序排列；只有一块时不显示槽位标题。

### toast

```ts
import { toast } from '@rinova/playground'

toast('已复制')
toast('保存失败', 'error')     // 'info' | 'success' | 'warning' | 'error'
```

## 样式约定

- 只需引入一次 `@rinova/playground/style.css`（外壳样式）。**编辑器界面样式由包内按需加载**：打开代码面板时才会去拉 `@rinova/playground/editor.css`（≈125 KB gzip），不用手动引入；配 `codeViewer: 'shiki'` 的项目则永远不加载它。
- 场景写 `<style scoped lang="less">`（使用方需要装 `less`）。**v0.1 没有 DOM 隔离**，非 scoped 样式会污染外壳。
- 不要硬编码颜色，用外壳暴露的 12 个变量，明暗主题自动切换：

```
--rp-color-bg  --rp-color-surface  --rp-color-border  --rp-color-text
--rp-color-text-muted  --rp-color-primary  --rp-color-primary-contrast
--rp-color-success  --rp-color-warning  --rp-color-danger
--rp-radius  --rp-font-mono
```

## 已知限制（v0.1）

- 场景与外壳无 DOM 隔离，必须写 scoped
- 源码面板只读，不支持编辑（实时预览也已明确不做：只在 dev 可用，价值不足）
- `theme.code` 未接线
- 只支持 Vue3，不支持 React / Svelte

## 相关包

| 包 | 作用 |
|---|---|
| `@rinova/playground-vite` | 场景扫描 + 契约清单，Vite 项目必需 |
| `@rinova/playground-mcp` | 把契约清单挂给 Claude Code / Cursor 等 AI 工具（可选） |
| `create-rinova-playground` | `pnpm create rinova-playground my-lib` 开新项目 |

仓库与文档：<https://github.com/jove-rina/rinova-playground>

## License

MIT
