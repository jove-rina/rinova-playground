<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '方法 focus',
  order: 9,
  section: 'exposes',
  api: ['focus', 'blur'],
  description: '通过 ref 调用组件暴露的 focus / blur。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyButton } from '../../../lib'

const btn = ref<{ focus: () => void; blur: () => void } | null>(null)
</script>

<template>
  <div class="row">
    <MyButton ref="btn" variant="ghost">点旁边的按钮聚焦我</MyButton>
    <MyButton size="sm" @click="btn?.focus()">focus()</MyButton>
    <MyButton size="sm" variant="ghost" @click="btn?.blur()">blur()</MyButton>
  </div>
</template>

<style scoped lang="less">
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
