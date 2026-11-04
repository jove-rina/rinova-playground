<script setup lang="ts">
/**
 * docs-site 自己的排版组件：已经是框架 `PwProse` 的薄壳。
 * 保留这个文件是为了不改动 10 个既有场景的 import 路径。
 */
import { PwProse } from '@rinova/playground'

defineProps<{ title?: string; lead?: string }>()
</script>

<template>
  <PwProse :title="title" :lead="lead">
    <slot />
  </PwProse>
</template>
