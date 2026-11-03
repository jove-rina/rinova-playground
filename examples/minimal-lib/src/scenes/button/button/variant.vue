<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '变体 variant',
  order: 4,
  section: 'props',
  api: ['variant'],
  description: 'variant 两个档位：primary 实心、ghost 描边。',
})
</script>
<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="row">
    <MyButton variant="primary">Primary</MyButton>
    <MyButton variant="ghost">Ghost</MyButton>
  </div>
</template>

<style scoped lang="less">
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
