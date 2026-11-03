<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 同一场景多 demo',
  order: 4,
  tags: ['多 demo', '槽位'],
  files: ['src/lib/MyButton.vue'],
  description: '一个场景里放两个 demo，各自有独立的入参槽位与出参槽位，面板按槽位名分块。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import { MyButton } from '../../../lib'

const primaryCount = ref(0)
const ghostCount = ref(0)

// 两个 demo 各声明一块入参：slot 名字就是面板上那块的标题
const primary = useSceneArgs(
  { label: '主按钮', size: 'md' as 'sm' | 'md' | 'lg' },
  { options: { size: ['sm', 'md', 'lg'] }, labels: { label: '文案', size: '尺寸' }, slot: '主按钮' }
)

const ghost = useSceneArgs(
  { label: '次按钮', size: 'sm' as 'sm' | 'md' | 'lg', disabled: false },
  {
    options: { size: ['sm', 'md', 'lg'] },
    labels: { label: '文案', size: '尺寸', disabled: '禁用' },
    slot: '次按钮',
  }
)

// 出参也按槽位分开，面板里一块一个 JSON
useSceneOutput(() => ({ clicked: primaryCount.value }), '主按钮')
useSceneOutput(() => ({ clicked: ghostCount.value, doubled: ghostCount.value * 2 }), '次按钮')
</script>

<template>
  <div class="demo">
    <div class="demo__row">
      <MyButton :size="primary.size" @click="primaryCount++">{{ primary.label }}</MyButton>
      <span class="demo__hint">点了 {{ primaryCount }} 次</span>
    </div>

    <div class="demo__row">
      <MyButton :size="ghost.size" :disabled="ghost.disabled" @click="ghostCount++">
        {{ ghost.label }}
      </MyButton>
      <span class="demo__hint">点了 {{ ghostCount }} 次</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 24px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}

.demo__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo__hint {
  font-size: 13px;
  color: #667085;
}
</style>
