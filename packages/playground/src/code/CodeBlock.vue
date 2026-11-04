<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { flattenTextNodes, findMatches, segmentsOf } from './find'
import { getHighlighter, PW_THEME_DARK, PW_THEME_LIGHT } from './highlighter'

const props = withDefaults(
  defineProps<{
    code: string
    lang?: string
    /** 搜索关键字：非空时把匹配项包成 <mark>，跨 token 的词也能命中 */
    query?: string
    /** 大小写敏感 */
    caseSensitive?: boolean
    /** 全词匹配 */
    wholeWord?: boolean
    /** 当前高亮的匹配下标（0 起）；-1 表示不高亮 */
    active?: number
  }>(),
  { lang: 'vue', query: '', caseSensitive: false, wholeWord: false, active: -1 }
)

const emit = defineEmits<{ count: [total: number] }>()

const html = ref('')
const state = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')
const bodyRef = ref<HTMLElement | null>(null)
/** 每个匹配的 mark 列表（一个匹配可能被 token 边界切成多段） */
let groups: HTMLElement[][] = []

watch(
  () => [props.code, props.lang] as const,
  async ([code, lang]) => {
    state.value = 'loading'
    try {
      const highlighter = await getHighlighter()
      html.value = highlighter.codeToHtml(code, {
        lang,
        themes: { light: PW_THEME_LIGHT, dark: PW_THEME_DARK },
        defaultColor: false,
      })
      state.value = 'ready'
      await nextTick()
      applyQuery()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      state.value = 'error'
    }
  },
  { immediate: true }
)

watch(
  () => [props.query, props.caseSensitive, props.wholeWord] as const,
  async () => {
    if (state.value !== 'ready') return
    await nextTick()
    applyQuery()
  }
)

watch(
  () => props.active,
  () => paintActive()
)

const clearHits = (): void => {
  if (!groups.length) return
  const root = bodyRef.value
  for (const group of groups) {
    for (const mark of group) mark.replaceWith(document.createTextNode(mark.textContent ?? ''))
  }
  groups = []
  root?.normalize()
}

const inDocumentOrder = (group: HTMLElement[]): HTMLElement[] =>
  [...group].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))

/** 扁平文本匹配 + 节点内倒序切分 → <mark>；切在后面的偏移不会影响前面的 */
const applyQuery = (): void => {
  clearHits()
  const root = bodyRef.value
  const query = props.query
  if (!root || !query) {
    emit('count', 0)
    return
  }
  const flat = flattenTextNodes(root)
  const matches = findMatches(flat.text, query, {
    caseSensitive: props.caseSensitive,
    wholeWord: props.wholeWord,
  })

  const buckets = new Map<number, { start: number; end: number; matchIndex: number }[]>()
  for (const segment of segmentsOf(flat, matches)) {
    const list = buckets.get(segment.nodeIndex) ?? []
    list.push(segment)
    buckets.set(segment.nodeIndex, list)
  }

  const built: HTMLElement[][] = matches.map(() => [])
  for (const [nodeIndex, list] of buckets) {
    const node = flat.nodes[nodeIndex]
    if (!node) continue
    list.sort((a, b) => b.start - a.start)
    for (const segment of list) {
      node.splitText(segment.end)
      const middle = node.splitText(segment.start)
      const mark = document.createElement('mark')
      mark.className = 'pw-code__hit'
      mark.dataset.hit = String(segment.matchIndex)
      mark.textContent = middle.data
      middle.replaceWith(mark)
      built[segment.matchIndex]?.push(mark)
    }
  }

  groups = built.map(inDocumentOrder).filter((group) => group.length > 0)
  emit('count', groups.length)
  paintActive()
  scrollToHit(props.active)
}

const paintActive = (): void => {
  const active = props.active
  groups.forEach((group, index) => {
    const on = index === active
    for (const mark of group) mark.classList.toggle('is-active', on)
  })
}

/** 滚到指定匹配：只滚最近的滚动容器，避免整页跟着动 */
const scrollToHit = (index: number): void => {
  const mark = groups[index]?.[0]
  if (!mark) return
  let parent = mark.parentElement
  while (parent && parent !== document.body) {
    if (parent.scrollHeight > parent.clientHeight + 1) {
      const offset = mark.getBoundingClientRect().top - parent.getBoundingClientRect().top
      parent.scrollTo({ top: parent.scrollTop + offset - parent.clientHeight / 2, behavior: 'smooth' })
      return
    }
    parent = parent.parentElement
  }
}

defineExpose({ scrollToHit })

onBeforeUnmount(() => clearHits())
</script>

<template>
  <div class="pw-code">
    <div v-if="state === 'loading'" class="pw-code__hint">高亮中…</div>
    <pre v-else-if="state === 'error'" class="pw-code__error">{{ error }}</pre>
    <div v-else ref="bodyRef" class="pw-code__body" v-html="html" />
  </div>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-code {
  height: 100%;
  overflow: auto;
  font-family: var(--rp-font-mono);
  font-size: 12.5px;
  line-height: 1.65;
}

.pw-code__hint,
.pw-code__error {
  margin: 0;
  padding: 16px;
  color: var(--rp-color-text-muted);
  white-space: pre-wrap;
}

.pw-code__error {
  color: var(--rp-color-danger);
}

.pw-code__body :deep(pre) {
  margin: 0;
  padding: 12px 16px 20px;
  background: transparent !important;
  tab-size: 2;
}

.pw-code__body :deep(code) {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.pw-code__body :deep(span) {
  color: var(--shiki-light);
}

:root[data-pw-theme='dark'] .pw-code__body :deep(span) {
  color: var(--shiki-dark);
}

/* 搜索命中：普通命中淡底，当前命中实底 */
.pw-code__body :deep(.pw-code__hit) {
  border-radius: 2px;
  background: color-mix(in srgb, var(--rp-color-warning) 32%, transparent);
  color: inherit;
}

.pw-code__body :deep(.pw-code__hit.is-active) {
  background: var(--rp-color-warning);
  color: var(--rp-color-bg);
}
</style>