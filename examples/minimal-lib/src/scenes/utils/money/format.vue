<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'formatMoney',
  order: 1,
  tags: ['函数', '格式化'],
  description: '一个纯函数的文档页：签名、参数表、当场能改的参数、当场出的返回值。',
  files: ['src/lib/money.ts'],
  showSource: true,
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { PwProse, useSceneArgs, useSceneOutput } from '@rinova/playground'
import { formatMoney, type CurrencyCode } from '../../../lib/money'

const args = useSceneArgs(
  {
    amount: 1234.5,
    currency: 'CNY' as CurrencyCode,
    autoDecimals: true,
    decimals: 2,
    thousands: true,
  },
  {
    options: { currency: ['CNY', 'USD', 'JPY', 'EUR'] },
    labels: {
      amount: '金额',
      currency: '币种',
      autoDecimals: '小数位跟随币种',
      decimals: '小数位',
      thousands: '千分位',
    },
  }
)

const result = computed(() =>
  formatMoney(args.amount, {
    currency: args.currency,
    thousands: args.thousands,
    ...(args.autoDecimals ? {} : { decimals: args.decimals }),
  })
)

useSceneOutput(() => ({ 返回值: result.value, 字符数: result.value.length }))
</script>

<template>
  <PwProse lead="同一个函数，比静态 API 文档多一件事：参数能当场改，返回值当场出。">
    <div class="fn-run">
      <code class="fn-run__call">formatMoney({{ args.amount }}<template v-if="!args.autoDecimals">, {{ '{ decimals: ' }}{{ args.decimals }}{{ ' }' }}</template>)</code>
      <span class="fn-run__arrow">→</span>
      <output class="fn-run__out">{{ result }}</output>
    </div>

    <h2>签名</h2>

    <pre data-lang="ts"><code>formatMoney(value: number, options?: FormatMoneyOptions): string</code></pre>

    <h2>参数</h2>

    <table>
      <thead><tr><th>参数</th><th>类型</th><th>默认</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>value</code></td><td><code>number</code></td><td>—</td><td>金额数值，允许负数</td></tr>
        <tr><td><code>options.currency</code></td><td><code>CurrencyCode</code></td><td><code>'CNY'</code></td><td>币种，决定符号与默认小数位</td></tr>
        <tr><td><code>options.decimals</code></td><td><code>number</code></td><td>按币种</td><td>小数位，会被夹在 0–6 之间</td></tr>
        <tr><td><code>options.thousands</code></td><td><code>boolean</code></td><td><code>true</code></td><td>是否加千分位</td></tr>
      </tbody>
    </table>

    <h2>要点</h2>

    <ul>
      <li>小数位不传时按币种取：<code>JPY</code> 是 0 位，其余 2 位 —— 在参数面板关掉「跟随币种」再传 0 可以对比。</li>
      <li>非有限数字（<code>NaN</code> / <code>Infinity</code>）按 0 处理，不抛错：这个函数常出现在列表渲染里，抛一次就整页白。</li>
      <li>符号与负号顺序固定为 <code>-¥</code>，不是 <code>¥-</code>。</li>
    </ul>
  </PwProse>
</template>

<style scoped lang="less">
.fn-run {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 4px 0 20px;
  padding: 14px 16px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}

.fn-run__call {
  font-family: var(--rp-font-mono);
  font-size: 12.5px;
}

.fn-run__arrow {
  color: var(--rp-color-text-muted);
}

.fn-run__out {
  font-family: var(--rp-font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--rp-color-primary);
}
</style>
