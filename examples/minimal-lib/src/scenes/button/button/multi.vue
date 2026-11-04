<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 同一场景多 demo',
  order: 4,
  tags: ['多 demo', '槽位', 'PwDemoGrid'],
  files: ['src/lib/MyButton.vue'],
  description:
    '一个场景里放两个 demo，各自有独立的输入槽位与输出槽位，面板按槽位名分块；布局用 PwDemoGrid / PwDemo，不必自己写卡片和间距。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { PwDemo, PwDemoGrid, useSceneArgs, useSceneOutput } from '@rinova/playground'
import { MyButton } from '../../../lib'

const primaryCount = ref(0)
const ghostCount = ref(0)

// 两个 demo 各声明一块输入：slot 名字就是面板上那块的标题
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

// 输出也按槽位分开，面板里一块一个 JSON
useSceneOutput(() => ({ clicked: primaryCount.value }), '主按钮')
useSceneOutput(() => ({ clicked: ghostCount.value, doubled: ghostCount.value * 2 }), '次按钮')
</script>

<template>
  <!-- min 是每列最小宽度：容器放不下自动折行，宽了就并排 -->
  <PwDemoGrid :min="260">
    <PwDemo title="主按钮">
      <MyButton :size="primary.size" @click="primaryCount++">{{ primary.label }}</MyButton>
      <span class="scene-hint">点了 {{ primaryCount }} 次</span>
    </PwDemo>

    <PwDemo title="次按钮">
      <MyButton :size="ghost.size" :disabled="ghost.disabled" @click="ghostCount++">
        {{ ghost.label }}
      </MyButton>
      <span class="scene-hint">点了 {{ ghostCount }} 次</span>
    </PwDemo>
  </PwDemoGrid>
</template>

<style scoped lang="less">
.scene-hint {
  color: var(--rp-color-text-muted);
  font-size: 13px;
}
</style>
