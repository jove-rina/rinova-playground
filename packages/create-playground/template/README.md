# {{projectName}}

用 [rinova-playground](https://github.com/jove-rina/rinova-playground) 搭的组件演示项目。

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:5273
pnpm build    # 产物在 dist/，纯静态
```

## 加一个场景

在 `src/scenes/` 下新建一个 `.vue` 文件即可，侧栏自动出现：

```vue
<!-- src/scenes/button/loading.vue → 侧栏出现 Button / Loading -->
<script setup lang="ts">
import { MyButton } from '../../components'
</script>

<template>
  <MyButton loading>加载中</MyButton>
</template>
```

需要自定义标题、排序、说明或隐藏时，加一个 `<script>` 块：

```vue
<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 加载中',
  order: 4,
  description: '显示 loading 状态时的按钮。',
})
</script>
```

## 输入 / 输出面板

在场景的 `<script setup>` 里声明，工具栏「参数」按钮就会启用：

```ts
import { useSceneArgs, useSceneOutput } from '@rinova/playground'

// 输入：面板渲染成表单，改了组件立刻变（生产环境同样可用）
const args = useSceneArgs(
  { label: '点我', size: 'md' as 'sm' | 'md' | 'lg', disabled: false },
  { options: { size: ['sm', 'md', 'lg'] }, labels: { label: '文案', size: '尺寸', disabled: '禁用' } }
)

// 输出：面板每 400ms 取一次快照
useSceneOutput(() => ({ clicked: count.value }))
```

表单控件按值的类型自动选择：布尔 → 开关、数字 → 数字框、字符串 → 文本框、带 `options` → 下拉框。

## 目录

```
src/
├── components/          你的组件
├── scenes/              每个 .vue 就是一个场景
│   ├── button/
│   └── card/
└── main.ts              入口，调用 createPlayground()
```
