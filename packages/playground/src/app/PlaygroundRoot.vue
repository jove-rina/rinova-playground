<script setup lang="ts">
import { getCurrentInstance, onBeforeMount, ref } from 'vue'
import config from 'virtual:playground/config'
import { pluginModules } from 'virtual:playground/plugins'
import { scenes } from 'virtual:playground/scenes'
import { runPlugins } from '../plugin'
import PlaygroundApp from './App.vue'
import '../styles/theme.less'

/**
 * 挂载根：先把插件初始化完，再渲染 App。
 *
 * 不能写成 async setup（Vue 要求外面套 <Suspense>，否则组件不渲染），
 * 所以用同步 setup + onBeforeMount + `v-if`：骨架先出来，插件就绪后 App 子树才创建，
 * `ctx.app.use()` / `app.provide()` 一定发生在场景组件之前。
 */
type BootState = 'loading' | 'ready' | 'error'

const title = config.title ?? 'Playground'
const state = ref<BootState>('loading')
const message = ref('')
const stack = ref('')

onBeforeMount(async () => {
  document.title = title
  if (!pluginModules.length) {
    state.value = 'ready'
    return
  }
  try {
    // 插件里的 app 就是 createApp 创建的这个实例；此时还没有场景组件
    const app = getCurrentInstance()?.appContext.app
    if (!app) throw new Error('拿不到 App 实例')
    await runPlugins({ app, config, scenes, modules: pluginModules })
    state.value = 'ready'
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error)
    stack.value = error instanceof Error ? (error.stack ?? '') : ''
    state.value = 'error'
  }
})
</script>

<template>
  <PlaygroundApp v-if="state === 'ready'" />

  <div v-else class="pw-boot" :data-pw-plugin-state="state">
    <div class="pw-boot__brand">
      <span class="pw-boot__logo" aria-hidden="true" />
      <span class="pw-boot__title">{{ title }}</span>
    </div>

    <p v-if="state === 'loading'" class="pw-boot__hint">正在初始化演示环境…</p>

    <div v-else class="pw-boot__error" role="alert">
      <p class="pw-boot__head">演示环境初始化失败</p>
      <p class="pw-boot__message">{{ message }}</p>
      <details v-if="stack" class="pw-boot__stack">
        <summary>调用栈</summary>
        <pre>{{ stack }}</pre>
      </details>
    </div>
  </div>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-boot {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  padding: 28px 32px;
  background: var(--rp-color-bg);
  color: var(--rp-color-text);
  box-sizing: border-box;
}

.pw-boot__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pw-boot__logo {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: var(--rp-color-primary);
}

.pw-boot__title {
  font-size: 13px;
  font-weight: 600;
}

.pw-boot__hint {
  margin: 0;
  color: var(--rp-color-text-muted);
  font-size: 13px;
}

.pw-boot__error {
  max-width: 720px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--rp-color-danger) 45%, transparent);
  border-radius: var(--rp-radius);
  background: color-mix(in srgb, var(--rp-color-danger) 8%, transparent);
}

.pw-boot__head {
  margin: 0 0 6px;
  color: var(--rp-color-danger);
  font-size: 13px;
  font-weight: 600;
}

.pw-boot__message {
  margin: 0;
  font-family: var(--rp-font-mono);
  font-size: 12px;
  word-break: break-word;
  white-space: pre-wrap;
}

.pw-boot__stack {
  margin-top: 8px;
  font-size: 11.5px;

  summary {
    cursor: pointer;
    color: var(--rp-color-text-muted);
  }

  pre {
    max-height: 260px;
    margin: 6px 0 0;
    overflow: auto;
    font-family: var(--rp-font-mono);
    font-size: 11px;
    white-space: pre-wrap;
  }
}
</style>
