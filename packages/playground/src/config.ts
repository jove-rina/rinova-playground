/** playground 的唯一配置入口。 */

export type PlaygroundUiTheme = 'light' | 'dark' | 'auto'

export interface PlaygroundConfig {
  /** 品牌标题，默认取 package.json 的 name */
  title?: string
  /** 场景扫描根目录，相对项目根 */
  scenes?: string
  /** 是否展示源码面板，默认 true */
  sources?: boolean
  theme?: {
    /** 外壳主题（12 个 CSS 变量），默认 'auto' */
    ui?: PlaygroundUiTheme
    /**
     * 演示画布主题，默认 'light'。
     * 很多组件库只实现了浅色，画布固定浅色可以避免在暗色外壳里渲染成黑底黑字；
     * 'auto' 表示跟随外壳。
     */
    stage?: PlaygroundUiTheme
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
  /**
   * 非组件模块 glob（如 `src/lib/**` + `/*.ts`）：函数 / hooks / 常量的契约。
   * 抽出来的内容进 API 页签的「函数 / 常量」表，并写进 manifest / llms.txt。
   */
  modules?: string[]
  /** 组件契约提取用的 tsconfig，默认项目根的 tsconfig.json */
  tsconfig?: string
  /**
   * 供场景读取的纯常量（如 apiBase / appName）。
   * ⚠️ 会明文进构建产物、任何人都能看到，禁止放 token / 密钥，这类值必须走插件运行时获取。
   * 场景里用 `usePlaygroundEnv()` 读取；插件返回值会覆盖同名字段。
   */
  globals?: Record<string, unknown>
  /**
   * 运行时插件模块路径，如 `['./src/playground/plugins.ts']`。
   * 只接受路径而不是内联对象：配置会 `JSON.stringify` 进虚拟模块，函数无法序列化。
   * 规则：`./x` 相对项目根；`/x` 与 `@/x` 原样交给 Vite。
   */
  plugins?: string[]
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
    /** 访问者能否在按钮里自己换编辑器，默认 true */
    allowChoice?: boolean
    /** 可选的编辑器列表，默认内置的常用几个（vscode/cursor/windsurf/trae/zed/webstorm/idea/sublime） */
    options?: string[]
    /** 是否允许访问者填自定义协议模板（任意 IDE），默认 true */
    allowCustom?: boolean
  }
}

export const defineConfig = (config: PlaygroundConfig): PlaygroundConfig => config