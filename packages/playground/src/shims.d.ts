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
  export const api: Record<string, ComponentApi>
  /** 页 id → 组件名 */
  export const pageComponents: Record<string, string>
}

declare module 'virtual:playground/scenes' {
  import type { PageDescriptor, SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
  export const pages: PageDescriptor[]
}