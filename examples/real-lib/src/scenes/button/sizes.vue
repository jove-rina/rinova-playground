<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 尺寸',
  order: 2,
  tags: ['size'],
  description: 'cva 生成的 size 档位，含 icon 专用尺寸。',
})
</script>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-3 p-6">
    <Button size="xs">xs</Button>
    <Button size="sm">sm</Button>
    <Button size="default">default</Button>
    <Button size="lg">lg</Button>
    <Button size="icon" aria-label="设置">⚙</Button>
    <Button size="icon-sm" variant="outline" aria-label="加号">+</Button>
  </div>
</template>
