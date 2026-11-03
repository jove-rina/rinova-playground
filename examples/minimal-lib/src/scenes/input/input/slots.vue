<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '插槽 prefix',
  order: 6,
  section: 'slots',
  api: ['prefix', 'suffix'],
  description: 'prefix / suffix 两个插槽，放图标或单位。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyInput } from '../../../lib'

const price = ref('128.00')
const keyword = ref('')
</script>

<template>
  <div class="col">
    <MyInput v-model="price">
      <template #prefix>¥</template>
      <template #suffix>元</template>
    </MyInput>
    <MyInput v-model="keyword" placeholder="搜索">
      <template #prefix>⌕</template>
    </MyInput>
  </div>
</template>

<style scoped lang="less">
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
