<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: 'toast',
  order: 2,
  tags: ['反馈'],
  description: '一行调用就能出轻提示，不需要挂宿主组件。',
})
</script>

<script setup lang="ts">
import { toast } from '@rinova/playground'
import Prose from '../../../components/Prose.vue'

const notify = (): void => toast('已复制到剪贴板')
const notifyLong = (): void =>
  toast('这条比较长，用来看单行提示在窄窗口下的表现：超长文案会截断，不会把页面撑出横向滚动条')
</script>

<template>
  <Prose title="toast" lead="底部居中、自动消失、可叠加。框架内部复制源码、复制路径用的也是它。">
    <div class="demo-toast">
      <button type="button" class="demo-toast__btn" @click="notify">短提示</button>
      <button type="button" class="demo-toast__btn" @click="notifyLong">长提示</button>
    </div>

    <pre data-lang="ts"><code>import { toast } from '@rinova/playground'

toast('已复制到剪贴板')</code></pre>

    <table>
      <thead><tr><th>行为</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>出现位置</td><td>视口底部居中，不占文档流</td></tr>
        <tr><td>持续时间</td><td>约 2 秒后自动淡出</td></tr>
        <tr><td>同时多条</td><td>纵向堆叠，最新的在最下面</td></tr>
      </tbody>
    </table>
  </Prose>
</template>

<style scoped lang="less">
.demo-toast {
  display: flex;
  gap: 8px;
  margin: 4px 0 18px;
  padding: 16px;
  border: 1px dashed var(--rp-color-border);
  border-radius: var(--rp-radius);
}

.demo-toast__btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--rp-color-border);
  border-radius: var(--rp-radius);
  background: var(--rp-color-surface);
  color: var(--rp-color-text);
  font-size: 12.5px;
  cursor: pointer;

  &:hover {
    border-color: var(--rp-color-primary);
    color: var(--rp-color-primary);
  }
}
</style>
