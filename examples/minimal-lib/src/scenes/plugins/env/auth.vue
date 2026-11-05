<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '登录态 auth',
  order: 2,
  description: '插件 setup 的返回值就是场景里读到的状态；初始化完成前不会渲染任何场景。',
})
</script>

<script setup lang="ts">
import { usePlaygroundPlugin } from '@rinova/playground'
import type { AuthApi } from '../../../playground/types'

const auth = usePlaygroundPlugin<AuthApi>('auth')
</script>

<template>
  <div class="demo-auth">
    <p>
      <span class="demo-auth__key">用户</span>
      <span class="demo-auth__name">{{ auth.user.name }}</span>
    </p>
    <p>
      <span class="demo-auth__key">角色</span>
      <code>{{ auth.user.role }}</code>
    </p>
    <p>
      <span class="demo-auth__key">token</span>
      <code>…{{ auth.user.token.slice(-6) }}</code>
    </p>
    <p class="demo-auth__hint">
      这个插件在 <code>src/playground/plugins.ts</code> 里，<code>setup</code> 延迟 400ms 才返回 ——
      首屏看到骨架就是这个原因。点页头右侧的胶囊切换账号，这里会立刻跟着变。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-auth {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;

  p {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  code {
    font-family: var(--rp-font-mono);
    font-size: 12.5px;
  }
}

.demo-auth__key {
  width: 64px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

.demo-auth__name {
  font-weight: 600;
}

.demo-auth__hint {
  margin-top: 2px !important;
  color: var(--rp-color-text-muted);
  font-size: 12px;
  line-height: 1.6;
}
</style>
