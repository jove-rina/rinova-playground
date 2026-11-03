<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '卡片 · 基础用法',
  order: 4,
  tags: ['slot'],
  description: '带标题与描述的卡片，内容走默认插槽。',
})
</script>

<script setup lang="ts">
import { MyCard } from '../../../components'
</script>

<template>
  <MyCard title="卡片标题" description="这里是一段描述文字。">
    卡片正文内容。源码面板读取的就是这个文件的原文，改这里源码面板立刻同步。
  </MyCard>
</template>
