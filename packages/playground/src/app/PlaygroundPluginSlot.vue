<script setup lang="ts">
import PwSceneBoundary from '../components/PwSceneBoundary.vue'
import type { PlaygroundPluginUiEntry } from '../plugin'

/**
 * 插件的 UI 缝位：位置固定、尺寸受控，插件只管往里放组件。
 * 每一项各自套错误边界，一个插件 UI 抛错不影响外壳。
 */
defineProps<{ entries: PlaygroundPluginUiEntry[]; slot: 'header' | 'sidebarFooter' }>()
</script>

<template>
  <div v-if="entries.length" class="pw-plugin-slot" :class="`pw-plugin-slot--${slot}`" :data-pw-plugin-slot="slot">
    <PwSceneBoundary v-for="entry in entries" :key="entry.key" :title="`插件 UI（${entry.plugin}）`">
      <component :is="entry.component" v-bind="entry.props ?? {}" />
    </PwSceneBoundary>
  </div>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-plugin-slot {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;

  &--header {
    max-width: 220px;
    height: 28px;
    overflow: hidden;
  }

  &--sidebarFooter {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    max-height: 64px;
    overflow: hidden;

    /* 缝位里的错误卡片压成一行，堆栈留在控制台，不把页脚撑爆 */
    :deep(.pw-boundary--error) {
      padding: 6px 8px;
    }

    :deep(.pw-boundary__file),
    :deep(.pw-boundary__stack) {
      display: none;
    }
  }
}
</style>
