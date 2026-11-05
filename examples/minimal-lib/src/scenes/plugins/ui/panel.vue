<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '抽屉缝位 panel',
  order: 3,
  description: '内容型 UI 只有这一个位置：右侧 420px、同时只开一个、Esc 关闭后焦点回到触发元素。',
})
</script>

<script setup lang="ts">
import { usePlaygroundUi } from '@rinova/playground'

const { togglePanel } = usePlaygroundUi()
</script>

<template>
  <div class="demo-panel-scene">
    <p class="demo-panel-scene__line">
      插件自己的 UI 组件里可以用 <code>usePlaygroundUi()</code> 开抽屉，也可以直接用
      <code>ctx.ui.panel()</code> 拿到的句柄。
    </p>
    <button type="button" class="demo-panel-scene__btn" @click="togglePanel('account')">
      打开「演示环境」抽屉
    </button>
    <p class="demo-panel-scene__hint">
      不提供「插件页面」：要写一页说明就放 <code>.md</code> 场景，要展示内容就开抽屉 ——
      否则侧栏的「目录即结构」会失效。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-panel-scene {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.7;
}

.demo-panel-scene__line {
  margin: 0;
}

.demo-panel-scene__btn {
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

.demo-panel-scene__hint {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

code {
  padding: 1px 5px;
  border: 1px solid var(--rp-color-border);
  border-radius: 4px;
  font-family: var(--rp-font-mono);
  font-size: 12px;
}
</style>
