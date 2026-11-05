---
title: 概览
order: 1
description: 六个 hook，按「场景内」和「集成侧」分成两组。
tags: [hooks, api]
---

全部从 `@rinova/playground` 具名导出。**只能在场景的 `setup` 里调用**——它们靠 `inject` 读当前场景的上下文，在函数外调用拿不到。

## 场景内（写 demo 时会用到）

| Hook | 返回 | 作用 |
|---|---|---|
| `useSceneArgs(defaults, options?)` | 响应式对象 | 在预览下方渲染输入表单，改动直接驱动组件 |
| `useSceneOutput(getter, slot?)` | 无 | 把快照挂到输出面板，每 400ms 轮询一次 |
| `usePlaygroundTheme()` | `ComputedRef<'light' \| 'dark'>` | 跟随外壳明暗，做主题敏感的自定义展示 |

## 集成侧（配了 `config.plugins` 才有值）

| Hook | 返回 | 作用 |
|---|---|---|
| `usePlaygroundEnv<T>()` | 合并后的对象 | `config.globals` + 所有插件返回值 |
| `usePlaygroundPlugin<T>(name)` | 单个插件的返回值 | 读登录态、当前用户这类状态 |
| `usePlaygroundUi()` | `{ openPanel, closePanel, togglePanel }` | 打开插件注册的抽屉 |

::: tip 场景里不需要 import 任何框架组件
输入 / 输出面板、源码卡片、错误边界都由框架按场景自动铺，场景本身就是一个普通 SFC。
:::

## 一条场景的完整生命周期

::: steps
1. 插件初始化（配了 `plugins` 时）—— 全部完成前不渲染外壳
2. 页面挂载，视口内的场景 `setup` 执行，hooks 注册到当前场景
3. 改动输入表单 → 组件重渲染 → 输出面板 400ms 内取到新快照
4. 场景滚出视口后卸载，hook 注册的槽位一并回收
:::
