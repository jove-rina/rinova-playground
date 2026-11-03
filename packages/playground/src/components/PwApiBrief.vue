<script setup lang="ts">
/** 场景顶部 API 摘要行：一个场景演示了哪些 API，类型与默认值可来自 manifest */
export interface ApiBriefItem {
  name: string
  type?: string
  default?: string
}

defineProps<{ items: ApiBriefItem[] }>()
</script>

<template>
  <ul v-if="items.length" class="pw-api-brief">
    <li v-for="item in items" :key="item.name" class="pw-api-brief__item">
      <code class="pw-api-brief__name">{{ item.name }}</code>
      <span v-if="item.type" class="pw-api-brief__type">{{ item.type }}</span>
      <span v-if="item.default" class="pw-api-brief__default">= {{ item.default }}</span>
    </li>
  </ul>
</template>

<style scoped lang="less">
.pw-api-brief {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
  }

  &__name {
    padding: 1px 6px;
    border: 1px solid var(--rp-color-border);
    border-radius: 4px;
    background: var(--rp-color-surface);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }

  &__type,
  &__default {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }
}
</style>
