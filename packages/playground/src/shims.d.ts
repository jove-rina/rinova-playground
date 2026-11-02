/// <reference types="vite/client" />

// monaco 的 TS 语言贡献是纯副作用模块，没有 d.ts
declare module 'monaco-editor/language/typescript/monaco.contribution'

declare module 'virtual:playground/config' {
  import type { PlaygroundConfig } from './config'
  const config: PlaygroundConfig & { sceneCount: number }
  export default config
}

declare module 'virtual:playground/scenes' {
  import type { SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
}
