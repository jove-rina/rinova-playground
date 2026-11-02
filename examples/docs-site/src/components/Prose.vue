<script setup lang="ts">
defineProps<{ title?: string; lead?: string }>()
</script>

<template>
  <article class="prose">
    <header v-if="title || lead" class="prose__head">
      <h1 v-if="title">{{ title }}</h1>
      <p v-if="lead" class="prose__lead">{{ lead }}</p>
    </header>
    <slot />
  </article>
</template>

<style scoped lang="less">
.prose {
  width: 720px;
  max-width: 100%;
  color: var(--rp-color-text);
  font-size: 14px;
  line-height: 1.75;

  &__head {
    margin-bottom: 20px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 600;
  }

  &__lead {
    margin: 0;
    color: var(--rp-color-text-muted);
  }

  :deep(h2) {
    margin: 24px 0 8px;
    font-size: 16px;
    font-weight: 600;
  }

  :deep(h3) {
    margin: 18px 0 6px;
    font-size: 14px;
    font-weight: 600;
  }

  :deep(p) {
    margin: 0 0 10px;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 12px;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 3px 0;
  }

  :deep(code) {
    padding: 1px 5px;
    border: 1px solid var(--rp-color-border);
    border-radius: 4px;
    background: var(--rp-color-surface);
    font-family: var(--rp-font-mono);
    font-size: 12.5px;
  }

  :deep(pre) {
    margin: 0 0 14px;
    padding: 12px 14px;
    overflow-x: auto;
    border: 1px solid var(--rp-color-border);
    border-radius: var(--rp-radius);
    background: var(--rp-color-surface);
    font-family: var(--rp-font-mono);
    font-size: 12.5px;
    line-height: 1.6;
  }

  :deep(pre code) {
    padding: 0;
    border: 0;
    background: transparent;
  }

  :deep(table) {
    width: 100%;
    margin: 0 0 14px;
    border-collapse: collapse;
    font-size: 13px;
  }

  :deep(th),
  :deep(td) {
    padding: 6px 10px;
    border: 1px solid var(--rp-color-border);
    text-align: left;
  }

  :deep(th) {
    background: var(--rp-color-surface);
    font-weight: 600;
  }

  :deep(blockquote) {
    margin: 0 0 14px;
    padding: 8px 12px;
    border-left: 3px solid var(--rp-color-primary);
    background: color-mix(in srgb, var(--rp-color-primary) 6%, transparent);
    color: var(--rp-color-text-muted);
  }
}
</style>
