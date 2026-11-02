<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean }>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="pw-switch"
    :class="{ 'is-on': modelValue }"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="pw-switch__thumb" />
  </button>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-switch {
  position: relative;
  width: 34px;
  height: 20px;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--rp-color-border);
  border-radius: 999px;
  background: var(--rp-color-surface);
  cursor: pointer;
  .pw-transition();

  &:focus-visible {
    .pw-focus-ring(2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.is-on {
    border-color: var(--rp-color-primary);
    background: var(--rp-color-primary);
  }
}

.pw-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--rp-color-bg);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--rp-color-text) 25%, transparent);
  transition: transform 0.16s ease;

  .pw-switch.is-on & {
    transform: translateX(14px);
  }
}
</style>
