<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 全站 tooltip：只有图标的按钮把文案写在 `data-tip` 上（同时用 aria-label 给读屏）。
 * 用事件委托 + position: fixed，避免被 header / 卡片的 overflow 裁掉；
 * 延迟 120ms 出现，比浏览器原生 title 快得多，样式也跟外壳一致。
 */
const text = ref('')
const visible = ref(false)
const style = ref<Record<string, string>>({})
const bubbleEl = ref<HTMLElement | null>(null)

let timer = 0
let current: HTMLElement | null = null

const hide = (): void => {
  window.clearTimeout(timer)
  visible.value = false
  current = null
}

const place = (target: HTMLElement): void => {
  const box = target.getBoundingClientRect()
  const bubble = bubbleEl.value?.getBoundingClientRect()
  const width = bubble?.width ?? 0
  const height = bubble?.height ?? 0
  const left = Math.max(8, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 8))
  const above = box.top - height - 8
  const top = above >= 8 ? above : box.bottom + 8
  style.value = { left: `${left}px`, top: `${top}px` }
}

const show = (target: HTMLElement): void => {
  const tip = target.dataset.tip
  if (!tip) return
  current = target
  text.value = tip
  window.clearTimeout(timer)
  timer = window.setTimeout(async () => {
    visible.value = true
    await nextTick()
    place(target)
  }, 120)
}

const targetOf = (node: EventTarget | null): HTMLElement | null =>
  node instanceof Element ? (node.closest('[data-tip]') as HTMLElement | null) : null

const onOver = (event: PointerEvent): void => {
  const target = targetOf(event.target)
  if (target && target !== current) show(target)
}

const onOut = (event: PointerEvent): void => {
  const target = targetOf(event.target)
  if (!target) return
  if (target.contains(event.relatedTarget as Node | null)) return
  if (target === current) hide()
}

const onFocusIn = (event: FocusEvent): void => {
  const target = targetOf(event.target)
  if (target) show(target)
}

onMounted(() => {
  document.addEventListener('pointerover', onOver, true)
  document.addEventListener('pointerout', onOut, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('pointerdown', hide, true)
  window.addEventListener('scroll', hide, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerover', onOver, true)
  document.removeEventListener('pointerout', onOut, true)
  document.removeEventListener('focusin', onFocusIn, true)
  document.removeEventListener('pointerdown', hide, true)
  window.removeEventListener('scroll', hide, true)
  window.clearTimeout(timer)
})
</script>

<template>
  <div v-if="visible" ref="bubbleEl" class="pw-tip" role="tooltip" :style="style">{{ text }}</div>
</template>

<style scoped lang="less">
.pw-tip {
  position: fixed;
  z-index: 80;
  max-width: 280px;
  padding: 4px 8px;
  border: 1px solid var(--rp-color-border);
  border-radius: 6px;
  background: var(--rp-color-surface);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--rp-color-text) 16%, transparent);
  color: var(--rp-color-text);
  font-size: 11.5px;
  line-height: 1.5;
  white-space: nowrap;
  pointer-events: none;
}
</style>
