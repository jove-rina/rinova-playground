<script setup lang="ts">
/** 场景顶部 API 摘要行：一个场景演示了哪些 API，类型与默认值来自 manifest */
export interface ApiBriefItem {
  name: string
  type?: string
  default?: string
}

defineProps<{ items: ApiBriefItem[] }>()
const emit = defineEmits<{ inspect: [name: string] }>()
</script>

<template>
  <ul v-if="items.length" class="pw-api-brief">
    <li v-for="item in items" :key="item.name" class="pw-api-brief__item">
      <button type="button" class="pw-api-brief__chip" :title="`在 API 表里查看 ${item.name}`" @click="emit('inspect', item.name)">
        <code class="pw-api-brief__name">{{ item.name }}</code>
        <span v-if="item.type" class="pw-api-brief__type">{{ item.type }}</span>
        <span v-if="item.default" class="pw-api-brief__default">= {{ item.default }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped lang="less">
.pw-api-brief {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    display: inline-flex;
    min-width: 0;
  }

  &__chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 8px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: var(--rp-color-primary);
    }
  }

  &__name {
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }

  &__type,
  &__default {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11px;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
