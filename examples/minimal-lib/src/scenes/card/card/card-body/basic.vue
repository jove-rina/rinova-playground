<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '正文 + 次要文字',
  order: 1,
  tags: ['size', 'muted'],
  section: 'props',
  api: ['size', 'muted'],
  description: 'size 控制字号，muted 换成次要文字色。',
})
</script>

<script setup lang="ts">
import { MyButton, MyCard, MyCardBody, MyCardFooter, MyCardHeader } from '../../../../lib'
</script>

<template>
  <MyCard title="本周数据">
    <template #header>
      <MyCardHeader title="本周数据" action="导出" />
    </template>
    <MyCardBody>访问量 12,480，比上周 +8.2%。</MyCardBody>
    <MyCardBody size="sm" muted>数据滞后 5 分钟，仅供参考。</MyCardBody>
  </MyCard>
</template>
