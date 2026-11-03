<script setup lang="ts">
/** 单个 Demo 块：标题 + 控件区 + 可选说明/页脚（如该 Demo 的 Payload） */
defineProps<{ title?: string }>()
</script>

<template>
  <figure class="pw-demo">
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
  padding: 16px;
  border: 1px solid var(--rp-color-border);
  border-radius: var(--rp-radius);
  background: var(--rp-color-surface);

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
