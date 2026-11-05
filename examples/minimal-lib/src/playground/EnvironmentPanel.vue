<script setup lang="ts">
import { computed } from 'vue'
import { usePlaygroundEnv, usePlaygroundPlugin, usePlaygroundTheme } from '@rinova/playground'
import type { AuthApi } from './types'

/** 抽屉内容：切换账号 + 当前登录态 + 环境变量，读的都是场景里同一份数据 */
const env = usePlaygroundEnv<Record<string, unknown>>()
const auth = usePlaygroundPlugin<AuthApi>('auth')
const theme = usePlaygroundTheme()

/** 只列标量；对象（比如插件返回的整个 user）不往抽屉里堆 JSON */
const scalars = computed(() =>
  Object.entries(env)
    .filter(([, value]) => value === null || typeof value !== 'object')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, String(value ?? '—')] as const)
)

const objects = computed(() =>
  Object.entries(env)
    .filter(([, value]) => value !== null && typeof value === 'object')
    .sort(([a], [b]) => a.localeCompare(b))
)

const tokenTail = computed(() => auth.user.token.slice(-6))
</script>

<template>
  <div class="demo-panel">
    <section class="demo-panel__card">
      <header class="demo-panel__head">
        <h3 class="demo-panel__title">切换账号</h3>
        <span class="demo-panel__tag">插件 auth</span>
      </header>
      <div class="demo-panel__users">
        <button
          v-for="user in auth.users"
          :key="user.id"
          type="button"
          class="demo-panel__user"
          :class="{ 'is-active': user.id === auth.user.id }"
          :aria-pressed="user.id === auth.user.id"
          @click="auth.switchTo(user.id)"
        >
          <span class="demo-panel__avatar">{{ user.name.slice(0, 1) }}</span>
          <span class="demo-panel__who">{{ user.name }}</span>
          <span class="demo-panel__role">{{ user.role }}</span>
          <span v-if="user.id === auth.user.id" class="demo-panel__now">当前</span>
        </button>
      </div>
    </section>

    <section class="demo-panel__card">
      <header class="demo-panel__head">
        <h3 class="demo-panel__title">登录态</h3>
        <span class="demo-panel__tag">切了立刻变</span>
      </header>
      <dl class="demo-panel__rows">
        <div class="demo-panel__row">
          <dt>用户</dt>
          <dd>{{ auth.user.name }}</dd>
        </div>
        <div class="demo-panel__row">
          <dt>角色</dt>
          <dd>{{ auth.user.role }}</dd>
        </div>
        <div class="demo-panel__row">
          <dt>token</dt>
          <dd>…{{ tokenTail }}</dd>
        </div>
      </dl>
    </section>

    <section class="demo-panel__card">
      <header class="demo-panel__head">
        <h3 class="demo-panel__title">全局变量</h3>
        <span class="demo-panel__tag">globals + 插件返回值（快照）</span>
      </header>
      <dl class="demo-panel__rows">
        <div v-for="[key, value] in scalars" :key="key" class="demo-panel__row">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </div>
        <div v-for="[key, value] in objects" :key="key" class="demo-panel__row">
          <dt>{{ key }}</dt>
          <dd class="is-object">对象 · {{ Object.keys(value as Record<string, unknown>).length }} 个字段</dd>
        </div>
      </dl>
    </section>

    <p class="demo-panel__note">
      切账号只改插件状态，不动路由：抽屉、页头胶囊和场景里的 <code>usePlaygroundPlugin('auth')</code>
      会同时更新。当前外壳主题：{{ theme }}。
    </p>
  </div>
</template>

<style scoped lang="less">
.demo-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-panel__card {
  padding: 12px 14px 6px;
  border: 1px solid var(--rp-color-border);
  border-radius: 10px;
  background: var(--rp-color-surface);
}

.demo-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--rp-color-border) 70%, transparent);
}

.demo-panel__title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
}

.demo-panel__tag {
  color: var(--rp-color-text-muted);
  font-size: 10.5px;
}

.demo-panel__users {
  display: flex;
  flex-direction: column;
  padding: 4px 0 6px;
}

.demo-panel__user {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--rp-color-text);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--rp-color-text) 6%, transparent);
  }

  &.is-active {
    background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
    color: var(--rp-color-primary);
  }
}

.demo-panel__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--rp-color-text) 10%, transparent);
  font-size: 10px;
  font-weight: 600;

  .is-active & {
    background: var(--rp-color-primary);
    color: var(--rp-color-primary-contrast);
  }
}

.demo-panel__who {
  font-weight: 500;
}

.demo-panel__role {
  color: var(--rp-color-text-muted);
  font-family: var(--rp-font-mono);
  font-size: 10.5px;
}

.demo-panel__now {
  margin-left: auto;
  font-size: 10.5px;
}

.demo-panel__rows {
  margin: 0;
}

.demo-panel__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;

  & + & {
    border-top: 1px solid color-mix(in srgb, var(--rp-color-border) 45%, transparent);
  }

  dt {
    flex: 0 0 74px;
    color: var(--rp-color-text-muted);
    font-size: 11.5px;
  }

  dd {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-family: var(--rp-font-mono);
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
}

.demo-panel__row dd.is-object {
  color: var(--rp-color-text-muted);
  font-family: inherit;
  font-size: 11.5px;
}

.demo-panel__note {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 11.5px;
  line-height: 1.7;

  code {
    padding: 0 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--rp-color-text) 7%, transparent);
    font-family: var(--rp-font-mono);
    font-size: 11px;
  }
}
</style>
