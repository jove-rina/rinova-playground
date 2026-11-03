<script setup lang="ts">
import { computed, ref } from 'vue'

/** 表格列定义 */
export interface TableColumn {
  /** 字段名，对应 rows 里的 key */
  key: string
  /** 表头文案 */
  title: string
  /** 列宽（px），不填自适应 */
  width?: number
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
}

/** 排序回调参数 */
export interface SortPayload {
  /** 排序列的 key */
  key: string
  /** 排序方向 */
  direction: 'asc' | 'desc'
}

/** 表格配置 */
export interface TableConfig {
  /** 每页条数，0 表示不分页 */
  pageSize?: number
  /** 是否显示表头 */
  showHeader?: boolean
  /** 斑马纹 */
  striped?: boolean
}

const props = withDefaults(
  defineProps<{
    /** 列定义（对象数组） */
    columns: TableColumn[]
    /** 数据行，键对应列的 key */
    rows: Array<Record<string, string | number>>
    /** 表格配置（对象） */
    config?: TableConfig
  }>(),
  { config: () => ({ pageSize: 0, showHeader: true, striped: false }) }
)

const emit = defineEmits<{
  /** 点击某一行，参数是整行数据与下标 */
  (event: 'rowClick', row: Record<string, string | number>, index: number): void
  /** 排序变化，参数是列 key 与方向 */
  (event: 'sortChange', payload: SortPayload): void
}>()

const bodyEl = ref<HTMLElement | null>(null)
const visible = computed(() => {
  const size = props.config?.pageSize ?? 0
  return size > 0 ? props.rows.slice(0, size) : props.rows
})

const sortBy = (key: string): void => {
  emit('sortChange', { key, direction: 'asc' })
}

defineExpose({
  /** 滚回表格顶部 */
  scrollToTop: (): void => bodyEl.value?.scrollTo({ top: 0 }),
  /** 当前可见行数 */
  visibleCount: (): number => visible.value.length,
})
</script>

<template>
  <div class="my-table" :class="{ 'is-striped': config?.striped }">
    <table>
      <thead v-if="config?.showHeader !== false">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width ? `${column.width}px` : undefined, textAlign: column.align ?? 'left' }"
            @click="sortBy(column.key)"
          >
            {{ column.title }}
          </th>
        </tr>
      </thead>
      <tbody ref="bodyEl">
        <tr v-for="(row, index) in visible" :key="index" @click="emit('rowClick', row, index)">
          <td
            v-for="column in columns"
            :key="column.key"
            :style="{ textAlign: column.align ?? 'left' }"
          >
            {{ row[column.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="less">
.my-table {
  width: 100%;
  max-width: 520px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }

  th {
    padding: 8px 10px;
    border-bottom: 1px solid #eef0f3;
    background: #f8fafc;
    color: #475467;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid #f2f4f7;
    color: #1c2024;
  }

  tbody tr {
    cursor: pointer;

    &:hover {
      background: #f8fafc;
    }
  }

  &.is-striped tbody tr:nth-child(even) {
    background: #fafbfc;
  }
}
</style>
