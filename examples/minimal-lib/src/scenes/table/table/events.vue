<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '事件 sortChange',
  order: 3,
  section: 'events',
  api: ['sortChange'],
  description: '点表头触发 sortChange，参数是 { key, direction } 对象。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { MyTable } from '../../../lib'
import type { TableColumn } from '../../../lib/MyTable.vue'
import { useSceneOutput } from '@rinova/playground'

const columns: TableColumn[] = [
  { key: 'name', title: '姓名' },
  { key: 'score', title: '分数', align: 'right' },
]

const rows = [
  { name: '李婷', score: 92 },
  { name: '王锐', score: 88 },
]

const lastSort = ref<{ key: string; direction: string } | null>(null)
const lastRow = ref<Record<string, string | number> | null>(null)

useSceneOutput(() => ({ lastSort: lastSort.value, lastRow: lastRow.value }))
</script>

<template>
  <MyTable
    :columns="columns"
    :rows="rows"
    @sort-change="lastSort = $event"
    @row-click="lastRow = $event"
  />
</template>
