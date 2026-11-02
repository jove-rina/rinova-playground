<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { applyMonacoTheme, langFromFile, loadMonaco } from './monaco'

const props = withDefaults(
  defineProps<{
    modelValue: string
    filename: string
    readOnly?: boolean
    theme?: 'light' | 'dark'
  }>(),
  { readOnly: true, theme: 'light' }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  fail: [message: string]
}>()

const host = ref<HTMLDivElement>()
let editor: import('monaco-editor/editor/editor.api').editor.IStandaloneCodeEditor | null = null
let monacoRef: typeof import('monaco-editor/editor/editor.api') | null = null
let observer: ResizeObserver | null = null
let applying = false

const options = () => {
  const mono = getComputedStyle(document.documentElement).getPropertyValue('--rp-font-mono').trim()
  return {
    value: props.modelValue,
    language: langFromFile(props.filename),
    theme: props.theme === 'dark' ? 'vitesse-dark' : 'vitesse-light',
    readOnly: props.readOnly,
    domReadOnly: props.readOnly,
    minimap: { enabled: false },
    lineNumbers: 'on' as const,
    folding: true,
    scrollBeyondLastLine: false,
    automaticLayout: false,
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: mono || 'ui-monospace, SFMono-Regular, Menlo, monospace',
    padding: { top: 12, bottom: 16 },
    renderLineHighlight: 'none' as const,
    overviewRulerLanes: 0,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    contextmenu: true,
    wordWrap: 'off' as const,
    tabSize: 2,
  }
}

onMounted(async () => {
  try {
    const monaco = await loadMonaco()
    monacoRef = monaco
    if (!host.value) return
    applyMonacoTheme(monaco, props.theme)
    editor = monaco.editor.create(host.value, options())
    const instance = editor

    // 面板刚展开时容器可能还是 0 高：用 ResizeObserver 等到有尺寸再布局，
    // 否则模型有内容但一行都不渲染（真踩过）
    observer = new ResizeObserver(() => {
      const box = host.value?.getBoundingClientRect()
      if (!box || box.width === 0 || box.height === 0) return
      instance.layout()
    })
    observer.observe(host.value)
    requestAnimationFrame(() => instance.layout())
    instance.onDidChangeModelContent(() => {
      if (applying) return
      emit('update:modelValue', instance.getValue())
    })
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error('[rinova-playground] Monaco 启动失败，已降级为静态高亮：', message)
    emit('fail', message)
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || editor.getValue() === value) return
    applying = true
    editor.setValue(value)
    applying = false
  }
)

watch(
  () => props.filename,
  (file) => {
    const model = editor?.getModel()
    if (model && monacoRef) monacoRef.editor.setModelLanguage(model, langFromFile(file))
  }
)

watch(
  () => props.readOnly,
  (value) => editor?.updateOptions({ readOnly: value, domReadOnly: value })
)

watch(
  () => props.theme,
  (value) => {
    if (monacoRef) applyMonacoTheme(monacoRef, value)
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  editor?.getModel()?.dispose()
  editor?.dispose()
  editor = null
})
</script>

<template>
  <div ref="host" class="pw-monaco" />
</template>

<style scoped lang="less">
.pw-monaco {
  height: 100%;
  overflow: hidden;
}
</style>
