---
title: 插件相关
order: 4
description: usePlaygroundEnv / usePlaygroundPlugin / usePlaygroundUi —— 需要 config.plugins 才有值。
tags: [hooks, 插件]
---

这三个 hook 读的是**消费端注入**的东西，框架本身不内置登录态或环境变量。要试效果，先在自己的项目里配 `plugins`：

```ts
// playground.config.ts
export default defineConfig({
  globals: { apiBase: '/api' },
  plugins: ['./src/playground/plugins.ts'],
})
```

本站在 `docs-site` 里没有配插件，所以下面三个直接调都拿不到值——这是预期行为。

## usePlaygroundEnv

```ts
const env = usePlaygroundEnv<{ apiBase: string }>()
// env.apiBase === '/api'；插件返回值会覆盖同名字段
```

合并顺序：`config.globals` 打底 → 插件按声明顺序覆盖。**值是初始化时的快照**，要实时状态用下面那个。

## usePlaygroundPlugin

```ts
const auth = usePlaygroundPlugin<{ user: User }>('auth')
```

取插件的 `setup` 返回值。插件不存在时**直接抛错**（会被场景错误边界接住），不会静默 `undefined`。

## usePlaygroundUi

```ts
const { togglePanel } = usePlaygroundUi()
togglePanel('account')   // 打开插件注册的抽屉
```

抽屉由插件用 `ctx.ui.panel({ id, title, component })` 注册，同一时刻只开一个，Esc 关闭后焦点回到触发元素。

::: info 为什么不做成「场景级插件」
插件提供的是应用级单例：一个场景改了 pinia，其它场景会一起变。要隔离只能上 iframe，而框架明确不做沙箱。
:::
