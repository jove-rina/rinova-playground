<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '底部插槽 footer',
  order: 3,
  section: 'slots',
  api: ['footer'],
  description: 'footer 插槽放操作区，自动带分隔线与底色。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyButton, MyCard } from '../../../lib'
import { useSceneOutput } from '@rinova/playground'

const confirmed = ref(0)
useSceneOutput(() => ({ confirmed: confirmed.value }))
</script>

<template>
  <MyCard title="删除确认" description="footer 里的两个按钮">
    <p class="body">这条记录会从列表里移除，操作不可撤销。</p>
    <template #footer>
      <div class="row">
        <span class="hint">已确认 {{ confirmed }} 次</span>
        <MyButton size="sm" variant="ghost" @click="confirmed--">取消</MyButton>
        <MyButton size="sm" @click="confirmed++">确认删除</MyButton>
      </div>
    </template>
  </MyCard>
</template>

<style scoped lang="less">
.body {
  margin: 0;
  color: #475467;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  margin-right: auto;
  color: #667085;
  font-size: 12px;
}
</style>
