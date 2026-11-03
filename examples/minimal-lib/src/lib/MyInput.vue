<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 输入框的值（v-model） */
    modelValue?: string
    /** 占位文案 */
    placeholder?: string
    /** 禁用：灰底且不可输入 */
    disabled?: boolean
    /** 高度档位：sm 28px / md 34px */
    size?: 'sm' | 'md'
    /** 有值时显示清空按钮 */
    clearable?: boolean
    /** 字数上限，超出截断 */
    maxlength?: number
  }>(),
  { modelValue: '', placeholder: '', disabled: false, size: 'md', clearable: false }
)

const emit = defineEmits<{
  /** 值变化（v-model 用） */
  'update:modelValue': [value: string]
  /** 聚焦 */
  focus: [event: FocusEvent]
  /** 失焦 */
  blur: [event: FocusEvent]
  /** 回车时带上当前值 */
  enter: [value: string]
  /** 点清空按钮 */
  clear: []
}>()

defineSlots<{
  /** 输入框左侧（图标、货币符号等） */
  prefix?: () => unknown
  /** 输入框右侧（单位、快捷键提示等） */
  suffix?: () => unknown
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const hasValue = computed(() => props.modelValue.length > 0)

const onInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const clear = (): void => {
  emit('update:modelValue', '')
  emit('clear')
  inputEl.value?.focus()
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') emit('enter', props.modelValue)
}

interface MyInputExpose {
  /** 让输入框获得焦点 */
  focus: () => void
  /** 选中输入框里的全部文字 */
  select: () => void
  /** 清空并重新聚焦 */
  clear: () => void
  /** 原生 input 元素 */
  element: HTMLInputElement | null
}

defineExpose<MyInputExpose>({
  focus: (): void => inputEl.value?.focus(),
  select: (): void => inputEl.value?.select(),
  clear,
  element: inputEl as never,
})
</script>

<template>
  <label class="my-input" :class="[`my-input--${size}`, { 'is-disabled': disabled }]">
    <span v-if="$slots.prefix" class="my-input__affix"><slot name="prefix" /></span>
    <input
      ref="inputEl"
      class="my-input__control"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      @input="onInput"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button
      v-if="clearable && hasValue && !disabled"
      type="button"
      class="my-input__clear"
      title="清空"
      @click.prevent="clear"
    >
      ×
    </button>
    <span v-if="$slots.suffix" class="my-input__affix"><slot name="suffix" /></span>
  </label>
</template>

<style scoped lang="less">
.my-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 240px;
  max-width: 100%;
  padding: 0 10px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: #2f6feb;
    box-shadow: 0 0 0 3px rgb(47 111 235 / 12%);
  }

  &.is-disabled {
    background: #f5f7fa;
    opacity: 0.7;
  }
}

.my-input--sm {
  height: 28px;
  font-size: 12px;
}

.my-input--md {
  height: 34px;
  font-size: 13px;
}

.my-input__control {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #1c2024;
  font: inherit;
  outline: none;

  &::placeholder {
    color: #98a2b3;
  }
}

.my-input__affix {
  display: inline-flex;
  align-items: center;
  color: #98a2b3;
  font-size: 12px;
}

.my-input__clear {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #e4e7ec;
  color: #667085;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: #d0d5dd;
  }
}
</style>
