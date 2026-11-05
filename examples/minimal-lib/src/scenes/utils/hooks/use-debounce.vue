<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'useDebounce',
  order: 1,
  tags: ['hook', '防抖'],
  description: '左边敲字、右边看防抖后的值；延迟和首值策略都放在参数面板里。',
  files: ['src/lib/useDebounce.ts'],
  showSource: true,
})
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { PwProse, useSceneArgs, useSceneOutput } from '@rinova/playground'
import { useDebounce } from '../../../lib/useDebounce'

const args = useSceneArgs({ delay: 300 }, { labels: { delay: '延迟 (ms)' } })

const raw = ref('')
const debounced = useDebounce(raw, () => args.delay)
const commits = ref(0)

watch(debounced, () => {
  commits.value += 1
})

useSceneOutput(() => ({
  输入: raw.value || '（空）',
  防抖后: debounced.value || '（空）',
  提交次数: commits.value,
}))
</script>

<template>
  <PwProse lead="这里调的就是项目里那个 useDebounce —— 文档页不复制实现，import 真实源码。">
    <div class="hook-demo">
      <input v-model="raw" class="hook-demo__input" type="text" placeholder="快速敲几个字试试…" />
      <div class="hook-demo__cols">
        <div class="hook-demo__col">
          <span class="hook-demo__label">输入（实时）</span>
          <code class="hook-demo__value">{{ raw || '（空）' }}</code>
        </div>
        <div class="hook-demo__col">
          <span class="hook-demo__label">防抖后（{{ args.delay }}ms）</span>
          <code class="hook-demo__value is-accent">{{ debounced || '（空）' }}</code>
        </div>
      </div>
      <span class="hook-demo__count">提交次数：{{ commits }}</span>
    </div>

    <h2>签名</h2>

    <pre data-lang="ts"><code>useDebounce&lt;T&gt;(
  source: MaybeRefOrGetter&lt;T&gt;,
  delay?: MaybeRefOrGetter&lt;number&gt;,   // 默认 300
  options?: { immediate?: boolean }   // 默认 true
): Ref&lt;T&gt;</code></pre>

    <table>
      <thead><tr><th>参数</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>source</code></td><td>源值，ref / getter / 原始值都接受</td></tr>
        <tr><td><code>delay</code></td><td>传 getter 时能跟着表单实时改（本页就是这么用的）</td></tr>
        <tr><td><code>immediate</code></td><td>首次渲染是否立即同步初始值；关掉会从 <code>undefined</code> 开始</td></tr>
      </tbody>
    </table>

    <h2>用的时候注意</h2>

    <ul>
      <li>返回的是 <code>Ref</code>，模板里自动解包，脚本里要 <code>.value</code>。</li>
      <li><code>onBeforeUnmount</code> 里清定时器，否则组件卸载后还会写一次值。</li>
      <li>要「停止后立刻提交」用 <code>delay: 0</code>，不要自己再包一层 setTimeout。</li>
    </ul>
  </PwProse>
</template>

<style scoped lang="less">
.hook-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 4px 0 20px;
  padding: 16px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}

.hook-demo__input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--rp-color-border);
  border-radius: var(--rp-radius);
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  font-size: 13px;

  &:focus-visible {
    border-color: var(--rp-color-primary);
    outline: none;
  }
}

.hook-demo__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hook-demo__col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.hook-demo__label {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
}

.hook-demo__value {
  overflow: hidden;
  font-family: var(--rp-font-mono);
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;

  &.is-accent {
    color: var(--rp-color-primary);
  }
}

.hook-demo__count {
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
}
</style>
