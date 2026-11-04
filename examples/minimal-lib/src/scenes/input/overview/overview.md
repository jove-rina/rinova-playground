---
title: 输入类组件
order: 1
tags: [概述]
description: 输入框的受控写法、事件与 ref 方法。
---

`MyInput` 是受控组件：值由 `v-model` 进出，所有状态都从 props 来，不在组件内部偷偷存一份。

## 三件必知

| 项 | 说明 |
| --- | --- |
| 双向绑定 | 靠 `update:modelValue`；不写 `v-model` 要自己接 `:modelValue` + `@update:modelValue` |
| 清空 | `clearable` 只在**有值且未禁用**时出现按钮，清空会同时触发 `clear` 事件 |
| 回车 | `enter` 事件直接带当前值，不用再从事件对象里取值 |

## 插槽与 ref

::: steps
1. `#prefix` 放图标 / 货币符号，`#suffix` 放单位或快捷键提示。
2. 外层是 `<label>`，点前后缀也会聚焦输入框。
3. ref 上有 `focus()` / `select()` / `clear()` / `element`（原生 input），适合做"搜索后自动选中"这类交互。
:::

::: warn 别在输入过程中格式化
`maxlength` 会直接截断；如果需要格式化（千分位、手机号分段），请在 `update:modelValue` 里处理，不要在组件内部改值，否则光标会跳。
:::
