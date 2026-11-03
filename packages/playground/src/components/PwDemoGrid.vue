<script setup lang="ts">
/** 场景内 Demo 栅格：默认单列，可 2 / 3 列并排；窄屏自动折成单列 */
withDefaults(defineProps<{ columns?: 1 | 2 | 3 }>(), { columns: 1 })
</script>

<template>
  <div class="pw-demo-grid" :style="{ '--pw-demo-columns': String(columns) }">
    <slot />
  </div>
</template>

<style scoped lang="less">
.pw-demo-grid {
  display: grid;
  grid-template-columns: repeat(var(--pw-demo-columns, 1), minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  min-width: 0;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
