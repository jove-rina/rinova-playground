<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  section: 'props',
  api: ["variant"],
  title: '按钮 · 变体',
  order: 1,
  tags: ['variant', 'cva'],
  description: '真实 shadcn-vue Button 的六种 variant，右侧面板可直接切换。',
  files: ['src/components/ui/button/index.ts'],
})
</script>

<script setup lang="ts">
import { useSceneArgs } from '@rinova/playground'
import { Button } from '@/components/ui/button'

type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type Size = 'default' | 'xs' | 'sm' | 'lg'

const args = useSceneArgs(
  { variant: 'default' as Variant, size: 'default' as Size },
  {
    labels: { variant: '变体', size: '尺寸' },
    options: {
      variant: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
      size: ['default', 'xs', 'sm', 'lg'],
    },
  }
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 p-6">
    <Button :variant="args.variant" :size="args.size">当前变体</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">删除</Button>
    <Button variant="link">链接样式</Button>
  </div>
</template>
