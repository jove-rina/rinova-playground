<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '加载 loading',
  order: 5,
  section: 'props',
  api: ['loading'],
  description: 'loading 时按钮禁用并显示转圈，等价于 disabled。',
})
</script>
<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="row">
    <MyButton loading>提交中</MyButton>
    <MyButton loading variant="ghost">保存中</MyButton>
  </div>
</template>

<style scoped lang="less">
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
