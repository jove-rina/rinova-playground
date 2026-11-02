<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    clearable?: boolean
    size?: 'sm' | 'md'
    autofocus?: boolean
  }>(),
  { modelValue: '', clearable: true, size: 'md', autofocus: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  keydown: [event: KeyboardEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const inputRef = ref<HTMLInputElement>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function clear() {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="pw-input" :class="`pw-input--${size}`" :data-empty="!props.modelValue">
    <slot name="prefix" />
    <input
      ref="inputRef"
      class="pw-input__field"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :autofocus="autofocus"
      @input="onInput"
      @keydown="$emit('keydown', $event)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />
    <button
      v-if="clearable && modelValue"
      class="pw-input__clear"
      type="button"
      title="清空"
      @click="clear"
    >
      ×
    </button>
    <slot name="suffix" />
  </div>
</template>

<style scoped>
.pw-input {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 0 8px;
  border: 1px solid var(--rp-color-border);
  border-radius: calc(var(--rp-radius) - 2px);
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pw-input--sm {
  height: 26px;
}

.pw-input--md {
  height: 32px;
}

.pw-input:focus-within {
  border-color: var(--rp-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rp-color-primary) 16%, transparent);
}

.pw-input__field {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.pw-input__field::placeholder {
  color: var(--rp-color-text-muted);
}

.pw-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--rp-color-text-muted) 20%, transparent);
  color: var(--rp-color-text-muted);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.pw-input__clear:hover {
  color: var(--rp-color-text);
}
</style>
