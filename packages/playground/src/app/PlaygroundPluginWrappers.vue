<script setup lang="ts">
import { computed } from 'vue'
import type { PlaygroundPluginUiEntry } from '../plugin'

/**
 * 插件提供的包裹层（config-provider / router 这类）。
 * 没有包裹层时直接渲染插槽 —— 不配插件的项目 DOM 结构与之前完全一致。
 */
const props = defineProps<{ entries: PlaygroundPluginUiEntry[] }>()

const head = computed(() => props.entries[0])
const rest = computed(() => props.entries.slice(1))
</script>

<template>
  <slot v-if="!head" />
  <component v-else :is="head.component" v-bind="head.props ?? {}">
    <PlaygroundPluginWrappers :entries="rest">
      <slot />
    </PlaygroundPluginWrappers>
  </component>
</template>
