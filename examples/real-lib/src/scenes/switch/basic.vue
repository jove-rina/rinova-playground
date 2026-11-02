<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '开关 · 受控',
  order: 1,
  tags: ['modelValue', 'reka-ui'],
  description: 'Switch 直接把 reka-ui 的 SwitchRootProps 转发出来，size 是 shadcn 加的。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import { Switch } from '@/components/ui/switch'

const args = useSceneArgs(
  { on: true, small: false },
  { labels: { on: '开启', small: '小尺寸' } }
)
const extra = ref(true)

useSceneOutput(() => ({ 主开关: args.on, 副开关: extra.value, 尺寸: args.small ? 'sm' : 'default' }))
</script>

<template>
  <div class="flex w-full flex-col gap-4 p-6">
    <label class="flex items-center gap-3 text-sm">
      <Switch v-model="args.on" :size="args.small ? 'sm' : 'default'" />
      跟随面板
    </label>
    <label class="flex items-center gap-3 text-sm">
      <Switch v-model="extra" size="sm" />
      独立开关
    </label>
  </div>
</template>
