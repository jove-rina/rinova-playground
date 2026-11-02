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

## 目录

```
src/
├── components/          你的组件
├── scenes/              每个 .vue 就是一个场景
│   ├── button/
│   └── card/
└── main.ts              入口，调用 createPlayground()
```
