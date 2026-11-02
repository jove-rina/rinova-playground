/// <reference types="vite/client" />

// monaco 的 TS 语言贡献是纯副作用模块，没有 d.ts
declare module 'monaco-editor/language/typescript/monaco.contribution'

// 编辑器样式由使用方的打包器在打开代码面板时按需加载
declare module '@rinova/playground/editor.css'

declare module 'virtual:playground/config' {
  import type { PlaygroundConfig } from './config'
  const config: PlaygroundConfig & { sceneCount: number }
  export default config
}

declare module 'virtual:playground/scenes' {
  import type { SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
}
