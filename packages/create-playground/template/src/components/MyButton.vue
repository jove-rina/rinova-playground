<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'ghost'
    disabled?: boolean
    loading?: boolean
  }>(),
  { size: 'md', variant: 'primary', disabled: false, loading: false }
)
</script>

<template>
  <button
    class="my-btn"
    :class="[`my-btn--${size}`, `my-btn--${variant}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    type="button"
  >
    <span v-if="loading" class="my-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped lang="less">
@accent: #2f6feb;
@accent-dark: #2560d1;
@border: #d0d5dd;
@text: #1c2024;

.my-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &--sm {
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
  }

  &--md {
    height: 32px;
    padding: 0 14px;
    font-size: 13px;
  }

  &--lg {
    height: 40px;
    padding: 0 18px;
    font-size: 14px;
  }

  &--primary {
    background: @accent;
    color: #fff;

    &:hover:not(:disabled) {
      background: @accent-dark;
    }
  }

  &--ghost {
    border-color: @border;
    background: #fff;
    color: @text;

    &:hover:not(:disabled) {
      border-color: @accent;
      color: @accent;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.my-btn__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: my-spin 0.7s linear infinite;
}

@keyframes my-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
