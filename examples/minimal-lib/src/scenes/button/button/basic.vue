<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 基础用法',
  order: 1,
  tags: ['基础', 'click'],
  files: ['src/lib/MyButton.vue'],
  description: '点击按钮累加计数，用来验证事件透传与响应式更新。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import { MyButton } from '../../../lib'

const count = ref(0)

// 面板里的表单改这里 → 组件实时重渲染（纯前端，生产环境同样可用）
const args = useSceneArgs(
  { label: '点我 +1', size: 'md' as 'sm' | 'md' | 'lg', disabled: false },
  { options: { size: ['sm', 'md', 'lg'] }, labels: { label: '文案', size: '尺寸', disabled: '禁用' } }
)

useSceneOutput(() => ({ clicked: count.value, doubled: count.value * 2 }))
</script>

<template>
  <div class="demo">
    <MyButton :size="args.size" :disabled="args.disabled" @click="count++">{{ args.label }}</MyButton>
    <span class="demo__hint">已点击 {{ count }} 次</span>
  </div>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}

.demo__hint {
  font-size: 13px;
  color: #667085;
}
</style>
