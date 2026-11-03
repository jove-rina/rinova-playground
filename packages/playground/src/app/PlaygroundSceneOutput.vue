<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CodeBlock from '../code/CodeBlock.vue'
import { currentOutputSlots } from '../payload/output'

const props = defineProps<{ sceneName: string; theme: 'light' | 'dark' }>()

const slots = computed(() =>
  currentOutputSlots.value.filter((slot) => !slot.sceneId || slot.sceneId === props.sceneName)
)

const active = ref(0)
const snapshots = ref<Array<{ label: string; text: string }>>([])
let timer: number | null = null

const read = (): void => {
  snapshots.value = slots.value.map((binding) => {
    try {
      const value = binding.getter()
      return { label: binding.label || binding.key, text: JSON.stringify(value, null, 2) ?? String(value) }
    } catch (error) {
      return { label: binding.label || binding.key, text: `读取失败：${String(error)}` }
    }
  })
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
  <details v-if="slots.length" class="pw-output">
    <summary>出参 · {{ slots.length }} 个槽位</summary>

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

    <CodeBlock v-if="snapshots[active]" :code="snapshots[active]!.text" lang="json" />
  </details>
</template>

<style scoped lang="less">
.pw-output {
  font-size: 12px;

  summary {
    cursor: pointer;
    color: var(--rp-color-text-muted);

    &:hover {
      color: var(--rp-color-text);
    }
  }

  &__tabs {
    display: flex;
    gap: 4px;
    margin: 8px 0 6px;
  }

  &__tab {
    padding: 2px 8px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font-size: 11.5px;
    cursor: pointer;

    &.is-active {
      border-color: var(--rp-color-primary);
      color: var(--rp-color-primary);
    }
  }
}
</style>
