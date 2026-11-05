<script setup lang="ts">
import { computed } from 'vue'
import { usePlaygroundPlugin, usePlaygroundUi } from '@rinova/playground'
import type { AuthApi } from './types'

/** 页头缝位里的当前用户：点开右侧抽屉（里面能切换账号） */
const auth = usePlaygroundPlugin<AuthApi>('auth')
const { togglePanel } = usePlaygroundUi()

const initial = computed(() => auth.user.name.slice(0, 1))
</script>

<template>
  <button
    type="button"
    class="demo-account"
    :title="`${auth.user.name}（${auth.user.role}）· 点开切换账号`"
    @click="togglePanel('account')"
  >
    <span class="demo-account__avatar">{{ initial }}</span>
    <span class="demo-account__name">{{ auth.user.name }}</span>
  </button>
</template>

<style scoped lang="less">
.demo-account {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 200px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--rp-color-border);
  border-radius: 999px;
  background: var(--rp-color-surface);
  color: var(--rp-color-text);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: color-mix(in srgb, var(--rp-color-primary) 45%, var(--rp-color-border));
    color: var(--rp-color-primary);
  }
}

.demo-account__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--rp-color-primary);
  color: var(--rp-color-primary-contrast);
  font-size: 10px;
  font-weight: 600;
}

.demo-account__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
