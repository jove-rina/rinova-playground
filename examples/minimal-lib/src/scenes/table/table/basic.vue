<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '基础用法',
  order: 1,
  api: ['columns', 'rows'],
  description: 'columns 是对象数组：每项有 key / title / width / align。',
})
</script>

<script setup lang="ts">
import { MyTable } from '../../../lib'
import type { TableColumn } from '../../../lib/MyTable.vue'

const columns: TableColumn[] = [
  { key: 'name', title: '姓名', width: 120 },
  { key: 'role', title: '角色' },
  { key: 'age', title: '年龄', width: 80, align: 'right' },
]

const rows = [
  { name: '李婷', role: '产品', age: 31 },
  { name: '王锐', role: '前端', age: 28 },
  { name: '陈默', role: '后端', age: 34 },
]
</script>

<template>
  <MyTable :columns="columns" :rows="rows" />
</template>
