<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '卡片 · footer 插槽',
  order: 5,
  tags: ['slot', 'footer'],
  description: '通过 footer 插槽放入操作按钮。',
})
</script>

<script setup lang="ts">
import { MyButton, MyCard } from '../../components'
</script>

<template>
  <MyCard title="确认删除？" description="删除后不可恢复。">
    这条记录将永久删除。

    <template #footer>
      <div class="demo__footer">
        <MyButton size="sm" variant="ghost">取消</MyButton>
        <MyButton size="sm">删除</MyButton>
      </div>
    </template>
  </MyCard>
</template>

<style scoped lang="less">
.demo__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
