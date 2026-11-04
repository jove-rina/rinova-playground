<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw } from '@lucide/vue'
import PwInput from '../components/PwInput.vue'
import PwSwitch from '../components/PwSwitch.vue'
import { currentArgsSlots, type SceneArgs, type SceneArgsBinding } from '../payload/args'

const props = defineProps<{ sceneName: string }>()

/** 只显示本场景声明的输入槽位 */
const slots = computed(() =>
  currentArgsSlots.value.filter((slot) => !slot.sceneId || slot.sceneId === props.sceneName)
)

const multiSlot = computed(() => slots.value.length > 1)

interface Field {
  key: string
  value: unknown
  label: string
  kind: 'boolean' | 'number' | 'string'
  options?: Array<string | number>
}

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
</script>

<template>
  <div v-if="slots.length" class="pw-args">
    <header class="pw-args__head">
      <span class="pw-args__title">输入</span>
      <button
        v-if="!multiSlot && slots[0]"
        type="button"
        class="pw-args__reset"
        title="恢复默认值"
        @click="resetSlot(slots[0])"
      >
        <RotateCcw :size="12" />
      </button>
    </header>

    <section v-for="binding in slots" :key="`${binding.sceneId}:${binding.key}`" class="pw-args__slot">
      <header v-if="multiSlot" class="pw-args__slot-head">
        <span class="pw-args__slot-name">{{ binding.label || binding.key }}</span>
        <button type="button" class="pw-args__reset" title="只恢复这一块" @click="resetSlot(binding)">
          <RotateCcw :size="12" />
        </button>
      </header>

      <div class="pw-args__grid">
        <div v-for="field in fieldsOf(binding)" :key="field.key" class="pw-args__field">
          <label class="pw-args__label" :title="field.key">{{ field.label }}</label>

          <PwSwitch
            v-if="field.kind === 'boolean'"
            :model-value="field.value === true"
            @update:model-value="setValue(binding, field.key, $event)"
          />

          <select
            v-else-if="field.options"
            class="pw-args__select"
            :value="String(field.value)"
            @change="setString(binding, field.key, ($event.target as HTMLSelectElement).value)"
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
                ? setNumber(binding, field.key, $event)
                : setString(binding, field.key, $event)
            "
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.pw-args {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
  background: var(--rp-color-surface);
}

.pw-args__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pw-args__title {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
  font-weight: 600;
}

.pw-args__reset {
  margin-left: auto;
}

.pw-args__slot + .pw-args__slot {
  padding-top: 10px;
  border-top: 1px dashed var(--rp-color-border);
}

.pw-args__slot-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.pw-args__slot-name {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
  font-weight: 600;
}

.pw-args__reset {
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;

  &:hover {
    color: var(--rp-color-primary);
  }
}

.pw-args__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px 20px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pw-args__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pw-args__label {
  overflow: hidden;
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-args__select {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--rp-color-border);
  border-radius: 6px;
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  font-family: inherit;
  font-size: 12px;
}
</style>
