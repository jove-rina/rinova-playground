<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'ORDER_STATUS',
  order: 1,
  tags: ['常量', '字典'],
  description: '字典类文件不需要「演示」，需要一张能对照的表加一个真实渲染。',
  files: ['src/lib/constants.ts'],
  showSource: true,
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { PwProse, useSceneArgs } from '@rinova/playground'
import { ORDER_STATUS, ORDER_STATUS_LIST, type OrderStatus } from '../../../lib/constants'

const args = useSceneArgs(
  { status: 'draft' as OrderStatus },
  {
    options: { status: ORDER_STATUS_LIST.map((item) => item.value) },
    labels: { status: '当前状态' },
  }
)

const current = computed(() => ORDER_STATUS[args.status])
</script>

<template>
  <PwProse lead="表是给人查的，下面是给眼睛看的：改参数面板里的状态，标签颜色立刻变。">
    <div class="status-demo">
      <span class="status-demo__label">当前</span>
      <span :class="['status-tag', `is-${current.tone}`]">{{ current.label }}</span>
      <code class="status-demo__code">ORDER_STATUS['{{ args.status }}']</code>
      <span class="status-demo__meta">{{ current.final ? '终态' : '可流转' }}</span>
    </div>

    <h2>全部取值</h2>

    <table>
      <thead><tr><th>value</th><th>label</th><th>tone</th><th>final</th></tr></thead>
      <tbody>
        <tr v-for="item in ORDER_STATUS_LIST" :key="item.value">
          <td><code>{{ item.value }}</code></td>
          <td>
            <span :class="['status-tag', `is-${item.tone}`]">{{ item.label }}</span>
          </td>
          <td><code>{{ item.tone }}</code></td>
          <td>{{ item.final ? '是' : '否' }}</td>
        </tr>
      </tbody>
    </table>

    <h2>为什么不是数组</h2>

    <p>
      <code>ORDER_STATUS</code> 是 <code>Record&lt;OrderStatus, OrderStatusMeta&gt;</code>：接口返回
      <code>'paid'</code> 时可以直接 <code>ORDER_STATUS[status]</code> 取到标签，不用 <code>find()</code>。
      需要下拉框或循环渲染时用导出的 <code>ORDER_STATUS_LIST</code>，它保持声明顺序。
    </p>
  </PwProse>
</template>

<style scoped lang="less">
.status-demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 4px 0 20px;
  padding: 14px 16px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}

.status-demo__label {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
}

.status-demo__code {
  font-family: var(--rp-font-mono);
  font-size: 12px;
}

.status-demo__meta {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11.5px;

  &.is-neutral {
    background: color-mix(in srgb, var(--rp-color-text) 10%, transparent);
    color: var(--rp-color-text);
  }

  &.is-success {
    background: color-mix(in srgb, var(--rp-color-success) 14%, transparent);
    color: var(--rp-color-success);
  }

  &.is-warning {
    background: color-mix(in srgb, var(--rp-color-warning) 16%, transparent);
    color: var(--rp-color-warning);
  }

  &.is-danger {
    background: color-mix(in srgb, var(--rp-color-danger) 14%, transparent);
    color: var(--rp-color-danger);
  }
}
</style>
