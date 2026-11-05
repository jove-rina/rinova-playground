<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileCode2,
  FileSymlink,
  Search,
  SquareArrowOutUpRight,
  WholeWord,
  X,
} from '@lucide/vue'
import CodeBlock from '../code/CodeBlock.vue'
import { copyPath, editorEnabled, editorLabel, openInEditor } from '../code/openInEditor'
import { copyText } from '../code/clipboard'
import { toast } from '../components/toast'
import type { SceneDescriptor } from '../types'

const props = defineProps<{ scene: SceneDescriptor }>()

const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(0)
const cache = new Map<string, string>()
const codes = ref<Record<string, string>>({})
const loading = ref(false)
const copied = ref(false)
const pathCopied = ref(false)

const sources = computed(() => props.scene.sources)
const active = computed(() => sources.value[activeIndex.value] ?? sources.value[0])
const fileName = computed(() => active.value?.rel.split('/').pop() ?? '')
const lang = computed(() => {
  if (fileName.value.endsWith('.md')) return 'markdown'
  if (fileName.value.endsWith('.ts')) return 'ts'
  if (fileName.value.endsWith('.json')) return 'json'
  if (fileName.value.endsWith('.css')) return 'css'
  if (fileName.value.endsWith('.less')) return 'less'
  return 'vue'
})
const code = computed(() => (active.value ? (codes.value[active.value.rel] ?? '') : ''))

/* ---------------- 源码搜索 ---------------- */

const codeRef = ref<{ scrollToHit: (index: number) => void } | null>(null)
const findOpen = ref(false)
const findInput = ref<HTMLInputElement | null>(null)
const query = ref('')
/** 防抖后的关键字：真正传给 CodeBlock 的那个 */
const applied = ref('')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const total = ref(0)
const hitIndex = ref(-1)
let debounce = 0

const countText = computed(() => {
  if (!applied.value) return ''
  if (!total.value) return '无结果'
  return `${hitIndex.value + 1}/${total.value}`
})

const openFind = async (): Promise<void> => {
  if (!open.value) return
  findOpen.value = true
  await nextTick()
  findInput.value?.focus()
  findInput.value?.select()
}

const closeFind = (): void => {
  findOpen.value = false
  query.value = ''
  applied.value = ''
  total.value = 0
  hitIndex.value = -1
}

const toggleFind = (): void => {
  if (findOpen.value) closeFind()
  else void openFind()
}

watch(query, () => {
  window.clearTimeout(debounce)
  if (!query.value) {
    applied.value = ''
    total.value = 0
    hitIndex.value = -1
    return
  }
  debounce = window.setTimeout(() => {
    applied.value = query.value
  }, 120)
})

/** CodeBlock 报回匹配数：新结果从第一个开始，并滚到那里 */
const onCount = (value: number): void => {
  total.value = value
  hitIndex.value = value > 0 ? 0 : -1
  if (value > 0) void nextTick(() => codeRef.value?.scrollToHit(0))
}

const step = (delta: number): void => {
  if (!total.value) return
  hitIndex.value = (hitIndex.value + delta + total.value) % total.value
  void nextTick(() => codeRef.value?.scrollToHit(hitIndex.value))
}

const onFindKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') {
    event.preventDefault()
    step(event.shiftKey ? -1 : 1)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeFind()
  }
}

/** 卡片内有焦点时 ⌘/Ctrl+F 拦下来做源码搜索，不弹浏览器查找 */
const onWindowKeydown = (event: KeyboardEvent): void => {
  const meta = event.metaKey || event.ctrlKey
  if (!meta || event.key.toLowerCase() !== 'f') return
  if (!open.value || !rootEl.value) return
  const focused = document.activeElement
  if (!focused || !rootEl.value.contains(focused)) return
  event.preventDefault()
  void openFind()
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  window.clearTimeout(debounce)
})

/* ---------------- 源码读取 ---------------- */

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
  if (!open.value) closeFind()
  if (open.value && active.value) await load(active.value.rel)
}

const selectTab = async (index: number): Promise<void> => {
  activeIndex.value = index
  hitIndex.value = -1
  if (open.value && active.value) await load(active.value.rel)
}

const copy = async (): Promise<void> => {
  // 卡片折叠时源码还没读，先按需读一次再复制；不展开也不影响复制
  if (!code.value && active.value) await load(active.value.rel)
  if (!code.value) {
    toast('复制失败：源码还没读到')
    return
  }
  const ok = await copyText(code.value)
  if (!ok) {
    toast('复制失败')
    return
  }
  copied.value = true
  toast(`已复制 ${fileName.value}`)
  window.setTimeout(() => (copied.value = false), 1500)
}

/** 复制当前 Tab 对应文件的绝对路径（没配 root 时退回仓库相对路径） */
const copyFilePath = async (): Promise<void> => {
  await copyPath(active.value?.rel ?? props.scene.rel)
  pathCopied.value = true
  window.setTimeout(() => (pathCopied.value = false), 1500)
}
</script>

<template>
  <section ref="rootEl" class="pw-source" :class="{ 'is-open': open }">
    <header class="pw-source__head">
      <button type="button" class="pw-source__toggle" @click="toggle">
        <ChevronRight :size="14" class="pw-source__chevron" />
        <FileCode2 :size="14" class="pw-source__icon" />
        <span class="pw-source__label">源码</span>
        <span class="pw-source__file">{{ fileName }}</span>
      </button>

      <div class="pw-source__actions">
        <button
          v-if="open"
          type="button"
          class="pw-source__action"
          :class="{ 'is-on': findOpen }"
          data-tip="在源码中搜索（⌘F）"
          aria-label="在源码中搜索"
          @click="toggleFind"
        >
          <Search :size="14" />
        </button>
        <button type="button" class="pw-source__action" :data-tip="copied ? '已复制源码' : '复制源码'"
          aria-label="复制源码" @click="copy">
          <Check v-if="copied" :size="14" />
          <Copy v-else :size="14" />
        </button>
        <button
          type="button"
          class="pw-source__action"
          :data-tip="pathCopied ? '已复制路径' : '复制文件路径'"
          aria-label="复制文件路径"
          @click="copyFilePath"
        >
          <Check v-if="pathCopied" :size="14" />
          <FileSymlink v-else :size="14" :stroke-width="2" />
        </button>
        <button
          v-if="editorEnabled()"
          type="button"
          class="pw-source__action"
          :data-tip="`用 ${editorLabel()} 打开`"
          :aria-label="`用 ${editorLabel()} 打开`"
          @click="openInEditor(active?.rel ?? scene.rel)"
        >
          <SquareArrowOutUpRight :size="14" :stroke-width="2" />
        </button>
      </div>
    </header>

    <div v-if="open" class="pw-source__body">
      <div v-if="findOpen" class="pw-source__find">
        <Search :size="13" class="pw-source__find-icon" />
        <input
          ref="findInput"
          v-model="query"
          type="text"
          class="pw-source__find-input"
          placeholder="在当前文件中搜索"
          aria-label="在源码中搜索"
          spellcheck="false"
          @keydown="onFindKeydown"
        />
        <span class="pw-source__find-count" aria-live="polite">{{ countText }}</span>
        <button
          type="button"
          class="pw-source__find-btn"
          :disabled="!total"
          data-tip="上一个匹配（Shift+Enter）"
          aria-label="上一个匹配"
          @click="step(-1)"
        >
          <ChevronUp :size="14" />
        </button>
        <button type="button" class="pw-source__find-btn" :disabled="!total" data-tip="下一个匹配（Enter）" aria-label="下一个匹配" @click="step(1)">
          <ChevronDown :size="14" />
        </button>
        <button
          type="button"
          class="pw-source__find-btn"
          :class="{ 'is-on': caseSensitive }"
          :aria-pressed="caseSensitive"
          data-tip="区分大小写"
          aria-label="区分大小写"
          @click="caseSensitive = !caseSensitive"
        >
          <CaseSensitive :size="14" />
        </button>
        <button
          type="button"
          class="pw-source__find-btn"
          :class="{ 'is-on': wholeWord }"
          :aria-pressed="wholeWord"
          data-tip="全词匹配"
          aria-label="全词匹配"
          @click="wholeWord = !wholeWord"
        >
          <WholeWord :size="14" />
        </button>
        <button type="button" class="pw-source__find-btn" data-tip="关闭搜索（Esc）" aria-label="关闭搜索" @click="closeFind">
          <X :size="14" />
        </button>
      </div>

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
        <CodeBlock
          v-else-if="code"
          ref="codeRef"
          :code="code"
          :lang="lang"
          :query="applied"
          :case-sensitive="caseSensitive"
          :whole-word="wholeWord"
          :active="hitIndex"
          @count="onCount"
        />
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

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

    &:hover,
    &.is-on {
      background: color-mix(in srgb, var(--rp-color-text-muted) 12%, transparent);
      color: var(--rp-color-primary);
    }
  }

  &__body {
    border-top: 1px solid var(--rp-color-border);
  }

  &__find {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--rp-color-border) 60%, transparent);
    background: color-mix(in srgb, var(--rp-color-surface) 60%, transparent);
  }

  &__find-icon {
    flex: 0 0 auto;
    color: var(--rp-color-text-muted);
  }

  &__find-input {
    flex: 1;
    min-width: 0;
    padding: 2px 4px;
    border: 0;
    background: transparent;
    color: var(--rp-color-text);
    font-family: var(--rp-font-mono);
    font-size: 12px;
    outline: none;

    &::placeholder {
      color: var(--rp-color-text-muted);
    }
  }

  &__find-count {
    flex: 0 0 auto;
    min-width: 44px;
    color: var(--rp-color-text-muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  &__find-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--rp-color-text-muted);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--rp-color-text-muted) 12%, transparent);
      color: var(--rp-color-text);
    }

    &.is-on {
      color: var(--rp-color-primary);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }
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
    .pw-scrollbar();
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
