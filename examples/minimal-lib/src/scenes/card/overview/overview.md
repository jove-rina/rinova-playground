---
title: 卡片类组件
order: 1
tags: [概述]
description: 卡片容器的插槽结构，以及三个子组件怎么配合。
---

卡片是**容器 + 子组件**的典型结构：`MyCard` 负责外框与内边距，`CardHeader` / `CardBody` / `CardFooter` 负责三块内容，各自是一个二级页面。

## 一个卡片有哪些位置

| 位置 | 用法 | 说明 |
| --- | --- | --- |
| 标题区 | `title` / `description` 或 `#header` 插槽 | 用了 `#header` 插槽就不渲染 `title` / `description` |
| 主体 | 默认插槽 | 内边距由 `padding` 控制（`sm` 10px / `md` 12px / `lg` 20px） |
| 底部 | `#footer` 插槽 | 自带分隔线与浅色底，适合放操作按钮 |

::: tip 先试子组件，再考虑自己写
`CardHeader`（标题 + 操作按钮）、`CardBody`（字号 / 次色）、`CardFooter`（说明 + 操作区）已经覆盖了绝大多数卡片；只有版式确实不同时再手写。
:::

## 常见组合

::: steps
1. `MyCard` + `#header` → `CardHeader`，右上角放一个渐变操作按钮。
2. 主体用 `CardBody`，正文与补充说明分别用默认和 `muted` 两档。
3. 底部用 `CardFooter` 包两个按钮，`hint` 放时间戳之类的辅助信息。
:::

`bordered={false}` 或 `Plain` 变体适合放在已经有背景的区块里（侧栏卡片、列表内部的二级卡片）。
