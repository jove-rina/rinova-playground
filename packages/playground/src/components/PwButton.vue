<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'text'
    size?: 'sm' | 'md'
    disabled?: boolean
    loading?: boolean
    title?: string
  }>(),
  { variant: 'ghost', size: 'md', disabled: false, loading: false }
)
</script>

<template>
  <button
    class="pw-btn"
    :class="[`pw-btn--${variant}`, `pw-btn--${size}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    :title="title"
    type="button"
  >
    <span v-if="loading" class="pw-btn__spinner" aria-hidden="true" />
    <slot v-else name="icon" />
    <span v-if="$slots.default" class="pw-btn__label"><slot /></span>
  </button>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: calc(var(--rp-radius) - 2px);
  background: transparent;
  color: var(--rp-color-text);
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
  .pw-transition();
}

.pw-btn--sm {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
}

.pw-btn--md {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.pw-btn--primary {
  background: var(--rp-color-primary);
  color: var(--rp-color-primary-contrast);
}

.pw-btn--primary:hover:not(:disabled) {
  filter: brightness(1.06);
}

.pw-btn--ghost {
  border-color: var(--rp-color-border);
  background: var(--rp-color-bg);
  color: var(--rp-color-text-muted);
}

.pw-btn--ghost:hover:not(:disabled) {
  border-color: var(--rp-color-primary);
  color: var(--rp-color-text);
}

.pw-btn--text:hover:not(:disabled) {
  background: color-mix(in srgb, var(--rp-color-primary) 10%, transparent);
  color: var(--rp-color-text);
}

.pw-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.pw-btn:focus-visible {
  .pw-focus-ring();
}

.pw-btn__label {
  line-height: 1;
}

.pw-btn__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: pw-spin 0.7s linear infinite;
}

@keyframes pw-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
