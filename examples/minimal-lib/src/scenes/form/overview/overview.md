---
title: 表单组合
order: 1
tags: [概述]
description: 这一组是组合示例：卡片 + 输入 + 按钮拼出完整表单。
---

这一组没有新组件，讲的是**怎么把已有组件拼成一块能用的表单**：`MyCard` 做容器、`MyInput` 收数据、`MyButton` 触发提交，覆盖校验、提交、重置三条流。

::: info 为什么这页有 API 页签
这一页绑定的是容器组件 `MyCard`，所以 API 表显示的是卡片的契约；输入框和按钮的契约在各自的页里。
:::

## 一次提交流程

::: steps
1. 每个字段用一个受控 `MyInput`，值收在同一个 `reactive` 对象里。
2. 提交时先跑校验，把错误写进 `errors` 对象，字段下方显示提示。
3. 校验通过后调接口；`MyButton` 置 `loading`，避免重复提交。
4. 重置时值清空、错误清空，并把焦点还给第一个字段（`ref.focus()`）。
:::

```vue
<MyCard title="新建报价单" description="三项必填">
  <MyInput v-model="form.customer" placeholder="客户名称" />
  <template #footer>
    <MyCardFooter hint="提交后 2 分钟内可撤回">
      <MyButton variant="ghost" @click="reset">重置</MyButton>
      <MyButton :loading="saving" @click="submit">提交</MyButton>
    </MyCardFooter>
  </template>
</MyCard>
```

::: tip 校验放在哪
示例里的校验是手写的，方便看清流程；真实项目请接到你们自己的表单方案（vee-validate / zod / 内部表单库）上，不要指望 playground 提供校验。
:::
