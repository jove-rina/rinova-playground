<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <article class="my-card">
    <header class="my-card__head">
      <h3 class="my-card__title">{{ title }}</h3>
      <p v-if="description" class="my-card__desc">{{ description }}</p>
    </header>
    <div class="my-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="my-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.my-card {
  width: 360px;
  max-width: 100%;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(16 24 40 / 6%);
  overflow: hidden;
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
  padding: 12px 16px 16px;
  font-size: 13px;
  color: #1c2024;
}

.my-card__footer {
  padding: 10px 16px;
  border-top: 1px solid #eef0f3;
  background: #fafbfc;
}
</style>
