<script setup lang="ts">
/**
 * 单个 Demo 块：标题 + 控件区 + 可选说明/页脚。
 *
 * 默认 `surface="none"`：画布已经提供了底色和内边距，这里只负责排版；
 * 需要独立卡片时再加 `surface="card"`。全部可选，不想用这套原语照样可以自己写。
 */
withDefaults(
  defineProps<{
    /** 块标题，显示在控件上方（等宽小字） */
    title?: string
    /** 控件排列：横排自动换行 / 竖排撑满 */
    direction?: 'row' | 'column'
    /** 交叉轴对齐（横排时控制垂直对齐，竖排时控制拉伸与对齐） */
    align?: 'start' | 'center' | 'end'
    /** 外观：none 只排版，card 画边框卡片 */
    surface?: 'none' | 'card'
  }>(),
  { direction: 'row', align: 'center', surface: 'none' }
)
</script>

<template>
  <figure class="pw-demo" :class="[`is-${direction}`, `align-${align}`, `surface-${surface}`]">
    <figcaption v-if="title" class="pw-demo__title">{{ title }}</figcaption>
    <div class="pw-demo__body">
      <slot />
    </div>
    <p v-if="$slots.note" class="pw-demo__note"><slot name="note" /></p>
    <div v-if="$slots.footer" class="pw-demo__footer"><slot name="footer" /></div>
  </figure>
</template>

<style scoped lang="less">
.pw-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin: 0;

  &__title {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  &.is-column &__body {
    flex-direction: column;
    align-items: stretch;
  }

  &.align-start &__body {
    align-items: flex-start;
  }

  &.align-end &__body {
    align-items: flex-end;
  }

  &.surface-card {
    padding: 16px;
    border: 1px solid var(--rp-color-border);
    border-radius: var(--rp-radius);
    background: var(--rp-color-surface);
  }

  &__note {
    margin: 0;
    color: var(--rp-color-text-muted);
    font-size: 12px;
  }

  &__footer {
    padding-top: 8px;
    border-top: 1px dashed var(--rp-color-border);
  }
}
</style>
