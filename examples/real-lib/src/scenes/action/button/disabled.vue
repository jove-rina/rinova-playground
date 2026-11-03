<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  section: 'props',
  api: ["disabled"],
  title: '按钮 · 禁用与计数',
  order: 3,
  tags: ['disabled', 'click'],
  description: 'disabled 透传到 reka-ui Primitive；点击次数作为出参展示。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import { Button } from '@/components/ui/button'

const args = useSceneArgs({ disabled: false }, { labels: { disabled: '禁用' } })
const count = ref(0)

useSceneOutput(() => ({ 点击次数: count.value, 禁用: args.disabled }))
</script>

<template>
  <div class="flex items-center gap-4 p-6">
    <Button :disabled="args.disabled" @click="count += 1">点我（{{ count }}）</Button>
    <span class="text-sm text-muted-foreground">右侧勾选「禁用」后按钮不可点</span>
  </div>
</template>
