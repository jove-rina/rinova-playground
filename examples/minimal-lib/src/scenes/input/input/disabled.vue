<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '禁用 disabled',
  order: 3,
  api: ['disabled', 'size', 'placeholder'],
  section: 'props',
  description: 'disabled 与两个尺寸档位。',
})
</script>
<script setup lang="ts">
import { MyInput } from '../../../lib'
</script>

<template>
  <div class="col">
    <MyInput size="sm" placeholder="sm 尺寸" />
    <MyInput placeholder="md 尺寸（默认）" />
    <MyInput disabled model-value="禁用状态" />
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
