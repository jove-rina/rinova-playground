<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, PencilLine, SquareArrowOutUpRight } from '@lucide/vue'
import {
  allowCustomEditor,
  canChooseEditor,
  editorChoiceKey,
  editorLabel,
  editorOptions,
  editorTemplate,
  setEditorChoice,
} from '../code/openInEditor'

const open = ref(false)
const customMode = ref(false)
const draft = ref('')
const rootEl = ref<HTMLElement | null>(null)
const draftEl = ref<HTMLInputElement | null>(null)

const options = computed(() => editorOptions())
const choosable = computed(() => canChooseEditor())
const customAllowed = computed(() => allowCustomEditor())
/** 没有 {file} 占位符的模板保存了也跳不过去，直接按住保存按钮并把提示换成原因 */
const draftValid = computed(() => draft.value.includes('{file}'))

const toggle = (): void => {
  if (!choosable.value) {
    return
  }
  open.value = !open.value
  if (!open.value) customMode.value = false
}

const pick = (value: string): void => {
  setEditorChoice({ key: value })
  open.value = false
  customMode.value = false
}

const startCustom = (): void => {
  customMode.value = true
  draft.value = editorTemplate() || 'myeditor://file/{file}:{line}'
  // 切到表单后直接聚焦选中整段模板，用户能立刻改，不用再点一次
  nextTick(() => {
    draftEl.value?.focus()
    draftEl.value?.select()
  })
}

const saveCustom = (): void => {
  const template = draft.value.trim()
  if (!template.includes('{file}')) return
  setEditorChoice({ key: 'custom', template })
  open.value = false
  customMode.value = false
}

const close = (): void => {
  open.value = false
  customMode.value = false
}

/**
 * 点外面关菜单。必须用 pointerdown + 捕获阶段：
 * 用 click 时，菜单里的项在 click 处理中把 customMode 改掉，Vue 更新把该按钮移出文档，
 * 等事件冒泡到 document 时 target 已经 isConnected=false，contains() 返回 false，
 * 于是「点自定义协议」被当成点了外面，菜单直接关掉（Bug 现场）。
 */
const onDocPointerDown = (event: PointerEvent): void => {
  const target = event.target as Node | null
  if (!target || !rootEl.value?.contains(target)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))
</script>

<template>
  <div ref="rootEl" class="pw-picker">
    <button
      type="button"
      class="pw-picker__btn"
      :class="{ 'is-active': open }"
      :disabled="!choosable"
      :data-tip="choosable ? `本地编辑器：${editorLabel()}（点这里改）` : `本地编辑器：${editorLabel()}`"
      :aria-label="`本地编辑器：${editorLabel()}`"
      @click="toggle"
    >
      <SquareArrowOutUpRight :size="14" :stroke-width="2" />
    </button>

    <div v-if="open" class="pw-picker__menu" role="menu">
      <template v-if="!customMode">
        <div class="pw-picker__menu-label">本地编辑器</div>
        <button
          v-if="editorChoiceKey === 'custom'"
          type="button"
          class="pw-picker__item"
          role="menuitem"
          @click="open = false"
        >
          <Check :size="12" />
          <span>自定义 {{ editorLabel() }}</span>
        </button>
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="pw-picker__item"
          role="menuitem"
          @click="pick(option.value)"
        >
          <Check :size="12" :class="{ 'is-hidden': option.value !== editorChoiceKey }" />
          <span>{{ option.label }}</span>
        </button>

        <template v-if="customAllowed">
          <div class="pw-picker__sep" />
          <button type="button" class="pw-picker__item" role="menuitem" @click="startCustom">
            <PencilLine :size="12" />
            <span>自定义协议…</span>
          </button>
        </template>
      </template>

      <template v-else>
        <div class="pw-picker__menu-label">自定义协议模板</div>
        <input
          ref="draftEl"
          v-model="draft"
          class="pw-picker__input"
          placeholder="myeditor://file/{file}:{line}"
          spellcheck="false"
          @keydown.enter="saveCustom"
          @keydown.esc="customMode = false"
        />
        <p class="pw-picker__hint" :class="{ 'is-invalid': !draftValid }">
          <template v-if="draftValid">
            占位符：<code>{file}</code> 绝对路径、<code>{fileEnc}</code> URL 编码、<code>{line}</code> 行号
          </template>
          <template v-else>模板里必须有 <code>{file}</code> 占位符，否则跳不过去</template>
        </p>
        <div class="pw-picker__actions">
          <button type="button" class="pw-picker__action" @click="customMode = false">取消</button>
          <button
            type="button"
            class="pw-picker__action pw-picker__action--primary"
            :disabled="!draftValid"
            @click="saveCustom"
          >
            保存
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.pw-picker {
  position: relative;

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--rp-color-border);
    border-radius: 8px;
    background: transparent;
    color: var(--rp-color-text-muted);
    cursor: pointer;

    &:hover {
      border-color: var(--rp-color-primary);
      color: var(--rp-color-primary);
    }

    &.is-active {
      border-color: var(--rp-color-primary);
      background: color-mix(in srgb, var(--rp-color-primary) 10%, transparent);
      color: var(--rp-color-primary);
    }

    &:disabled {
      cursor: default;
      opacity: 0.75;
    }
  }

  &__menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    width: 236px;
    padding: 6px;
    border: 1px solid var(--rp-color-border);
    border-radius: 8px;
    background: var(--rp-color-surface);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--rp-color-text) 14%, transparent);
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

  &__input {
    width: 100%;
    padding: 5px 7px;
    border: 1px solid var(--rp-color-border);
    border-radius: 6px;
    background: var(--rp-color-bg);
    color: var(--rp-color-text);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
    outline: none;

    &:focus {
      border-color: var(--rp-color-primary);
    }
  }

  &__hint {
    margin: 6px 2px 8px;
    color: var(--rp-color-text-muted);
    font-size: 10.5px;
    line-height: 1.5;

    code {
      font-family: var(--rp-font-mono);
      font-size: 10.5px;
    }

    &.is-invalid {
      color: var(--rp-color-danger);
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  &__action {
    padding: 3px 10px;
    border: 1px solid var(--rp-color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;

    &--primary {
      border-color: var(--rp-color-primary);
      background: var(--rp-color-primary);
      color: var(--rp-color-primary-contrast);

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }
}

.is-hidden {
  visibility: hidden;
}
</style>
