<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronRight, Copy, FileCode2, SquareArrowOutUpRight } from '@lucide/vue'
import CodeBlock from '../code/CodeBlock.vue'
import { copyPath, editorEnabled, editorLabel, openInEditor } from '../code/openInEditor'
import { copyText } from '../code/clipboard'
import { toast } from '../components/toast'
import type { SceneDescriptor } from '../types'

const props = defineProps<{ scene: SceneDescriptor }>()

const open = ref(false)
const activeIndex = ref(0)
const cache = new Map<string, string>()
const codes = ref<Record<string, string>>({})
const loading = ref(false)
const copied = ref(false)

const sources = computed(() => props.scene.sources)
const active = computed(() => sources.value[activeIndex.value] ?? sources.value[0])
const fileName = computed(() => active.value?.rel.split('/').pop() ?? '')
const lang = computed(() => (fileName.value.endsWith('.ts') ? 'ts' : 'vue'))
const code = computed(() => (active.value ? (codes.value[active.value.rel] ?? '') : ''))

/** 首次展开或切 Tab 时才读源码 */
const load = async (rel: string): Promise<void> => {
  if (codes.value[rel]) return
  const source = sources.value.find((item) => item.rel === rel)
  if (!source) return
  loading.value = true
  try {
    const raw = cache.get(rel) ?? (await source.raw())
    cache.set(rel, raw)
    codes.value = { ...codes.value, [rel]: raw }
  } catch {
    codes.value = { ...codes.value, [rel]: '// 源码读取失败' }
  } finally {
    loading.value = false
  }
}

const toggle = async (): Promise<void> => {
  open.value = !open.value
  if (open.value && active.value) await load(active.value.rel)
}

const selectTab = async (index: number): Promise<void> => {
  activeIndex.value = index
  if (open.value && active.value) await load(active.value.rel)
}

const copy = async (): Promise<void> => {
  if (!code.value) return
  const ok = await copyText(code.value)
  if (!ok) {
    toast('复制失败')
    return
  }
  copied.value = true
  toast(`已复制 ${fileName.value}`)
  window.setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <section class="pw-source" :class="{ 'is-open': open }">
    <header class="pw-source__head">
      <button type="button" class="pw-source__toggle" @click="toggle">
        <ChevronRight :size="14" class="pw-source__chevron" />
        <FileCode2 :size="14" class="pw-source__icon" />
        <span class="pw-source__label">源码</span>
        <span class="pw-source__file">{{ fileName }}</span>
      </button>

      <div class="pw-source__actions">
        <button type="button" class="pw-source__action" :title="copied ? '已复制' : '复制源码'" @click="copy">
          <Check v-if="copied" :size="14" />
          <Copy v-else :size="14" />
        </button>
        <button
          v-if="editorEnabled()"
          type="button"
          class="pw-source__action"
          :title="`用 ${editorLabel()} 打开`"
          @click="openInEditor(active?.rel ?? scene.rel)"
        >
          <SquareArrowOutUpRight :size="14" :stroke-width="2" />
        </button>
        <button v-else type="button" class="pw-source__action" title="复制文件路径" @click="copyPath(scene.rel)">
          <SquareArrowOutUpRight :size="14" :stroke-width="2" />
        </button>
      </div>
    </header>

    <div v-if="open" class="pw-source__body">
      <div v-if="sources.length > 1" class="pw-source__tabs">
        <button
          v-for="(source, index) in sources"
          :key="source.rel"
          type="button"
          class="pw-source__tab"
          :class="{ 'is-active': index === activeIndex }"
          @click="selectTab(index)"
        >
          {{ source.rel.split('/').pop() }}
        </button>
      </div>

      <div class="pw-source__code">
        <p v-if="loading" class="pw-source__hint">读取中…</p>
        <CodeBlock v-else-if="code" :code="code" :lang="lang" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.pw-source {
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
    min-height: 32px;
    padding: 0 8px 0 4px;
  }

  &__toggle {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: var(--rp-color-text);
    }
  }

  &__chevron {
    flex: 0 0 auto;
    transition: transform 0.15s ease;

    .pw-source.is-open & {
      transform: rotate(90deg);
    }
  }

  &__icon {
    flex: 0 0 auto;
  }

  &__label {
    flex: 0 0 auto;
  }

  &__file {
    overflow: hidden;
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 2px;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--rp-color-text-muted);
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--rp-color-text-muted) 12%, transparent);
      color: var(--rp-color-primary);
    }
  }

  &__body {
    border-top: 1px solid var(--rp-color-border);
  }

  &__tabs {
    display: flex;
    gap: 2px;
    padding: 6px 8px 0;
    overflow-x: auto;
  }

  &__tab {
    padding: 3px 10px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 6px 6px 0 0;
    background: transparent;
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
    cursor: pointer;
    white-space: nowrap;

    &.is-active {
      border-color: var(--rp-color-border);
      background: var(--rp-color-bg);
      color: var(--rp-color-text);
    }
  }

  &__code {
    max-height: 420px;
    overflow: auto;
    counter-reset: pw-line;

    :deep(.line) {
      display: inline-block;
      width: 100%;

      &::before {
        counter-increment: pw-line;
        content: counter(pw-line);
        display: inline-block;
        width: 2.2em;
        margin-right: 0.9em;
        padding-right: 0.6em;
        color: var(--rp-color-text-muted);
        opacity: 0.55;
        text-align: right;
        user-select: none;
      }
    }
  }

  &__hint {
    margin: 0;
    padding: 12px;
    color: var(--rp-color-text-muted);
    font-size: 12px;
  }
}
</style>
