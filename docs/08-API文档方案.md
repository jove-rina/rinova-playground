# 08 API 文档方案（M7）

> 现状问题：playground 能看见 Demo，但看不见「这个 prop 是什么、事件回调拿到什么、slots 传什么」。使用者只能读源码，等于黑盒。
>
> **状态：P1–P3 已实现**（P4 全站检索未做）。实测：Input 页 `MyInput 17 个 API · 0 个缺说明`，Props 6 / Events 5 / Slots 2 / Exposes 4；事件行显示 `[event: FocusEvent]` 与完整签名；点场景里的 API 标签会切到 API 视图并高亮该行；点「演示」列回到对应场景。
>
> **已知限制**：`vue-component-meta` 不解析 `defineEmits` 的 JSDoc（类型式与对象式都试过，`description` 恒为空）。补齐手段是 `<页>/meta.ts` 的 `apiNotes: { 'events:press': '说明' }`，已在本仓库三个示例里用上。

## 0. 结论

**不手写 API 文档，全部从 TypeScript 类型 + JSDoc 生成。**

理由：手写 Markdown 一定会和代码漂移（改 prop 忘改文档），而 `vue-component-meta` 已经能从源码拿到 props / events / slots / exposed 的类型、默认值与 JSDoc 说明——现在只差「呈现」。实测确认（MyInput）：

| 能力 | 数据 | 例子 |
|---|---|---|
| prop 类型 | `type` | `"md" \| "sm" \| undefined` |
| prop 默认值 | `default` | `"md"` |
| prop 说明 | `description`（JSDoc） | `有值时显示清空按钮` |
| 事件参数 | `type` / `signature` | `[event: FocusEvent]` |
| 插槽作用域 | `type` | `{}` 或插槽 props |
| expose 方法 | `type` | `() => void` |

所以这一期是**纯呈现层**工作，不引入文档生成器、不新增手写文件。

## 1. 三层呈现

| 层 | 位置 | 解决什么 |
|---|---|---|
| **场景内摘要** | 场景标题下的 API 标签（现有）+ 悬浮/点击明细 | 「我正在看的这个 demo 用了哪几个 API、类型是什么」 |
| **页面 API 表** | 组件页新增「API」视图（页头切换 场景 / API） | 「这个组件一共有哪些 prop / event / slot / expose」 |
| **全站检索** | 可选 `/api` 页，搜 prop 名 | 400 组件级的库才需要，P3 再做 |

## 2. 数据模型

### 2.1 manifest 扩展

```ts
interface ManifestComponent {
  name: string
  rel: string
  props: { name; type; required; default; description }[]     // 现有
  events: { name; type; signature; description }[]            // 新增 type/signature/description
  slots: { name; type; description }[]                        // 新增 type/description
  exposed: { name; type; description }[]                      // 新增 type/description
  scenes: string[]
  uncoveredProps: string[]
  undocumented: string[]                                      // 新增：没写 JSDoc 的 API 名
}
```

### 2.2 页 ↔ 组件绑定

```ts
// src/scenes/input/input/meta.ts
export const pageMeta = definePageMeta({
  title: 'Input',
  component: 'MyInput',   // 新增：这一页演示哪个组件
})
```

规则：
- 显式 `component` 优先；
- 没写则按「页目录名 === manifest 组件名（忽略大小写）」自动匹配；
- 都匹配不上时，API 表按 `sceneMeta.api` 聚合展示（只有名字，没有类型），并提示「未绑定组件」。

### 2.3 注入方式

构建期把**本项目用到的组件**（`pageMeta.component` 引用到的）裁出来，注入 `virtual:playground/api`，运行时零请求：

```ts
export const api: Record<string, ComponentApi>   // 组件名 → 契约
```

400 组件全量约 300KB，只注入被页面引用的那部分（一般几十个）预期 < 30KB。

## 3. 页面 API 表

页头加一个切换：`场景 | API`（默认场景）。API 视图：

```text
Input                                        12 个 API · 覆盖 9/12
[ Props 6 ] [ Events 5 ] [ Slots 2 ] [ Exposes 3 ]

名称            类型                      默认值     说明                演示
modelValue      string | undefined       ""        输入框的值          基础用法 →
clearable       boolean | undefined      false     有值时显示清空按钮   清空 clearable →
maxlength       number | undefined       —         字数上限            清空 clearable →
disabled        boolean | undefined      false      —                   禁用 disabled →   [补说明]
```

规则：
- 类型用等宽字体 + 可点击复制；
- 说明为空的行标黄，末尾一个「补说明」徽标（提示去写 JSDoc，不阻塞）；
- 「演示」列列出引用了这个 API 的场景，点击滚到对应 `#场景名`；
- Events 的「类型」列显示参数：`[event: FocusEvent]`，并在展开里给完整 signature；
- 表头给一行汇总：`Props 6 · Events 5 · Slots 2 · Exposes 3 · 缺说明 1`。

## 4. 场景内摘要升级

现在 `sceneMeta.api: ['disabled']` 只渲染一个名字标签。升级：

- 绑定组件后，标签补上类型：`disabled: boolean = false`；
- 点击标签 → 切到 API 视图并高亮该行；
- 未绑定时保持现状（只显示名字）。

## 5. 未写说明的处理

不假装自动写文档。做法：
1. API 表里标黄；
2. `coverage.md` 增加一节「缺 JSDoc 的 API」，列 `组件.API` 清单，可直接当待办；
3. docs 里给一条示例：怎么用 `/** 说明 */` 让表里出现文字。

## 6. 分期与验收

| 期 | 内容 | 验收 |
|---|---|---|
| **P1** | manifest 扩 events/slots/exposed 的 type/description；`pageMeta.component`；`virtual:playground/api` 注入 | `pnpm build` 后 `.playground/manifest.json` 里 MyInput.events 带 `[event: FocusEvent]` |
| **P2** | 页头 `场景 / API` 切换 + API 表（4 Tab、类型/默认/说明/演示链接、标黄缺说明） | Input 页 API 视图列出 6 props / 5 events / 2 slots / 3 exposes；点「演示」跳到对应场景 |
| **P3** | 场景内 API 标签补类型 + 点击联动高亮；`coverage.md` 缺说明清单 | 点 `clearable` 标签 → API 表打开且该行高亮 |
| **P4**（可选） | `/api` 全站检索页 | 输入 `modelValue` 能搜到所有组件 |

## 7. 明确不做

- 手写 Markdown API 文档（会漂移）
- 从 JSON Schema / tsdoc 生成站点（`vue-component-meta` 已够用）
- SSR / 独立文档站构建（playground 本身就是文档站）
- 自动生成「使用示例」（示例仍然由场景承担，API 表只负责解释契约）
