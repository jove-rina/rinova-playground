<script setup lang="ts">
/**
 * 步骤列表：按顺序讲一件事时用，序号由 CSS 计数器生成，增删条目不用改编号。
 *
 * Markdown 里写 `::: steps` + 有序列表，渲染出来是同一个组件。
 */
withDefaults(
  defineProps<{
    /** 起始序号，默认 1 */
    start?: number
  }>(),
  { start: 1 }
)
</script>

<template>
  <ol class="pw-prose__steps" :style="start !== 1 ? { counterReset: `pw-prose-step ${start - 1}` } : undefined">
    <slot />
  </ol>
</template>
