<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '徽标 · 变体',
  order: 1,
  tags: ['badge'],
  description: 'Badge 的六种 variant。',
})
</script>

<script setup lang="ts">
import { useSceneArgs } from '@rinova/playground'
import { Badge } from '@/components/ui/badge'

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

const args = useSceneArgs(
  { variant: 'default' as Variant },
  {
    labels: { variant: '变体' },
    options: { variant: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] },
  }
)
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-3 p-6">
    <Badge :variant="args.variant">当前</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="ghost">Ghost</Badge>
  </div>
</template>
