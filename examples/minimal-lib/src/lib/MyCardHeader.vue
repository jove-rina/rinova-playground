<script setup lang="ts">
/**
 * 卡片头部（MyCard 的子组件）。
 * 用于演示「一个组件页下面挂子组件页」：子组件单独有 meta.ts 与场景。
 */
withDefaults(
  defineProps<{
    /** 标题文案 */
    title?: string
    /** 右上角操作按钮文字，留空则不显示 */
    action?: string
  }>(),
  { title: '', action: '' }
)

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="my-card-header">
    <span class="my-card-header__title">{{ title }}</span>
    <button v-if="action" type="button" class="my-card-header__action" @click="$emit('action')">
      {{ action }}
    </button>
  </div>
</template>

<style scoped lang="less">
.my-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #eef0f3;
  background: #f8fafc;

  &__title {
    color: #1c2024;
    font-size: 13px;
    font-weight: 600;
  }

  &__action {
    padding: 2px 10px;
    border: 1px solid #d0d5dd;
    border-radius: 6px;
    background: #fff;
    color: #344054;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      border-color: #2f6feb;
      color: #2f6feb;
    }
  }
}
</style>
