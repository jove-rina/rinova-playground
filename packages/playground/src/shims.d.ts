/// <reference types="vite/client" />

declare module 'virtual:playground/config' {
  import type { PlaygroundConfig } from './config'
  const config: PlaygroundConfig & { sceneCount: number }
  export default config
}

declare module 'virtual:playground/scenes' {
  import type { SceneDescriptor } from './types'
  export const scenes: SceneDescriptor[]
}
