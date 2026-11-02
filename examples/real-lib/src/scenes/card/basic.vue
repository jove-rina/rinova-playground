<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '卡片 · 组合',
  order: 1,
  tags: ['slots', 'composition'],
  description: 'Card 由七个部件组合而成，展示 shadcn 的 slot 组合风格。',
})
</script>

<script setup lang="ts">
import { useSceneArgs } from '@rinova/playground'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const args = useSceneArgs({ small: false }, { labels: { small: '紧凑尺寸' } })
</script>

<template>
  <div class="w-full p-6">
    <Card :size="args.small ? 'sm' : 'default'" class="max-w-sm">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          团队报价单
          <Badge variant="secondary">草稿</Badge>
        </CardTitle>
        <CardDescription>昨天更新 · 3 个版本</CardDescription>
      </CardHeader>
      <CardContent class="text-muted-foreground">
        共 42 行物料，合计 ¥128,600。点击下方按钮查看明细。
      </CardContent>
      <CardFooter class="flex gap-2">
        <Button size="sm">查看</Button>
        <Button size="sm" variant="outline">复制</Button>
      </CardFooter>
    </Card>
  </div>
</template>
