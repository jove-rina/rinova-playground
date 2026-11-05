<script setup lang="ts">
import { usePlaygroundTheme } from '@rinova/playground'

/**
 * 包裹层的例子：真实项目里换成 ElConfigProvider / naive 的 ConfigProvider / router-view。
 * `data-pw-plugin` 是给场景自查用的 —— 场景里 closest() 一下就知道自己是否被包住。
 */
const theme = usePlaygroundTheme()
</script>

<template>
  <div class="demo-locale" data-pw-plugin="locale" :data-demo-theme="theme">
    <slot />
  </div>
</template>

<style scoped lang="less">
/* 只做包裹，不产生视觉：换成真实 provider 时这里通常什么都不用写 */
.demo-locale {
  display: block;
}
</style>
