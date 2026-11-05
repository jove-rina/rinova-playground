/**
 * 场景元信息。可选：不写也能用，只在需要覆盖标题 / 排序 / 输入输出面板时写。
 */
export interface SceneMeta {
  /** 覆盖由文件名推导出的标题 */
  title?: string
  /** 同层排序权重，小的在前 */
  order?: number
  /** 搜索与筛选用标签 */
  tags?: string[]
  /** 场景说明，显示在预览区上方 */
  description?: string
  /** 输入 / 输出快照 */
  payload?: {
    input?: () => Record<string, unknown>
    output?: () => Record<string, unknown>
  }
  /** 额外要展示的源码文件（相对项目根） */
  files?: string[]
  /** 隐藏于页内索引与侧栏计数，但可通过锚点直达 */
  hideInNav?: boolean
  /**
   * 页内索引分组，默认 'overview'。
   * 顺序固定：概要 → Props → Events → Exposes → Slots
   */
  section?: 'overview' | 'props' | 'events' | 'exposes' | 'slots'
  /** 本场景覆盖的公开 API 名（如 ['disabled']），显示在场景标题下方 */
  api?: string[]
  /** 这一个场景是否展示源码；覆盖 page 与全局配置 */
  showSource?: boolean
}

/** 组件页级元信息：写在 `<页>/meta.ts`，导出 `pageMeta` */
export interface PageMeta {
  /** 页标题，默认按目录名首字母大写化 */
  title?: string
  /** 页说明，显示在页头 */
  description?: string
  /** 分组内排序，小的在前 */
  order?: number
  /** 这一页绑定哪个组件（用于 API 表）；不写则按页目录名自动匹配 */
  component?: string
  /** 这一页绑定哪个非组件模块（`config.modules` 的文件名）；不写则按页目录名匹配 */
  module?: string
  /**
   * API 表的补充说明，键格式 `props:size` / `events:press` / `slots:icon` / `exposed:focus`。
   * 用来补 JSDoc 覆盖不到的地方（目前事件说明无法从 defineEmits 提取）。
   */
  apiNotes?: Record<string, string>
  /**
   * 这一页是否展示场景源码。
   * 介绍 / 指南类内容页建议 `false`；不写则跟随 `config.sources`（Markdown 场景默认不展示）。
   */
  showSource?: boolean
  /** 这一页按文档排版渲染（不套演示画布）；Markdown 场景自动为 true */
  doc?: boolean
}

export const defineSceneMeta = (meta: SceneMeta): SceneMeta => meta
export const definePageMeta = (meta: PageMeta): PageMeta => meta
