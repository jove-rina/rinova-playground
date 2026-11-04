---
title: 目录结构
order: 1
tags: [scenes]
description: 三层起步，组件有子组件时再深一层。
---

目录就是导航，文件名就是标题。

```text
src/scenes/
├── intro/                   分组
│   ├── overview/            页面（可以不绑定组件）
│   │   ├── meta.ts          标题 / 说明 / order
│   │   ├── what.md          Markdown 场景
│   │   └── shortcuts.md
│   └── conventions/
└── card/
    ├── card/                页面（绑定 MyCard）
    │   ├── meta.ts
    │   ├── basic.vue         Vue 场景
    │   ├── card-header/      子组件页（再深一层）
    │   │   ├── meta.ts
    │   │   └── basic.vue
    │   └── card-body/
    └── plain/
```

## 几条硬规则

1. 分组目录下不能直接放场景文件，场景必须落在页面目录里。
2. 子组件页只支持一层：`分组/页/子页/场景`，不会无限嵌套。
3. 同名会撞：页目录名不要和页里已有的场景文件同名（比如同时有 `header/` 和 `header.vue`）。
4. 新增组件或页面后要重启 dev server，契约清单是启动时扫描生成的。

::: info 同一页可以混写
`.vue` 和 `.md` 可以放在同一个页面目录里，按 `order` 排序；Markdown 场景的标题、排序、标签写在文件头的 `---` 里。
:::
