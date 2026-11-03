<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '插槽 icon',
  order: 10,
  section: 'slots',
  api: ['default', 'icon'],
  description: '两个插槽：icon 放图形，default 放文字。',
})
</script>
<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="row">
    <MyButton>
      <template #icon>★</template>
      收藏
    </MyButton>
    <MyButton variant="ghost">
      <template #icon>⌕</template>
      搜索
    </MyButton>
    <MyButton variant="ghost"><template #icon>↻</template></MyButton>
  </div>
</template>

<style scoped lang="less">
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
