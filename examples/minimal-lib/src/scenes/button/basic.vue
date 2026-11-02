<script setup lang="ts">
import { ref } from 'vue'
import { MyButton } from '../../lib'

const count = ref(0)
</script>

<template>
  <div class="demo">
    <MyButton @click="count++">点我 +1</MyButton>
    <span class="demo__hint">已点击 {{ count }} 次</span>
  </div>
</template>

<style scoped lang="less">
.demo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}

.demo__hint {
  font-size: 13px;
  color: #667085;
}
</style>
