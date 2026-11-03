import { definePageMeta } from '@rinova/playground'

export const pageMeta = definePageMeta({
  apiNotes: {
    'events:click': '原生点击事件，参数是 MouseEvent',
    'events:press': '业务事件，第一个参数是 variant，第二个是 MouseEvent',
    'exposed:element': '原生 button 元素，可直接操作 DOM',
  },
  component: 'MyButton',
  "title": "Button",
  "description": "基础按钮：尺寸、变体、禁用、加载，以及一场景多 demo 的写法。",
  "order": 1
})
