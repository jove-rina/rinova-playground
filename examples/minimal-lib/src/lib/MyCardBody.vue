<script setup lang="ts">
/**
 * 卡片正文（MyCard 的子组件）。
 */
withDefaults(
  defineProps<{
    /** 文字档位：sm 12.5px / md 13px */
    size?: 'sm' | 'md'
    /** 用次要文字色，适合放补充说明 */
    muted?: boolean
  }>(),
  { size: 'md', muted: false }
)

defineSlots<{
  /** 正文内容 */
  default?: () => unknown
}>()
</script>

<template>
  <div class="my-card-body" :class="[`my-card-body--${size}`, { 'my-card-body--muted': muted }]">
    <slot />
  </div>
</template>

<style scoped lang="less">
.my-card-body {
  color: #1c2024;

  &--sm {
    font-size: 12.5px;
  }

  &--md {
    font-size: 13px;
  }

  &--muted {
    color: #667085;
  }
}
</style>
