<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '清空 clearable',
  order: 4,
  section: 'props',
  api: ['clearable', 'maxlength'],
  description: 'clearable 有值时出现清空按钮；maxlength 截断输入。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyInput } from '../../../lib'
import { useSceneOutput } from '@rinova/playground'

const value = ref('点右边的 × 清空我')
useSceneOutput(() => ({ modelValue: value.value }))
</script>

<template>
  <div class="col">
    <MyInput v-model="value" clearable />
    <MyInput model-value="最多 6 个字" :maxlength="6" clearable />
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
