<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '基础用法',
  order: 1,
  api: ['modelValue'],
  description: '最简单的用法：v-model 绑一个值。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyInput } from '../../../lib'
import { useSceneOutput } from '@rinova/playground'

const value = ref('')
useSceneOutput(() => ({ modelValue: value.value }))
</script>

<template>
  <MyInput v-model="value" placeholder="输入点什么" />
</template>
