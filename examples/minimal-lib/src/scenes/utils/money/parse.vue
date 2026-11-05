<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'parseMoney',
  order: 2,
  tags: ['函数', '解析', '边界'],
  description: '返回 null 而不是抛错——这个场景专门演示「解析失败」长什么样。',
  files: ['src/lib/money.ts'],
  showSource: true,
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { PwProse, useSceneArgs, useSceneOutput } from '@rinova/playground'
import { parseMoney } from '../../../lib/money'

const args = useSceneArgs({ text: '¥1,234.50' }, { labels: { text: '输入文本' } })

const parsed = computed(() => parseMoney(args.text))

useSceneOutput(() => ({
  结果: parsed.value ? parsed.value : 'null（无法解析）',
  币种: parsed.value?.currency ?? '—',
}))
</script>

<template>
  <PwProse lead="解析失败返回 null、不抛错：表单里用户随手敲几个字很正常，不该让整页挂掉。">
    <div class="fn-run">
      <code class="fn-run__call">parseMoney('{{ args.text }}')</code>
      <span class="fn-run__arrow">→</span>
      <output class="fn-run__out" :class="{ 'is-null': !parsed }">
        {{ parsed ? `{ value: ${parsed.value}, currency: '${parsed.currency}' }` : 'null' }}
      </output>
    </div>

    <h2>签名</h2>

    <pre data-lang="ts"><code>parseMoney(text: string): { value: number; currency: CurrencyCode } | null</code></pre>

    <h2>能识别什么</h2>

    <table>
      <thead><tr><th>输入</th><th>结果</th><th>为什么</th></tr></thead>
      <tbody>
        <tr><td><code>¥1,234.50</code></td><td><code>1234.5 / CNY</code></td><td>符号 + 千分位都能吃掉</td></tr>
        <tr><td><code>$99</code></td><td><code>99 / USD</code></td><td>按符号认币种</td></tr>
        <tr><td><code>-12.5</code></td><td><code>-12.5 / CNY</code></td><td>没有符号时默认 CNY</td></tr>
        <tr><td><code>abc</code></td><td><code>null</code></td><td>去掉符号后不是数字</td></tr>
        <tr><td>（空串）</td><td><code>null</code></td><td>空输入不当作 0</td></tr>
      </tbody>
    </table>

    <p>在输入面板里逐条试，输出面板会同步给出解析结果 —— 这比在文档里读五个例子快。</p>
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
  font-size: 13px;
  font-weight: 600;
  color: var(--rp-color-primary);

  &.is-null {
    color: var(--rp-color-danger);
  }
}
</style>
