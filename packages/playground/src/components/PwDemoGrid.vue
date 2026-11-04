<script setup lang="ts">
import { computed } from 'vue'

/**
 * 场景内 Demo 栅格。两种排法：
 * - `columns` 固定列数（1–4），窄屏折成单列；
 * - `min` 给每列最小宽度，放不下自动折行（优先于 columns）。
 */
const props = withDefaults(
  defineProps<{
    /** 固定列数，默认 1 */
    columns?: 1 | 2 | 3 | 4
    /** 每列最小宽度（px）；大于 0 时改用 auto-fit，忽略 columns */
    min?: number
    /** 间距，默认 md */
    gap?: 'sm' | 'md' | 'lg'
  }>(),
  { columns: 1, min: 0, gap: 'md' }
)

const GAPS: Record<'sm' | 'md' | 'lg', string> = { sm: '8px', md: '12px', lg: '16px' }

const auto = computed(() => props.min > 0)

const style = computed<Record<string, string>>(() => ({
  '--pw-demo-columns': String(props.columns),
  '--pw-demo-min': `${props.min || 220}px`,
  '--pw-demo-gap': GAPS[props.gap],
}))
</script>

<template>
  <div class="pw-demo-grid" :class="{ 'is-auto': auto }" :style="style">
    <slot />
  </div>
</template>

<style scoped lang="less">
.pw-demo-grid {
  display: grid;
  grid-template-columns: repeat(var(--pw-demo-columns, 1), minmax(0, 1fr));
  gap: var(--pw-demo-gap, 12px);
  width: 100%;
  min-width: 0;

  &.is-auto {
    grid-template-columns: repeat(auto-fit, minmax(min(var(--pw-demo-min, 220px), 100%), 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
