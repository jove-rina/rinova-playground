import { definePageMeta } from '@rinova/playground'

export const pageMeta = definePageMeta({
  component: 'MyTable',
  apiNotes: {
    'events:rowClick': '点击某一行，参数是整行数据与下标',
    'events:sortChange': '点表头触发，参数是 { key, direction }',
    'exposed:scrollToTop': '把表格滚回顶部',
    'exposed:visibleCount': '返回当前可见行数（受 config.pageSize 影响）',
  },
  title: 'Table',
  description: '对象数组 props（columns / rows）与对象 props（config）：契约里的类型定义汇总在 Types 页签。',
  order: 5,
})