<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import PwPortal from '../components/PwPortal.vue'
import PwSceneBoundary from '../components/PwSceneBoundary.vue'
import { closePlaygroundPanel, pluginOpenPanelId, pluginPanelEntries } from '../plugin'

/**
 * 插件抽屉：右侧通高 420px，同一时刻只开一个。
 * Esc / 点遮罩关闭，关闭后焦点回到打开它的元素。
 */
const drawerEl = ref<HTMLElement | null>(null)
const restoreTo = ref<HTMLElement | null>(null)

const active = computed(
  () => pluginPanelEntries.value.find((entry) => entry.id === pluginOpenPanelId.value) ?? null
)

watch(active, async (entry, previous) => {
  if (entry && !previous) {
    const focused = document.activeElement
    restoreTo.value = focused instanceof HTMLElement ? focused : null
    await nextTick()
    drawerEl.value?.focus()
    return
  }
  if (!entry && previous) {
    restoreTo.value?.focus?.()
    restoreTo.value = null
  }
})

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !active.value) return
  event.stopPropagation()
  closePlaygroundPanel()
}

onMounted(() => document.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <PwPortal v-if="active">
    <div class="pw-plugin-panel" role="dialog" aria-modal="true" :aria-label="active.title">
      <div class="pw-plugin-panel__mask" @click="closePlaygroundPanel()" />
      <aside ref="drawerEl" class="pw-plugin-panel__drawer" tabindex="-1">
        <header class="pw-plugin-panel__head">
          <h2 class="pw-plugin-panel__title">{{ active.title }}</h2>
          <span class="pw-plugin-panel__from">插件 {{ active.plugin }}</span>
          <button type="button" class="pw-plugin-panel__close" aria-label="关闭" @click="closePlaygroundPanel()">
            <X :size="14" :stroke-width="2" />
          </button>
        </header>
        <div class="pw-plugin-panel__body">
          <PwSceneBoundary :title="`插件面板（${active.plugin}）`">
            <component :is="active.component" v-bind="active.props ?? {}" />
          </PwSceneBoundary>
        </div>
      </aside>
    </div>
  </PwPortal>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-plugin-panel {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.pw-plugin-panel__mask {
  position: absolute;
  inset: 0;
  /* 用 brightness 压暗背后那一层：明暗两套主题都成立，也不用写死蒙层色值 */
  backdrop-filter: blur(2px) brightness(0.72);
}

.pw-plugin-panel__drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: 100vw;
  border-left: 1px solid var(--rp-color-border);
  border-radius: 12px 0 0 12px;
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  box-shadow: -18px 0 48px color-mix(in srgb, var(--rp-color-text) 18%, transparent);
  outline: none;
}

.pw-plugin-panel__head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 49px;
  padding: 0 14px 0 16px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-plugin-panel__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

/* 面板要写明属于哪个插件：同名面板多了才知道该找谁 */
.pw-plugin-panel__from {
  margin-left: auto;
  padding-right: 6px;
  color: var(--rp-color-text-muted);
  font-size: 10.5px;
}

.pw-plugin-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--rp-radius);
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;

  &:hover {
    background: var(--rp-color-surface);
    color: var(--rp-color-text);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--rp-color-primary) 60%, transparent);
    outline-offset: 1px;
  }
}

.pw-plugin-panel__body {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}
</style>
