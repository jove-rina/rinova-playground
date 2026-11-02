<script setup lang="ts">
import { toastState } from './toast'
</script>

<template>
  <Teleport to="body">
    <div class="pw-toast-host" role="status" aria-live="polite">
      <TransitionGroup name="pw-toast">
        <div
          v-for="item in toastState"
          :key="item.id"
          class="pw-toast"
          :class="`pw-toast--${item.type}`"
        >
          {{ item.text }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-toast-host {
  position: fixed;
  left: 50%;
  bottom: 32px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.pw-toast {
  padding: 8px 14px;
  border: 1px solid var(--rp-color-border);
  border-left: 3px solid var(--rp-color-primary);
  border-radius: var(--rp-radius);
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  font-size: 13px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--rp-color-text) 14%, transparent);
}

.pw-toast--success {
  border-left-color: var(--rp-color-success);
}

.pw-toast--warning {
  border-left-color: var(--rp-color-warning);
}

.pw-toast--error {
  border-left-color: var(--rp-color-danger);
}

.pw-toast-enter-active,
.pw-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.pw-toast-enter-from,
.pw-toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
