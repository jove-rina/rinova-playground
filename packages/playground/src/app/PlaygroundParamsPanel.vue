<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RotateCcw } from '@lucide/vue'
import PwButton from '../components/PwButton.vue'
import PwInput from '../components/PwInput.vue'
import PwSwitch from '../components/PwSwitch.vue'
import CodeBlock from '../code/CodeBlock.vue'
import {
  currentArgsSlots,
  type SceneArgs,
  type SceneArgsBinding,
} from '../payload/args'
import { currentOutputSlots, type SceneOutputBinding } from '../payload/output'

const props = defineProps<{ theme: 'light' | 'dark'; sceneName?: string }>()

const tab = ref<'args' | 'output'>('args')
const snapshots = ref<Array<{ label: string; text: string }>>([])
let timer: number | null = null

/** 页内所有场景都挂着，面板只显示当前可见场景的槽位 */
const belongsToActive = (sceneId: string): boolean =>
  !props.sceneName || !sceneId || sceneId === props.sceneName

const argsSlots = computed(() => currentArgsSlots.value.filter((slot) => belongsToActive(slot.sceneId)))
const outputSlots = computed(() =>
  currentOutputSlots.value.filter((slot) => belongsToActive(slot.sceneId))
)

const hasArgs = computed(() => argsSlots.value.length > 0)
const hasOutput = computed(() => outputSlots.value.length > 0)
/** 多槽位（一个场景多个 demo）时，每块都加小标题 */
const multiSlot = computed(() => argsSlots.value.length > 1 || outputSlots.value.length > 1)

const activeTab = computed<'args' | 'output'>(() => {
  if (tab.value === 'args' && hasArgs.value) return 'args'
  if (tab.value === 'output' && hasOutput.value) return 'output'
  return hasArgs.value ? 'args' : 'output'
})

interface Field {
  key: string
  value: unknown
  label: string
  kind: 'boolean' | 'number' | 'string'
  options?: Array<string | number>
}

/** 表单字段：按值的类型决定控件 */
const fieldsOf = (binding: SceneArgsBinding): Field[] =>
  Object.entries(binding.values).map(([key, value]) => ({
    key,
    value,
    label: binding.options.labels?.[key] ?? key,
    kind: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
    options: binding.options.options?.[key],
  }))

const setValue = (binding: SceneArgsBinding, key: string, value: unknown): void => {
  ;(binding.values as SceneArgs)[key] = value
}

const setString = (binding: SceneArgsBinding, key: string, raw: string): void =>
  setValue(binding, key, raw)
const setNumber = (binding: SceneArgsBinding, key: string, raw: string): void => {
  const parsed = Number(raw)
  setValue(binding, key, Number.isFinite(parsed) ? parsed : 0)
}

const resetSlot = (binding: SceneArgsBinding): void => {
  for (const [key, value] of Object.entries(binding.defaults)) {
    ;(binding.values as SceneArgs)[key] = value
  }
}
const resetAll = (): void => {
  argsSlots.value.forEach(resetSlot)
}

const readOutput = (): void => {
  snapshots.value = outputSlots.value.map((binding: SceneOutputBinding) => {
    try {
      const value = binding.getter()
      return {
        label: binding.label || binding.key,
        text: JSON.stringify(value, null, 2) ?? String(value),
      }
    } catch (err) {
      return {
        label: binding.label || binding.key,
        text: err instanceof Error ? err.message : String(err),
      }
    }
  })
}

const startPolling = (): void => {
  readOutput()
  timer = window.setInterval(readOutput, 400)
}

watch(activeTab, (value) => {
  if (value === 'output') readOutput()
})

startPolling()
onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <aside class="pw-params">
    <header class="pw-params__head">
      <button
        type="button"
        class="pw-params__tab"
        :class="{ 'is-active': activeTab === 'args' }"
        :disabled="!hasArgs"
        @click="tab = 'args'"
      >
        入参
      </button>
      <button
        type="button"
        class="pw-params__tab"
        :class="{ 'is-active': activeTab === 'output' }"
        :disabled="!hasOutput"
        @click="tab = 'output'"
      >
        出参
      </button>
      <span class="pw-params__spacer" />
      <PwButton v-if="activeTab === 'args' && hasArgs" size="sm" variant="text" title="恢复默认值" @click="resetAll">
        <template #icon><RotateCcw :size="13" /></template>
      </PwButton>
    </header>

    <div class="pw-params__body">
      <div v-if="activeTab === 'args'" class="pw-params__slots">
        <section v-for="slot in argsSlots" :key="`${slot.key}:${slot.label}`" class="pw-slot">
          <header v-if="multiSlot" class="pw-slot__head">
            <span class="pw-slot__name">{{ slot.label || slot.key }}</span>
            <PwButton size="sm" variant="text" title="只恢复这一块" @click="resetSlot(slot)">
              <template #icon><RotateCcw :size="12" /></template>
            </PwButton>
          </header>
          <div class="pw-form">
            <div v-for="field in fieldsOf(slot)" :key="field.key" class="pw-form__row">
              <label class="pw-form__label" :title="field.key">{{ field.label }}</label>

              <PwSwitch
                v-if="field.kind === 'boolean'"
                :model-value="field.value === true"
                @update:model-value="setValue(slot, field.key, $event)"
              />

              <select
                v-else-if="field.options"
                class="pw-form__select"
                :value="String(field.value)"
                @change="setString(slot, field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="option in field.options" :key="String(option)" :value="String(option)">
                  {{ option }}
                </option>
              </select>

              <PwInput
                v-else
                size="sm"
                :type="field.kind === 'number' ? 'number' : 'text'"
                :model-value="String(field.value ?? '')"
                @update:model-value="
                  field.kind === 'number'
                    ? setNumber(slot, field.key, $event)
                    : setString(slot, field.key, $event)
                "
              />
            </div>

            <p v-if="!fieldsOf(slot).length" class="pw-params__hint">这一块没有声明入参</p>
          </div>
        </section>

        <p v-if="!argsSlots.length" class="pw-params__hint pw-params__hint--empty">
          该场景没有声明入参
        </p>
      </div>

      <div v-else class="pw-params__slots">
        <section v-for="item in snapshots" :key="item.label" class="pw-slot pw-slot--output">
          <header v-if="multiSlot" class="pw-slot__head">
            <span class="pw-slot__name">{{ item.label }}</span>
          </header>
          <CodeBlock :code="item.text" lang="json" />
        </section>
        <p v-if="!snapshots.length" class="pw-params__hint pw-params__hint--empty">（无数据）</p>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-params {
  display: flex;
  flex-direction: column;
  width: 320px;
  flex: 0 0 320px;
  min-height: 0;
  border-left: 1px solid var(--rp-color-border);
  background: var(--rp-color-bg);
}

.pw-params__head {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  flex: 0 0 36px;
  padding: 0 8px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-params__spacer {
  flex: 1;
}

.pw-params__tab {
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

.pw-params__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.pw-params__slots {
  display: flex;
  flex-direction: column;
}

.pw-slot {
  border-bottom: 1px solid var(--rp-color-border);

  &:last-child {
    border-bottom: 0;
  }

  &--output {
    padding: 0;
  }
}

.pw-slot__head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px 0 12px;
  background: color-mix(in srgb, var(--rp-color-text-muted) 6%, transparent);
}

.pw-slot__name {
  flex: 1;
  overflow: hidden;
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.pw-form__row {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: center;
  gap: 10px;
}

.pw-form__label {
  overflow: hidden;
  color: var(--rp-color-text-muted);
  font-family: var(--rp-font-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-form__select {
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--rp-color-border);
  border-radius: calc(var(--rp-radius) - 2px);
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  font: inherit;
  font-size: 12px;

  &:focus-visible {
    .pw-focus-ring(0);
  }
}

.pw-params__hint {
  margin: 8px 0 0;
  color: var(--rp-color-text-muted);
  font-size: 12px;

  &--empty {
    padding: 12px;
    margin: 0;
  }
}
</style>
