<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '配置 config',
  order: 2,
  section: 'props',
  api: ['config'],
  description: 'config 是对象 props：pageSize 截断行数，showHeader 控制表头，striped 开斑马纹。',
})
</script>

<script setup lang="ts">
import { MyTable } from '../../../lib'
import type { TableColumn } from '../../../lib/MyTable.vue'

const columns: TableColumn[] = [
  { key: 'name', title: '姓名' },
  { key: 'city', title: '城市' },
]

const rows = [
  { name: '李婷', city: '杭州' },
  { name: '王锐', city: '上海' },
  { name: '陈默', city: '成都' },
  { name: '周敏', city: '深圳' },
]
</script>

<template>
  <MyTable :columns="columns" :rows="rows" :config="{ pageSize: 3, showHeader: true, striped: true }" />
</template>
