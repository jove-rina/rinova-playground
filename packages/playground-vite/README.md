# @rinova/playground-vite

`@rinova/playground` 的 Vite 插件。三件事：读 `playground.config.ts`、把 `scenes/**/*.vue` 扫成虚拟模块、按需生成契约清单。

```bash
pnpm add -D @rinova/playground-vite
```

需要 Vite `^8`（peer），并配合 `@rinova/playground` 使用；两者版本请保持一致（同一个 minor）。

## 用法

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { playground } from '@rinova/playground-vite'

export default defineConfig({
  plugins: [vue(), playground()],
})
```

插件会自己在项目根查找 `playground.config.{ts,mts,js,mjs}`，用 `jiti` 载入（所以配置里可以写 TypeScript）。

## 选项

| 选项 | 默认 | 说明 |
|---|---|---|
| `configFile` | 自动查找 | 指定配置文件路径（相对项目根） |
| `scenes` | 配置里的 `scenes` | 覆盖场景目录（相对项目根） |

`title` / `codeViewer` / `base` / `port` / `components` 等行为都在 `playground.config.ts` 里配，见 `@rinova/playground` 的配置表。

## 生成的虚拟模块

### `virtual:playground/scenes`

```ts
import { scenes } from 'virtual:playground/scenes'
```

```ts
interface SceneDescriptor {
  id: string          // 'button/size'
  title: string       // sceneMeta.title ?? 文件名推导
  group: string       // 第一级目录，如 'Button'
  path: string        // '/src/scenes/button/size.vue'
  file: string        // 绝对路径
  rel: string         // 'src/scenes/button/size.vue'
  lang: 'vue'
  order: number
  tags: string[] | null
  description: string | null
  hidden: boolean
  sources: { rel: string; raw: () => Promise<string> }[]
  load: () => Promise<{ default: Component }>
  raw: () => Promise<string>
}
```

`load()` / `raw()` 是动态 import，未进入侧栏的场景不会被打进首屏。

### `virtual:playground/config`

```ts
import config from 'virtual:playground/config'
// => playground.config.ts 的内容 + sceneCount
```

## 契约清单

配置了 `components` 时（例如 `components: ['src/components/**/*.vue']`），插件用 `vue-component-meta` 提取组件 props，产出三个文件：

```
.playground/manifest.json   # 组件、props、类型、默认值、行号锚点
.playground/llms.txt        # 给大模型读的能力摘要
.playground/coverage.md     # 哪些 prop 在场景里还没被用到
```

`pnpm build` 时这三个文件会一起拷进 `build.outDir`；`@rinova/playground-mcp` 读的就是它们。

未配 `components` 时不会生成任何清单文件（不是报错）。

## dev 行为

| 变化 | 反应 |
|---|---|
| `scenes/` 下新增或删除 `.vue` | 失效虚拟模块 + full-reload，侧栏立刻更新 |
| 改 `playground.config.*` | 同上，重新扫描 |
| `components/` 下 `.vue` 的增删改 | 800ms 防抖后重算契约清单（不刷新页面） |

场景文件内容改动走 Vite 正常 HMR，不触发整页刷新。

## License

MIT
