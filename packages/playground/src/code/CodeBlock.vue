<script setup lang="ts">
import { ref, watch } from 'vue'
import { getHighlighter, PW_THEME_DARK, PW_THEME_LIGHT } from './highlighter'

const props = withDefaults(defineProps<{ code: string; lang?: string }>(), { lang: 'vue' })

const html = ref('')
const state = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')

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
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      state.value = 'error'
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="pw-code">
    <div v-if="state === 'loading'" class="pw-code__hint">高亮中…</div>
    <pre v-else-if="state === 'error'" class="pw-code__error">{{ error }}</pre>
    <div v-else class="pw-code__body" v-html="html" />
  </div>
</template>

<style scoped>
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
</style>
