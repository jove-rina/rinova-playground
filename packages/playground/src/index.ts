/// <reference path="./shims.d.ts" />
import type { Component } from 'vue'
import { createApp } from 'vue'

export { defineConfig } from './config'
export type { PlaygroundConfig, PlaygroundUiTheme } from './config'
export { defineSceneMeta, definePageMeta } from './scene-meta'
export type { SceneMeta, PageMeta } from './scene-meta'
export type { SceneDescriptor, PageDescriptor, SceneSection } from './types'
export { PwDemoGrid, PwDemo, PwSceneNote, PwApiBrief } from './components/scene'
export { PwProse, PwCallout, PwSteps, PwStep, PwMarkdown } from './components/prose'
export type { CalloutTone, MarkdownBlock } from './components/prose'
export { defineMarkdownScene } from './components/prose/markdown-scene'
export { toast } from './components/toast'
export { useSceneArgs, currentArgs, currentArgsSlots } from './payload/args'
export type { SceneArgs, SceneArgsOptions, SceneArgsBinding } from './payload/args'
export { useSceneOutput, currentOutput, currentOutputSlots } from './payload/output'
export type { SceneSnapshot, SceneOutputBinding } from './payload/output'
export { definePlaygroundPlugin } from './plugin'
export type {
  PlaygroundPlugin,
  PlaygroundPluginContext,
  PlaygroundResolvedConfig,
  PlaygroundUiApi,
  PlaygroundUiOptions,
  PlaygroundPanelOptions,
  PlaygroundPanelHandle,
} from './plugin'
export {
  usePlaygroundEnv,
  usePlaygroundPlugin,
  usePlaygroundTheme,
  usePlaygroundUi,
  openPlaygroundPanel,
  closePlaygroundPanel,
  togglePlaygroundPanel,
} from './plugin'

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

  const { default: Root } = (await import('./app/PlaygroundRoot.vue')) as { default: Component }

  createApp(Root).mount(target as Element)
}