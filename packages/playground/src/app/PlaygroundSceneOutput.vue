<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CodeBlock from '../code/CodeBlock.vue'
import { currentOutputSlots } from '../payload/output'

const props = defineProps<{ sceneName: string }>()

const slots = computed(() =>
  currentOutputSlots.value.filter((slot) => !slot.sceneId || slot.sceneId === props.sceneName)
)

const active = ref(0)
const snapshots = ref<Array<{ label: string; text: string }>>([])
let timer: number | null = null

const read = (): void => {
  const next = slots.value.map((binding) => {
    try {
      const value = binding.getter()
      return { label: binding.label || binding.key, text: JSON.stringify(value, null, 2) ?? String(value) }
    } catch (error) {
      return { label: binding.label || binding.key, text: `读取失败：${String(error)}` }
    }
  })
  // 内容没变就不替换：否则每 500ms 触发一次 shiki 重高亮，面板会一直闪「高亮中」
  const changed =
    next.length !== snapshots.value.length ||
    next.some((item, index) => item.text !== snapshots.value[index]?.text || item.label !== snapshots.value[index]?.label)
  if (changed) snapshots.value = next
  if (active.value >= snapshots.value.length) active.value = 0
}

onMounted(() => {
  read()
  timer = window.setInterval(read, 500)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <section v-if="slots.length" class="pw-output">
    <header class="pw-output__head">
      <span class="pw-output__title">输出</span>
      <div v-if="snapshots.length > 1" class="pw-output__tabs">
        <button
          v-for="(item, index) in snapshots"
          :key="item.label"
          type="button"
          class="pw-output__tab"
          :class="{ 'is-active': index === active }"
          @click="active = index"
        >
          {{ item.label }}
        </button>
      </div>
      <span v-else-if="snapshots[0]?.label && snapshots[0]?.label !== 'default'" class="pw-output__slot">
        {{ snapshots[0]?.label }}
      </span>
    </header>

    <div class="pw-output__body">
      <CodeBlock v-if="snapshots[active]" :code="snapshots[active]!.text" lang="json" />
    </div>
  </section>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-output {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--rp-color-border);
  border-radius: var(--rp-radius);
  overflow: hidden;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--rp-color-border);
    background: var(--rp-color-surface);
  }

  &__title {
    color: var(--rp-color-text-muted);
    font-size: 11.5px;
    font-weight: 600;
  }

  &__slot {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11px;
  }

  &__tabs {
    display: flex;
    gap: 4px;
  }

  &__tab {
    padding: 1px 8px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font-size: 11px;
    cursor: pointer;

    &.is-active {
      border-color: var(--rp-color-primary);
      color: var(--rp-color-primary);
    }
  }

  &__body {
    max-height: 260px;
    overflow: auto;
    .pw-scrollbar();
  }
}
</style>
