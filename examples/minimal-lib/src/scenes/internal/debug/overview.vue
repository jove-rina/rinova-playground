<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '内部 · 调试场景',
  hideInNav: true,
  description: '这个场景不出现在侧栏，只能通过 URL /internal/debug 直达。',
})
</script>

<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="demo">
    <MyButton variant="ghost">隐藏场景（仅直链可达）</MyButton>
  </div>
</template>

<style scoped lang="less">
.demo {
  padding: 28px;
  border: 1px dashed #d0d5dd;
  border-radius: 12px;
  background: #fff;
}
</style>
