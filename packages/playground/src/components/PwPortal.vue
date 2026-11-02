<script setup lang="ts">
withDefaults(defineProps<{ to?: string }>(), { to: 'body' })
</script>

<template>
  <Teleport :to="to">
    <slot />
  </Teleport>
</template>
