---
title: 按钮类组件
order: 1
tags: [概述]
description: 按钮类分组的范围、用法约定与常见坑。
---

本组只有一个组件 `MyButton`，但它是全站用得最多的一个：11 个场景覆盖尺寸、变体、禁用、加载、图标按钮、撑满、事件、ref 和多 demo 写法。

## 什么时候用哪种变体

| 场景 | 用法 |
| --- | --- |
| 页面主操（保存、发布、提交） | `variant="primary"`（默认） |
| 次要操作（取消、返回、更多） | `variant="ghost"` |
| 只放图标（工具栏、卡片右上角） | `iconOnly` + `pill` |
| 块级按钮（表单底部、移动端） | `block` |

::: warn 同屏只放一个主按钮
primary 是实心蓝，出现两个就分不出主次。列表行内的操作一律用 ghost 或文字按钮。
:::

## 一次点击会触发几件事

::: steps
1. `click` 是原生事件，参数是 `MouseEvent`。
2. `press` 是业务事件，参数是 `(variant, MouseEvent)`——埋点时直接拿到按钮类型，不用再从 DOM 上找。
3. 拿到 ref 后可以访问 `element`（原生 `<button>`），做焦点管理或第三方集成。
:::

```vue
<MyButton variant="ghost" @press="(variant) => track('button', variant)">取消</MyButton>
```

`loading` 会自动禁用点击，不需要同时写 `disabled`。
