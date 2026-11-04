---
title: 数据展示
order: 1
tags: [概述]
description: 对象数组 props、排序与分页、ref 方法。
---

`MyTable` 的 props 全是对象/对象数组：`columns: TableColumn[]`、`rows`、`config`。这些类型的字段说明汇总在页面右上角 **Types 页签**里，不用在这里重复。

## 数据结构

```ts
const columns = [
  { key: 'name', title: '姓名', width: 120 },
  { key: 'amount', title: '金额', align: 'right' },
]
const rows = [{ name: '李婷', amount: 1280 }]
```

## 三个容易踩的点

::: warn 只负责展示
表格自带排序**只派发** `sortChange({ key, direction })`，不排序数据。排序、分页的真实数据由使用方处理，`config.pageSize` 只是从 `rows` 里切前 N 条。
:::

- `config.pageSize = 0` 表示不分页；`showHeader: false` 去掉表头；`striped` 开斑马纹。
- `rowClick` 第二个参数是**可见行**里的下标，不是原始数组下标。
- ref 上有 `scrollToTop()` 和 `visibleCount()`，长表格翻页后滚回顶部很方便。

::: tip 列宽
`width` 是固定 px，不填则自适应；`align` 支持 `left` / `center` / `right`，数字列建议右对齐。
:::
