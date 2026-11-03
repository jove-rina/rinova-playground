<script setup lang="ts">
/** 场景内说明块（引用样式） */
defineProps<{ text?: string }>()
</script>

<template>
  <div class="pw-scene-note">
    <slot>{{ text }}</slot>
  </div>
</template>

<style scoped lang="less">
.pw-scene-note {
  padding: 8px 12px;
  border-left: 3px solid var(--rp-color-primary);
  border-radius: 0 6px 6px 0;
  background: color-mix(in srgb, var(--rp-color-primary) 6%, transparent);
  color: var(--rp-color-text-muted);
  font-size: 12.5px;
  line-height: 1.65;
}
</style>
