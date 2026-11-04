<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '输入框 · 双向绑定',
  order: 1,
  tags: ['modelValue', 'vueuse'],
  description: 'Input 用 useVModel 被动绑定，输入内容实时出现在输出面板。',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneOutput } from '@rinova/playground'
import { Input } from '@/components/ui/input'

const text = ref('')
useSceneOutput(() => ({ 输入长度: text.value.length, 内容: text.value }))
</script>

<template>
  <div class="flex max-w-sm flex-col gap-3 p-6">
    <Input v-model="text" placeholder="随便输点什么" />
    <Input default-value="默认值" disabled />
  </div>
</template>
