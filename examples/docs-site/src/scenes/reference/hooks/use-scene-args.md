---
title: useSceneArgs
order: 2
description: 声明可变输入，面板按值类型自动选控件。
tags: [hooks, 输入]
---

```ts
import { useSceneArgs } from '@rinova/playground'

const args = useSceneArgs(
  { text: '你好', size: 'md' as 'sm' | 'md', rounded: true },
  {
    options: { size: ['sm', 'md'] },      // 有 options → 渲染成下拉框
    labels: { text: '文案', size: '尺寸' },
    slot: '主按钮',                        // 一个场景里多个 demo 时用来分块
  }
)
```

返回的是 `reactive` 对象，直接绑到组件上即可。**控件按值类型选**：

| 值的类型 | 渲染成 |
|---|---|
| `boolean` | 开关 |
| `number` | 数字输入框 |
| `string` | 文本输入框 |
| `string` + `options` | 下拉框 |

::: warn 字面量会被推断成 string
`useSceneArgs({ size: 'md' })` 得到的 `args.size` 是 `string`，传给只收 `'sm' | 'md' | 'lg'` 的组件会报 TS2322。写法是 `'md' as 'sm' | 'md'`。
:::

::: info 一个场景多个 demo
每个 demo 调一次 `useSceneArgs` 并给不同的 `slot`，参数区会按槽位分块；不给 `slot` 时行为与单 demo 完全一致。
:::
