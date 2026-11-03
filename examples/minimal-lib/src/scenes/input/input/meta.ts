import { definePageMeta } from '@rinova/playground'

export const pageMeta = definePageMeta({
  apiNotes: {
    'events:update:modelValue': '值变化，v-model 靠它同步',
    'events:focus': '聚焦时触发，参数是 FocusEvent',
    'events:blur': '失焦时触发，参数是 FocusEvent',
    'events:enter': '按下回车，参数是当前值',
    'events:clear': '点清空按钮，无参数',
  },
  component: 'MyInput',
  title: 'Input',
  description: '输入框：受控值、事件、清空、插槽与 ref 方法。',
  order: 3,
})
