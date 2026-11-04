<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '头部 + 操作',
  order: 1,
  tags: ['title', 'action'],
  section: 'props',
  api: ['title', 'action'],
  description: 'title 是标题文案，action 有值时右上角出现操作按钮。',
})
</script>

<script setup lang="ts">
import { MyCard, MyCardHeader } from '../../../../lib'
</script>

<template>
  <MyCard :bordered="true">
    <template #header>
      <MyCardHeader title="卡片标题" action="编辑" />
    </template>
    Card 的子组件 MyCardHeader 打进了 Card 的 header 插槽。
  </MyCard>
</template>
