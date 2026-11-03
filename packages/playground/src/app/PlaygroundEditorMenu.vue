<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown, ClipboardCopy, SquareArrowOutUpRight } from '@lucide/vue'
import {
  canChooseEditor,
  copyPath,
  editorChoice,
  editorEnabled,
  editorLabel,
  editorOptions,
  openInEditor,
  setEditorChoice,
} from '../code/openInEditor'

const props = defineProps<{ rel: string; line?: number }>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const options = computed(() => editorOptions())
const choosable = computed(() => canChooseEditor())

const toggle = (): void => {
  if (!choosable.value) return
  open.value = !open.value
}

const pick = (value: string): void => {
  setEditorChoice(value)
  open.value = false
}

const onDocClick = (event: MouseEvent): void => {
  if (!rootEl.value?.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="pw-editor">
    <button
      type="button"
      class="pw-editor__main"
      :title="`在 ${editorLabel()} 中打开这一行`"
      @click="editorEnabled() ? openInEditor(rel, line ?? 1) : copyPath(rel, line ?? 1)"
    >
      <SquareArrowOutUpRight :size="13" />
      <span>在 {{ editorLabel() }} 打开</span>
    </button>

    <button
      v-if="choosable"
      type="button"
      class="pw-editor__caret"
      :class="{ 'is-open': open }"
      title="换一个编辑器"
      @click="toggle"
    >
      <ChevronDown :size="12" />
    </button>

    <div v-if="open" class="pw-editor__menu" role="menu">
      <div class="pw-editor__menu-label">用这个编辑器打开</div>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="pw-editor__item"
        role="menuitem"
        @click="pick(option.value)"
      >
        <Check :size="12" :class="{ 'is-hidden': option.value !== editorChoice }" />
        <span>{{ option.label }}</span>
      </button>
      <div class="pw-editor__sep" />
      <button type="button" class="pw-editor__item" role="menuitem" @click="copyPath(rel, line ?? 1); open = false">
        <ClipboardCopy :size="12" />
        <span>复制文件路径</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.pw-editor {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--rp-color-border);
  border-radius: 6px;
  overflow: visible;

  &__main,
  &__caret {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 0;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      color: var(--rp-color-primary);
    }
  }

  &__caret {
    padding: 3px 5px;
    border-left: 1px solid var(--rp-color-border);

    &.is-open {
      color: var(--rp-color-primary);
    }
  }

  &__menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    min-width: 168px;
    padding: 6px;
    border: 1px solid var(--rp-color-border);
    border-radius: 8px;
    background: var(--rp-color-surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  }

  &__menu-label {
    padding: 2px 6px 6px;
    color: var(--rp-color-text-muted);
    font-size: 10.5px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 6px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--rp-color-text);
    font: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--rp-color-primary) 10%, transparent);
      color: var(--rp-color-primary);
    }
  }

  &__sep {
    height: 1px;
    margin: 4px 0;
    background: var(--rp-color-border);
  }
}

.is-hidden {
  visibility: hidden;
}
</style>
