<script setup lang="ts">
/**
 * 卡片底部（MyCard 的子组件）。
 */
withDefaults(
  defineProps<{
    /** 左侧说明文字，留空则只放操作 */
    hint?: string
    /** 是否显示分隔线与浅色底 */
    divider?: boolean
  }>(),
  { hint: '', divider: true }
)

defineSlots<{
  /** 右侧操作按钮 */
  default?: () => unknown
}>()
</script>

<template>
  <div class="my-card-footer" :class="{ 'my-card-footer--plain': !divider }">
    <span v-if="hint" class="my-card-footer__hint">{{ hint }}</span>
    <div class="my-card-footer__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="less">
.my-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #eef0f3;
  background: #fafbfc;

  &--plain {
    border-top-color: transparent;
    background: transparent;
  }
}

.my-card-footer__hint {
  color: #667085;
  font-size: 12px;
}

.my-card-footer__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
