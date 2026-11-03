<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '整行 block',
  order: 7,
  section: 'props',
  api: ['block'],
  description: 'block 撑满父容器宽度。',
})
</script>
<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="box">
    <MyButton block>整行按钮</MyButton>
    <MyButton block variant="ghost">整行次按钮</MyButton>
  </div>
</template>

<style scoped lang="less">
.box {
  display: flex;
  width: 320px;
  flex-direction: column;
  gap: 10px;
}
</style>
