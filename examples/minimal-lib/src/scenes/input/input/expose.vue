<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '方法 select',
  order: 5,
  section: 'exposes',
  api: ['focus', 'select', 'clear'],
  description: '通过 ref 调 focus / select / clear。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyButton, MyInput } from '../../../lib'

const input = ref<{ focus: () => void; select: () => void; clear: () => void } | null>(null)
</script>

<template>
  <div class="col">
    <MyInput ref="input" model-value="选中我看看" />
    <div class="row">
      <MyButton size="sm" @click="input?.focus()">focus()</MyButton>
      <MyButton size="sm" @click="input?.select()">select()</MyButton>
      <MyButton size="sm" variant="ghost" @click="input?.clear()">clear()</MyButton>
    </div>
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  gap: 8px;
}
</style>
