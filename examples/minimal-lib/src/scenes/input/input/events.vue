<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '事件 enter',
  order: 2,
  section: 'events',
  api: ['update:modelValue', 'focus', 'blur', 'enter'],
  description: '四个 emit：输入、聚焦、失焦、回车；右侧出参实时看次数。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyInput } from '../../../lib'
import { useSceneOutput } from '@rinova/playground'

const value = ref('')
const log = ref<string[]>([])

const push = (text: string): void => {
  log.value = [text, ...log.value].slice(0, 4)
}

useSceneOutput(() => ({ modelValue: value.value, events: log.value }))
</script>

<template>
  <div class="col">
    <MyInput
      v-model="value"
      clearable
      placeholder="输入后回车"
      @focus="push('focus')"
      @blur="push('blur')"
      @enter="push(`enter: ${$event || '(空)'}`)"
    />
    <p class="hint">最近事件：{{ log.join(' · ') || '（还没有）' }}</p>
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  margin: 0;
  color: #667085;
  font-size: 12px;
}
</style>
