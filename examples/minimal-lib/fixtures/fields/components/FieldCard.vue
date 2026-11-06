<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { LayoutOptions } from './types'

/**
 * 字段规则夹具：一个本项目声明的对象、一个外部包的对象、一个标量。
 * verify 的三条断言都挂在这个文件上。
 */
const props = withDefaults(
  defineProps<{
    /** 布局选项（本项目声明，40 个字段 → 上限 32） */
    layout?: LayoutOptions
    /** 自定义样式（vue → csstype，1348 个外部字段，不应展开） */
    customStyle?: CSSProperties
    /** 文案 */
    label?: string
  }>(),
  { label: 'field-card' }
)
</script>

<template>
  <div class="field-card">{{ props.label }}</div>
</template>

<style scoped lang="less">
.field-card {
  color: var(--rp-color-text);
}
</style>
