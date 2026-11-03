<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '图标按钮 iconOnly',
  order: 6,
  section: 'props',
  api: ['iconOnly'],
  description: 'iconOnly 收成正方形，内容来自 icon 插槽。',
})
</script>
<script setup lang="ts">
import { MyButton } from '../../../lib'
</script>

<template>
  <div class="row">
    <MyButton icon-only size="sm"><template #icon>＋</template></MyButton>
    <MyButton icon-only size="md"><template #icon>＋</template></MyButton>
    <MyButton icon-only size="lg" variant="ghost"><template #icon>✕</template></MyButton>
  </div>
</template>

<style scoped lang="less">
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
