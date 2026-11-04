<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '底部操作',
  order: 1,
  tags: ['hint', 'divider'],
  section: 'props',
  api: ['hint', 'divider'],
  description: 'hint 放左侧说明，divider 控制分隔线与浅色底。',
})
</script>

<script setup lang="ts">
import { MyButton, MyCard, MyCardBody, MyCardFooter, MyCardHeader } from '../../../../lib'
</script>

<template>
  <MyCard title="发布确认">
    <template #header>
      <MyCardHeader title="发布确认" />
    </template>
    <MyCardBody>发布后 2 分钟内生效，可随时回滚。</MyCardBody>
    <template #footer>
      <MyCardFooter hint="上次发布：8 月 12 日">
        <MyButton size="sm">取消</MyButton>
        <MyButton size="sm" variant="primary">发布</MyButton>
      </MyCardFooter>
    </template>
  </MyCard>
</template>
