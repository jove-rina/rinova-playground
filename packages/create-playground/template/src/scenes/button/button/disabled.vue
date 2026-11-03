<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 禁用与加载',
  order: 3,
  tags: ['disabled', 'loading'],
  description: 'disabled 与 loading 两种不可点击状态。',
})
</script>

<script setup lang="ts">
import { MyButton } from '../../../components'
</script>

<template>
  <div class="demo">
    <MyButton disabled>禁用</MyButton>
    <MyButton variant="ghost" disabled>禁用幽灵态</MyButton>
    <MyButton loading>加载中</MyButton>
  </div>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}
</style>
