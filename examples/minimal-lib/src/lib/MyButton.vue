<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'ghost'
    disabled?: boolean
  }>(),
  { size: 'md', variant: 'primary', disabled: false }
)
</script>

<template>
  <button
    class="my-btn"
    :class="[`my-btn--${size}`, `my-btn--${variant}`]"
    :disabled="disabled"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.my-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #2f6feb;
  color: #fff;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.my-btn--sm {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.my-btn--md {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}

.my-btn--lg {
  height: 40px;
  padding: 0 18px;
  font-size: 14px;
}

.my-btn--primary:hover:not(:disabled) {
  background: #2560d1;
}

.my-btn--ghost {
  border-color: #d0d5dd;
  background: #fff;
  color: #1c2024;
}

.my-btn--ghost:hover:not(:disabled) {
  border-color: #2f6feb;
  color: #2f6feb;
}

.my-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
