/** playground 的唯一配置入口。 */

export type PlaygroundUiTheme = 'light' | 'dark' | 'auto'
export type PlaygroundCodeViewer = 'monaco' | 'shiki'

export interface PlaygroundConfig {
  /** 品牌标题，默认取 package.json 的 name */
  title?: string
  /** 场景扫描根目录，相对项目根 */
  scenes?: string
  /** 是否展示源码面板，默认 true */
  sources?: boolean
  /** 代码区实现：可编辑编辑器 / 只读高亮块，默认 'monaco' */
  codeViewer?: PlaygroundCodeViewer
  theme?: {
    /** 外壳主题（12 个 CSS 变量），默认 'auto' */
    ui?: PlaygroundUiTheme
    /** 代码区 shiki 主题名，默认 'vitesse-dark' */
    code?: string
  }
  /** 扫描时排除的 glob（相对 scenes 根） */
  exclude?: string[]
  /** 部署子路径 */
  base?: string
  /** dev server 端口 */
  port?: number
}

export const defineConfig = (config: PlaygroundConfig): PlaygroundConfig => config
