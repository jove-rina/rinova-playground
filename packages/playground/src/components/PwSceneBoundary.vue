<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

/** 场景错误边界：一个场景抛错只替换这一块，整页与其它场景继续可用 */
const props = defineProps<{ title?: string; file?: string }>()

const message = ref('')
const stack = ref('')

onErrorCaptured((error: unknown) => {
  message.value = error instanceof Error ? error.message : String(error)
  stack.value = error instanceof Error ? (error.stack ?? '') : ''
  return false
})
</script>

<template>
  <div v-if="!message" class="pw-boundary">
    <slot />
  </div>
  <div v-else class="pw-boundary pw-boundary--error" role="alert">
    <p class="pw-boundary__head">场景渲染失败{{ props.title ? `：${props.title}` : '' }}</p>
    <p class="pw-boundary__message">{{ message }}</p>
    <p v-if="props.file" class="pw-boundary__file">{{ props.file }}</p>
    <details v-if="stack" class="pw-boundary__stack">
      <summary>调用栈</summary>
      <pre>{{ stack }}</pre>
    </details>
  </div>
</template>

<style scoped lang="less">
.pw-boundary {
  display: contents;

  &--error {
    display: block;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--rp-color-danger) 45%, transparent);
    border-radius: var(--rp-radius);
    background: color-mix(in srgb, var(--rp-color-danger) 8%, transparent);
  }

  &__head {
    margin: 0 0 6px;
    color: var(--rp-color-danger);
    font-size: 13px;
    font-weight: 600;
  }

  &__message {
    margin: 0 0 6px;
    font-family: var(--rp-font-mono);
    font-size: 12px;
    word-break: break-word;
  }

  &__file {
    margin: 0 0 8px;
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }

  &__stack {
    font-size: 11.5px;

    summary {
      cursor: pointer;
      color: var(--rp-color-text-muted);
    }

    pre {
      max-height: 180px;
      margin: 6px 0 0;
      overflow: auto;
      font-family: var(--rp-font-mono);
      font-size: 11px;
      white-space: pre-wrap;
    }
  }
}
</style>
