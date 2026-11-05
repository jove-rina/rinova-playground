/// <reference types="vite/client" />

declare module 'virtual:playground/config' {
  import type { PlaygroundConfig } from './config'
  const config: PlaygroundConfig & {
    sceneCount: number
    pageCount: number
    /** 项目根绝对路径，供「在本地 IDE 打开」拼路径；editor.exposeRoot=false 时为空串 */
    root?: string
  }
  export default config
}

declare module 'virtual:playground/api' {
  import type { ComponentApi } from './types'
  import type { ModuleApi } from './module-api'
  export const api: Record<string, ComponentApi>
  /** 页 id → 组件名 */
  export const pageComponents: Record<string, string>
  /** 模块名 → 非组件契约（函数 / hooks / 常量） */
  export const modules: Record<string, ModuleApi>
  /** 页 id → 模块名 */
  export const pageModules: Record<string, string>
}

declare module 'virtual:playground/scenes' {
  import type { PageDescriptor, SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
  export const pages: PageDescriptor[]
}

declare module 'virtual:playground/plugins' {
  import type { PlaygroundPlugin } from './plugin'
  /** 由 config.plugins 生成的懒加载入口；不配时为空数组 */
  export const pluginModules: Array<() => Promise<PlaygroundPlugin | PlaygroundPlugin[]>>
}