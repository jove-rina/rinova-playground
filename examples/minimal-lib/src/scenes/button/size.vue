<script setup lang="ts">
import { ref } from 'vue'
import { MyButton } from '../../lib'

const sizes = ['sm', 'md', 'lg'] as const
const current = ref<(typeof sizes)[number]>('md')
</script>

<template>
  <div class="demo">
    <div class="demo__switch">
      <button
        v-for="size in sizes"
        :key="size"
        type="button"
        class="demo__switch-btn"
        :class="{ 'is-active': current === size }"
        @click="current = size"
      >
        {{ size }}
      </button>
    </div>

    <MyButton :size="current">当前尺寸：{{ current }}</MyButton>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}

.demo__switch {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  align-self: flex-start;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f6f7f9;
}

.demo__switch-btn {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.demo__switch-btn.is-active {
  background: #fff;
  color: #2f6feb;
  box-shadow: 0 1px 2px rgb(16 24 40 / 10%);
}
</style>
