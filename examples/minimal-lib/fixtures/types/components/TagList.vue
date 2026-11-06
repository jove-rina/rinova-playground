<script setup lang="ts">
import { TagSize } from './types'
import type { TagExtra, TagItem, TagTone } from './types'

const props = withDefaults(
  defineProps<{
    /** 标签列表（对象数组） */
    items: TagItem[]
    /** 色调（引用别名） */
    tone?: TagTone
    /** 尺寸（enum） */
    size?: TagSize
    /** 对齐（内联字面量联合，没有别名） */
    align?: 'left' | 'right'
    /** 额外信息（交叉类型） */
    meta?: TagItem & TagExtra
    /** 混合联合（对象 | 字面量） */
    value?: TagItem | TagTone
    /** 函数参数里引用具名类型，也应收集 */
    onPick?: (item: TagItem) => void
  }>(),
  { tone: 'neutral', size: TagSize.Sm, align: 'left' }
)

const emit = defineEmits<{
  /** 点击标签，参数是标签与下标 */
  (event: 'select', item: TagItem, index: number): void
}>()
</script>

<template>
  <div class="tag-list" :data-align="props.align">
    <span
      v-for="(item, index) in props.items"
      :key="item.label"
      class="tag-list__item"
      @click="emit('select', item, index)"
    >
      {{ item.label }}
    </span>
  </div>
</template>

<style scoped lang="less">
.tag-list {
  display: flex;
  gap: 8px;
}
</style>
