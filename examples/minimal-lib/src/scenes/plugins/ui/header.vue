<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '页头缝位 header',
  order: 2,
  description: '页头最右边那个胶囊（当前用户）就是插件放进去的：高 28px，单个上限 220px。',
})
</script>

<script setup lang="ts">
/** 纯说明场景，没有交互状态 */
</script>

<template>
  <div class="demo-header">
    <p class="demo-header__line">
      页头右侧、预览宽度控件之前，能看到一个带用户名的小胶囊 —— 它不是框架画的。
    </p>
    <p class="demo-header__line">
      点它会打开右侧 420px 的抽屉（第三个缝位 <code>ui.panel</code>），里面是插件读到的同一份环境数据。
    </p>
    <p class="demo-header__hint">
      插件只能往里放组件，不能改页头高度、不能占正文区域。塞进去的组件高 28px，页头仍然 49px。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.7;
}

.demo-header__line {
  margin: 0;
}

.demo-header__hint {
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
