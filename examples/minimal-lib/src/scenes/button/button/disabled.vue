<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  order: 3,
  title: '按钮 · 禁用',
  section: 'props',
  api: ['disabled'],
  description: 'disabled 为 true 时不可点击：普通态与幽灵态各一个实例。',
})
</script>

<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="demo">
    <MyButton disabled>禁用状态</MyButton>
    <MyButton variant="ghost" disabled>禁用幽灵态</MyButton>
  </div>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  gap: 12px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}
</style>
