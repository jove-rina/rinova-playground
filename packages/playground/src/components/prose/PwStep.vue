<script setup lang="ts">
/**
 * 单条步骤，放在 `PwSteps` 里使用；标题可选，正文走默认插槽。
 */
withDefaults(
  defineProps<{
    /** 加粗的步骤标题 */
    title?: string
    /** 步骤下的一句说明 */
    description?: string
  }>(),
  { title: '', description: '' }
)
</script>

<template>
  <li class="pw-prose__step">
    <p v-if="title" class="pw-prose__step-title">{{ title }}</p>
    <p v-if="description" class="pw-prose__step-desc">{{ description }}</p>
    <slot />
  </li>
</template>

<style lang="less">
.pw-prose__step-title {
  margin: 0 0 2px;
  font-size: 13.5px;
  font-weight: 600;
}

.pw-prose__step-desc {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 13px;
}
</style>
