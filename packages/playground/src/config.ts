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
  /** 部署子路径（写入 Vite 的 base，影响资源路径；同时作为路由前缀的默认值） */
  base?: string
  /**
   * 只作用于场景 URL 的前缀，不会写进 Vite 的 base。
   * 多入口（MPA）部署时用：资源和主应用共享根路径，但场景路由要落在自己的子路径下，如 '/playground/'。
   * 不配时回落 base ?? '/'。
   */
  routeBase?: string
  /** dev server 端口 */
  port?: number
  /** 契约清单要扫描的组件 glob（如 src/components 下所有 .vue）；不配则不生成 manifest */
  components?: string[]
  /** 组件契约提取用的 tsconfig，默认项目根的 tsconfig.json */
  tsconfig?: string
  /**
   * 分组（scenes 下的一级目录名）→ 侧栏显示名。
   * 例如 `{ 'tao-common': 'Tao 通用组件' }`；不配时用目录名首字母大写化。
   */
  groups?: Record<string, string>
  /** 本地 IDE 打开：preset 决定用哪个编辑器的 URL scheme */
  editor?: {
    /** 'vscode' | 'cursor' | 'webstorm' | 'custom' */
    preset?: 'vscode' | 'cursor' | 'webstorm' | 'custom'
    /** preset = 'custom' 时的模板，支持 {file} / {line} */
    custom?: string
    /** 是否把项目根绝对路径写进产物，默认 true；对外发布时设为 false（按钮降级为复制路径） */
    exposeRoot?: boolean
  }
}

export const defineConfig = (config: PlaygroundConfig): PlaygroundConfig => config
