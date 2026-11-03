/// <reference types="vite/client" />

// monaco 的 TS 语言贡献是纯副作用模块，没有 d.ts
declare module 'monaco-editor/language/typescript/monaco.contribution'

// 编辑器样式由使用方的打包器在打开代码面板时按需加载（虚拟模块转发到 @rinova/playground/editor.css）
declare module 'virtual:playground/editor-css'
declare module '@rinova/playground/editor.css'

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

declare module 'virtual:playground/scenes' {
  import type { PageDescriptor, SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
  export const pages: PageDescriptor[]
}
