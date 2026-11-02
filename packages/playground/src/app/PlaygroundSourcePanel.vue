<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Copy, RotateCcw, X } from '@lucide/vue'
import config from 'virtual:playground/config'
import PwButton from '../components/PwButton.vue'
import { toast } from '../components/toast'
import CodeBlock from '../code/CodeBlock.vue'
import CodeEditor from '../code/CodeEditor.vue'
import { langFromFile } from '../code/monaco'
import type { SceneDescriptor } from '../types'

const props = defineProps<{
  scene: SceneDescriptor
  theme: 'light' | 'dark'
}>()

defineEmits<{ close: [] }>()

const activeIndex = ref(0)
const text = ref('')
const original = ref('')
const loading = ref(true)
const failed = ref(false)
const editing = ref(false)
const copied = ref(false)
const cache = new Map<string, string>()

const viewer = config.codeViewer ?? 'monaco'

const active = computed(() => props.scene.sources[activeIndex.value] ?? props.scene.sources[0])

const fileName = (file: string): string => file.split('/').pop() ?? file

const dirty = computed(() => editing.value && text.value !== original.value)

const load = async (index: number): Promise<void> => {
  const source = props.scene.sources[index]
  if (!source) return
  loading.value = true
  try {
    const cached = cache.get(source.rel)
    const content = cached ?? (await source.raw())
    cache.set(source.rel, content)
    text.value = content
    original.value = content
  } catch (error) {
    toast(`源码读取失败：${error instanceof Error ? error.message : String(error)}`, 'error')
    text.value = ''
    original.value = ''
  } finally {
    loading.value = false
  }
}

watch(
  () => props.scene,
  () => {
    activeIndex.value = 0
    editing.value = false
    void load(0)
  },
  { immediate: true }
)

const select = (index: number): void => {
  if (index === activeIndex.value) return
  activeIndex.value = index
  editing.value = false
  void load(index)
}

const toggleEdit = (): void => {
  editing.value = !editing.value
  if (!editing.value) text.value = original.value
}

const reset = (): void => {
  text.value = original.value
  toast('已还原为原始源码', 'info')
}

const copy = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = true
    toast('已复制源码', 'success')
    window.setTimeout(() => (copied.value = false), 1500)
  } catch {
    toast('复制失败，请手动选择', 'error')
  }
}
</script>

<template>
  <section class="pw-source">
    <header class="pw-source__head">
      <div class="pw-source__tabs">
        <button
          v-for="(source, index) in scene.sources"
          :key="source.rel"
          type="button"
          class="pw-tab"
          :class="{ 'is-active': index === activeIndex }"
          :title="source.rel"
          @click="select(index)"
        >
          {{ fileName(source.rel) }}
        </button>
        <span v-if="dirty" class="pw-source__dirty">已修改</span>
      </div>

      <div class="pw-source__actions">
        <PwButton v-if="viewer === 'monaco' && !failed" size="sm" variant="text" :title="editing ? '切回只读' : '编辑（改动不会写入磁盘）'" @click="toggleEdit">
          {{ editing ? '只读' : '编辑' }}
        </PwButton>
        <PwButton v-if="dirty" size="sm" variant="text" title="还原" @click="reset">
          <template #icon><RotateCcw :size="13" /></template>
        </PwButton>
        <PwButton size="sm" variant="text" :title="copied ? '已复制' : '复制源码'" @click="copy">
          <template #icon>
            <Check v-if="copied" :size="13" />
            <Copy v-else :size="13" />
          </template>
        </PwButton>
        <PwButton size="sm" variant="text" title="关闭（Esc）" @click="$emit('close')">
          <template #icon><X :size="13" /></template>
        </PwButton>
      </div>
    </header>

    <div class="pw-source__body">
      <span v-if="loading" class="pw-source__hint">读取源码中…</span>
      <template v-else-if="active">
        <CodeEditor
          v-if="viewer === 'monaco' && !failed"
          v-model="text"
          :filename="active.rel"
          :read-only="!editing"
          :theme="theme"
          @fail="failed = true"
        />
        <CodeBlock v-else :code="text" :lang="langFromFile(active.rel)" />
      </template>
    </div>
  </section>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-source {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.pw-source__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 36px;
  flex: 0 0 36px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-source__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
}

.pw-tab {
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: calc(var(--rp-radius) - 4px);
  background: transparent;
  color: var(--rp-color-text-muted);
  font-family: var(--rp-font-mono);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  .pw-transition();

  &:hover {
    color: var(--rp-color-text);
    background: color-mix(in srgb, var(--rp-color-text-muted) 10%, transparent);
  }

  &.is-active {
    background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
    color: var(--rp-color-primary);
  }

  &:focus-visible {
    .pw-focus-ring(-1px);
  }
}

.pw-source__dirty {
  margin-left: 4px;
  color: var(--rp-color-warning);
  font-size: 11px;
}

.pw-source__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.pw-source__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pw-source__hint {
  display: block;
  padding: 16px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}
</style>
