<script setup lang="ts">
import { MyButton } from '../../lib'
</script>

<template>
  <div class="demo">
    <MyButton disabled>禁用状态</MyButton>
    <MyButton variant="ghost" disabled>禁用幽灵态</MyButton>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  gap: 12px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}
</style>
