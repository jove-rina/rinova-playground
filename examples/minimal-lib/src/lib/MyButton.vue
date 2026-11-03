<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'ghost'
    disabled?: boolean
    loading?: boolean
    /** 只放图标：宽度收成正方形，内容从 icon 插槽来 */
    iconOnly?: boolean
    /** 撑满父容器 */
    block?: boolean
    /** 胶囊形圆角 */
    pill?: boolean
    /** 原生 type */
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    size: 'md',
    variant: 'primary',
    disabled: false,
    loading: false,
    iconOnly: false,
    block: false,
    pill: false,
    type: 'button',
  }
)

const emit = defineEmits<{
  /** 原生点击；同时会触发一次 press */
  click: [event: MouseEvent]
  /** 业务级事件：点击时把 variant 传出去，用来看 emit 参数 */
  press: [variant: string, event: MouseEvent]
}>()

const rootEl = ref<HTMLButtonElement | null>(null)

const onClick = (event: MouseEvent): void => {
  emit('click', event)
  emit('press', props.variant, event)
}

defineExpose({
  focus: (): void => rootEl.value?.focus(),
  blur: (): void => rootEl.value?.blur(),
  element: rootEl,
})
</script>

<template>
  <button
    ref="rootEl"
    class="my-btn"
    :class="[
      `my-btn--${size}`,
      `my-btn--${variant}`,
      { 'my-btn--icon': iconOnly, 'my-btn--block': block, 'my-btn--pill': pill },
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="onClick"
  >
    <span v-if="loading" class="my-btn__spinner" aria-hidden="true" />
    <span v-else-if="$slots.icon" class="my-btn__icon"><slot name="icon" /></span>
    <span v-if="!iconOnly" class="my-btn__label"><slot /></span>
  </button>
</template>

<style scoped lang="less">
.my-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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

.my-btn--icon {
  padding: 0;
  aspect-ratio: 1;
}

.my-btn--sm.my-btn--icon {
  width: 26px;
}

.my-btn--md.my-btn--icon {
  width: 32px;
}

.my-btn--lg.my-btn--icon {
  width: 40px;
}

.my-btn--block {
  width: 100%;
}

.my-btn--pill {
  border-radius: 999px;
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

.my-btn__icon {
  display: inline-flex;
  align-items: center;
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
