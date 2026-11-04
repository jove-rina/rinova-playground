<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '无边框卡片',
  order: 1,
  tags: ['bordered', 'padding'],
  section: 'props',
  api: ['bordered', 'padding'],
  description: 'bordered=false 去掉边框与阴影，padding 控制内边距档位。',
})
</script>

<script setup lang="ts">
import { MyCard } from '../../../lib'
</script>

<template>
  <MyCard :bordered="false" padding="lg" title="无边框卡片" description="同一分组下的第二个组件页。">
    正文内容，内边距为 lg（20px）。
  </MyCard>
</template>
