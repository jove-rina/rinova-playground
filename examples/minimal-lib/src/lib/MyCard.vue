<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 标题（留空则整块用 header 插槽） */
    title?: string
    /** 标题下的一行说明 */
    description?: string
    /** 内边距档位：sm 10px / md 12px / lg 20px */
    padding?: 'sm' | 'md' | 'lg'
    /** 是否显示边框与阴影 */
    bordered?: boolean
  }>(),
  { title: '', description: '', padding: 'md', bordered: true }
)

defineSlots<{
  /** 整个头部，替换 title / description */
  header?: () => unknown
  /** 卡片主体 */
  default?: () => unknown
  /** 底部操作区，自带分隔线与底色 */
  footer?: () => unknown
}>()
</script>

<template>
  <article
    class="my-card"
    :class="[`my-card--${padding}`, { 'my-card--plain': !bordered }]"
  >
    <header v-if="title || $slots.header" class="my-card__head">
      <slot name="header">
        <h3 class="my-card__title">{{ title }}</h3>
        <p v-if="description" class="my-card__desc">{{ description }}</p>
      </slot>
    </header>
    <div class="my-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="my-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped lang="less">
.my-card {
  width: 360px;
  max-width: 100%;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(16 24 40 / 6%);
  overflow: hidden;

  &--plain {
    border-color: transparent;
    box-shadow: none;
    background: #f8fafc;
  }

  &--sm .my-card__body {
    padding: 10px 12px;
  }

  &--md .my-card__body {
    padding: 12px 16px 16px;
  }

  &--lg .my-card__body {
    padding: 20px 24px 24px;
  }
}

.my-card__head {
  padding: 16px 16px 0;
}

.my-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1c2024;
}

.my-card__desc {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: #667085;
}

.my-card__body {
  font-size: 13px;
  color: #1c2024;
}

.my-card__footer {
  padding: 10px 16px;
  border-top: 1px solid #eef0f3;
  background: #fafbfc;
}
</style>
