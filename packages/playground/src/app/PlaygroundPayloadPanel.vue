<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { currentPayload, type SceneSnapshot } from '../payload/registry'
import CodeBlock from '../code/CodeBlock.vue'

defineProps<{ theme: 'light' | 'dark' }>()

const tab = ref<'input' | 'output'>('input')
const snapshot = ref<SceneSnapshot | null>(null)
const error = ref('')
let timer: number | null = null

const available = computed(() => {
  const payload = currentPayload.value
  return {
    input: typeof payload?.input === 'function',
    output: typeof payload?.output === 'function',
  }
})

const activeTab = computed<'input' | 'output'>(() => {
  if (available.value[tab.value]) return tab.value
  return available.value.input ? 'input' : 'output'
})

const read = (): void => {
  const payload = currentPayload.value
  const reader = payload?.[activeTab.value]
  if (typeof reader !== 'function') {
    snapshot.value = null
    error.value = ''
    return
  }
  try {
    snapshot.value = reader()
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    snapshot.value = null
  }
}

const text = computed(() => {
  if (error.value) return error.value
  if (!snapshot.value) return '（无数据）'
  try {
    return JSON.stringify(snapshot.value, null, 2)
  } catch {
    return String(snapshot.value)
  }
})

const start = (): void => {
  read()
  timer = window.setInterval(read, 400)
}

const stop = (): void => {
  if (timer !== null) window.clearInterval(timer)
  timer = null
}

watch([activeTab, () => currentPayload.value], () => read())
start()
onBeforeUnmount(stop)
</script>

<template>
  <aside class="pw-payload">
    <header class="pw-payload__head">
      <button
        type="button"
        class="pw-payload__tab"
        :class="{ 'is-active': activeTab === 'input' }"
        :disabled="!available.input"
        @click="tab = 'input'"
      >
        入参
      </button>
      <button
        type="button"
        class="pw-payload__tab"
        :class="{ 'is-active': activeTab === 'output' }"
        :disabled="!available.output"
        @click="tab = 'output'"
      >
        出参
      </button>
    </header>

    <div class="pw-payload__body">
      <CodeBlock :code="text" lang="json" />
    </div>
  </aside>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-payload {
  display: flex;
  flex-direction: column;
  width: 320px;
  flex: 0 0 320px;
  min-height: 0;
  border-left: 1px solid var(--rp-color-border);
  background: var(--rp-color-bg);
}

.pw-payload__head {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  flex: 0 0 36px;
  padding: 0 8px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-payload__tab {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: calc(var(--rp-radius) - 4px);
  background: transparent;
  color: var(--rp-color-text-muted);
  font-size: 12px;
  cursor: pointer;
  .pw-transition();

  &:hover:not(:disabled) {
    color: var(--rp-color-text);
    background: color-mix(in srgb, var(--rp-color-text-muted) 10%, transparent);
  }

  &.is-active {
    background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
    color: var(--rp-color-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    .pw-focus-ring(-1px);
  }
}

.pw-payload__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
