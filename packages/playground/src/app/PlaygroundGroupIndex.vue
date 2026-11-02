<script setup lang="ts">
/**
 * 分组落地页：由 `groupIndex: true` 时框架合成的条目使用。
 * 没有源文件，只是把该组其它场景列出来。
 */
import type { SceneDescriptor } from '../types'

defineProps<{
  group: string
  items: SceneDescriptor[]
}>()

defineEmits<{ select: [id: string] }>()
</script>

<template>
  <section class="pw-group-index">
    <header class="pw-group-index__head">
      <h2 class="pw-group-index__title">{{ group }}</h2>
      <span class="pw-group-index__count">{{ items.length }} 个场景</span>
    </header>

    <ul class="pw-group-index__list">
      <li v-for="item in items" :key="item.id" class="pw-group-index__item">
        <button type="button" class="pw-group-index__link" @click="$emit('select', item.id)">
          {{ item.title }}
        </button>
        <p v-if="item.description" class="pw-group-index__desc">{{ item.description }}</p>
        <code class="pw-group-index__id">{{ item.id }}</code>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-group-index {
  max-width: 720px;
  padding: 28px 4px;

  &__head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 20px;
  }

  &__title {
    margin: 0;
    color: var(--rp-color-text);
    font-size: 18px;
    font-weight: 600;
  }

  &__count {
    color: var(--rp-color-text-muted);
    font-size: 12.5px;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: 12px 0;
    border-bottom: 1px solid var(--rp-color-border);

    &:last-child {
      border-bottom: 0;
    }
  }

  &__link {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--rp-color-primary);
    font: inherit;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__desc {
    margin: 6px 0 4px;
    color: var(--rp-color-text-muted);
    font-size: 12.5px;
    line-height: 1.6;
  }

  &__id {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
    opacity: 0.75;
  }
}
</style>
