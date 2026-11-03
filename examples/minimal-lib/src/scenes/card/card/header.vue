<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '头部插槽 header',
  order: 2,
  section: 'slots',
  api: ['header'],
  description: 'header 插槽整块替换默认标题区。',
})
</script>
<script setup lang="ts">
import { MyCard } from '../../../lib'
</script>

<template>
  <MyCard>
    <template #header>
      <div class="custom-head">
        <span class="dot" />
        <strong>自定义头部</strong>
        <span class="tag">header 插槽</span>
      </div>
    </template>
    <p class="body">默认的 title / description 被 header 插槽替换了。</p>
  </MyCard>
</template>

<style scoped lang="less">
.custom-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2f6feb;
}

.tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #2f6feb;
  font-size: 11px;
}

.body {
  margin: 0;
  color: #475467;
}
</style>
