<script setup lang="ts">
import { MyButton, MyCard } from '../../lib'
</script>

<template>
  <MyCard title="卡片标题" description="这是一个最小的卡片场景，用来验证侧栏分组与预览布局。">
    卡片正文内容。源码面板读取的就是这个文件的原文，改这里源码面板立刻同步。

    <template #footer>
      <div class="demo__footer">
        <MyButton size="sm" variant="ghost">取消</MyButton>
        <MyButton size="sm">确定</MyButton>
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
