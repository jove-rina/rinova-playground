/// <reference path="./shims.d.ts" />
import type { Component } from 'vue'
import { createApp } from 'vue'

export { defineConfig } from './config'
export type { PlaygroundConfig, PlaygroundCodeViewer, PlaygroundUiTheme } from './config'
export { defineSceneMeta } from './scene-meta'
export type { SceneMeta } from './scene-meta'
export type { SceneDescriptor } from './types'
export { toast } from './components/toast'
export { useSceneArgs, currentArgs } from './payload/args'
export type { SceneArgs, SceneArgsOptions } from './payload/args'
export { useSceneOutput, currentOutput } from './payload/output'
export type { SceneSnapshot } from './payload/output'

export interface CreatePlaygroundOptions {
  /** 挂载点，默认 `#app` */
  el?: string | HTMLElement
}

/**
 * 挂载 playground。
 *
 * ```ts
 * import { createPlayground } from '@rinova/playground'
 * createPlayground()
 * ```
 */
export const createPlayground = async (options: CreatePlaygroundOptions = {}): Promise<void> => {
  const target =
    typeof options.el === 'string'
      ? document.querySelector(options.el)
      : (options.el ?? document.querySelector('#app'))

  if (!target) {
    throw new Error(
      '[rinova-playground] 未找到挂载容器。请在 index.html 中提供 <div id="app"></div>，或调用 createPlayground({ el })'
    )
  }

  const { default: App } = (await import('./app/App.vue')) as { default: Component }

  createApp(App).mount(target as Element)
}
