<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    tone?: 'neutral' | 'success' | 'danger'
    size?: 'sm' | 'md'
    rounded?: boolean
  }>(),
  { text: '标签', tone: 'neutral', size: 'md', rounded: false }
)
</script>

<template>
  <span class="badge" :class="[`badge--${tone}`, `badge--${size}`, { 'is-rounded': rounded }]">
    {{ text }}
  </span>
</template>

<style scoped lang="less">
.badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--rp-color-border);
  border-radius: 6px;
  background: var(--rp-color-surface);
  color: var(--rp-color-text);
  font-size: 13px;

  &--sm {
    height: 22px;
    padding: 0 8px;
    font-size: 12px;
  }

  &--md {
    height: 28px;
    padding: 0 12px;
  }

  &--neutral {
    border-color: var(--rp-color-border);
    color: var(--rp-color-text-muted);
  }

  &--success {
    border-color: color-mix(in srgb, var(--rp-color-success) 40%, transparent);
    background: color-mix(in srgb, var(--rp-color-success) 12%, transparent);
    color: var(--rp-color-success);
  }

  &--danger {
    border-color: color-mix(in srgb, var(--rp-color-danger) 40%, transparent);
    background: color-mix(in srgb, var(--rp-color-danger) 12%, transparent);
    color: var(--rp-color-danger);
  }

  &.is-rounded {
    border-radius: 999px;
  }
}
</style>
