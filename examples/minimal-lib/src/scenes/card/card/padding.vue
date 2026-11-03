<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '内边距 padding',
  order: 4,
  section: 'props',
  api: ['padding', 'bordered'],
  description: 'padding 三档内边距，bordered=false 去掉边框与阴影。',
})
</script>
<script setup lang="ts">
import { MyCard } from '../../../lib'
</script>

<template>
  <div class="col">
    <MyCard title="sm" padding="sm" :bordered="false">
      <p class="body">padding="sm" + bordered=false</p>
    </MyCard>
    <MyCard title="lg" padding="lg">
      <p class="body">padding="lg"，默认带边框</p>
    </MyCard>
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.body {
  margin: 0;
  color: #475467;
}
</style>
