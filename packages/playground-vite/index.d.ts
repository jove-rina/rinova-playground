import type { Plugin } from 'vite'

export interface PlaygroundPluginOptions {
  /** 指定配置文件路径，默认在项目根查找 playground.config.{ts,mts,js,mjs} */
  configFile?: string
  /** 覆盖配置里的 scenes 目录 */
  scenes?: string
}

export declare function playground(options?: PlaygroundPluginOptions): Plugin

export default playground
