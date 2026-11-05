---
title: useSceneOutput
order: 3
description: 把场景内部状态挂到输出面板，常显、只读、400ms 一次。
tags: [hooks, 输出]
---

```ts
import { useSceneOutput } from '@rinova/playground'

const count = ref(0)
useSceneOutput(() => ({ count: count.value, label: `已点 ${count.value} 次` }))
```

- 传的是 **getter**，不是对象——框架轮询时才会读，避免场景停下后还在算
- 输出面板与参数面板**左右并排**（`1.2fr / 1fr`），窄屏 760px 以下折成上下
- 多槽位：`useSceneOutput(getter, '左侧')` / `useSceneOutput(getter, '右侧')`，面板上出胶囊 Tab

::: danger 别在 getter 里改状态
每次轮询都会执行 getter，在里面写 `ref` 会造成「轮询 → 改状态 → 再轮询」的死循环。
:::

::: tip 输出是纯前端能力
没有后端请求、也不依赖 dev server，`pnpm build` 出来的静态站照样能看。
:::
