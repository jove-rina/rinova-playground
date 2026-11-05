---
title: 概览
order: 1
description: 除 hook 之外的全部导出，按「定义」「反馈」「排版」三类。
tags: [api]
---

## 定义类（构建期读，纯类型收窄）

| 导出 | 用在哪 | 作用 |
|---|---|---|
| `defineSceneMeta(meta)` | 场景的普通 `<script>` | 标题、排序、标签、覆盖源码展示；**构建期**被插件读走 |
| `definePageMeta(meta)` | `<页>/meta.ts` | 页标题、排序、绑定组件、`doc` 文档页、`showSource` |
| `defineMarkdownScene(raw)` | `.md` 场景 | 框架内部用；手写场景一般用不到 |
| `definePlaygroundPlugin(plugin)` | 插件模块 | 声明 `name` / `setup` / `optional` |

::: tip 它们都只是类型收窄
运行时不做事，写不写都能跑；写了的收益是编辑器能提示字段、拼错会报红。
:::

## 反馈类

| 导出 | 签名 | 说明 |
|---|---|---|
| `toast` | `toast(message: string)` | 底部居中轻提示，自动消失；不需要挂宿主组件 |

## 排版原语（文档页用）

| 导出 | 用途 |
|---|---|
| `PwProse` | 正文容器：标题 + 导语 + 段落 / 表格 / 代码块的统一排版，正文宽 720px |
| `PwCallout` | 提示块，`tone: tip / info / warn / danger` |
| `PwSteps` + `PwStep` | 带序号的操作步骤 |
| `PwMarkdown` | 渲染一段 Markdown 字符串（`.md` 场景内部就是它） |

## 布局原语（场景里用）

| 导出 | 用途 |
|---|---|
| `PwDemoGrid` | demo 网格，`min` 控制每列最小宽度、放不下自动折行 |
| `PwDemo` | 单个 demo 块：标题 + 控件区 + `#note` / `#footer` |
| `PwSceneNote` | 场景内引用式说明块 |
| `PwApiBrief` | 场景标题下的 API 胶囊（框架自动渲染，一般不用手写） |

::: info 原语是便利品，不是约束
它们只是几行 flex/grid 封装。不用也行，自己写布局不会被任何校验拦住——框架只提供方便，不规定写法。
:::
