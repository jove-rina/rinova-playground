---
title: meta 写法
order: 2
tags: [pageMeta, Markdown]
description: 页级信息写 meta.ts，场景级信息写在文件里。
---

## 页：meta.ts

```ts
import { definePageMeta } from '@rinova/playground'

export const pageMeta = definePageMeta({
  title: '概览',                 // 侧栏与页头标题
  description: '这一页在讲什么',   // 页头说明
  order: 1,                     // 分组内排序
  component: 'MyButton',        // 可选：绑定组件才会出现 API 页签
  showSource: false,            // 可选：内容页关掉场景源码
  apiNotes: { 'events:press': '自定义说明' }, // 可选：补 JSDoc 不到的地方
})
```

## Vue 场景：`<script>` 里的 sceneMeta

```ts
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '基本用法',
  order: 1,
  tags: ['variant', 'size'], // 场景顶部的标签
  section: 'props',          // 归到哪个分组下（props / events / slots …）
  api: ['variant', 'size'],  // 标签可点击跳到 API 表对应行
  description: '一句话说明',
  showSource: true,          // 可选：单个场景覆盖页级开关
  hidden: false,             // 内部调试场景可以设 true
})
```

## Markdown 场景：文件头

```md
---
title: 键盘操作
order: 2
tags: [快捷键]
description: 导航和搜索都能只用键盘走完。
---
```

正文里可以用两种容器：

::: steps
1. `::: tip 标题` 写提示块，`tip` / `info` / `warn` / `danger` 对应四种语气。
2. `::: steps` 包一段有序列表，渲染成带序号的步骤。
3. 代码块按语言自动高亮（`ts` / `bash` / `vue` / `json` / `diff` 等）。
:::
