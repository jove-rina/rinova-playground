/**
 * 场景元信息。可选：不写也能用，只在需要覆盖标题 / 排序 / 入参出参面板时写。
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
  /** 入参 / 出参快照 */
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
}

/** 组件页级元信息：写在 `<页>/meta.ts`，导出 `pageMeta` */
export interface PageMeta {
  /** 页标题，默认按目录名首字母大写化 */
  title?: string
  /** 页说明，显示在页头 */
  description?: string
  /** 分组内排序，小的在前 */
  order?: number
  /** 这一页演示哪个组件（用于生成页面 API 表）；不写则按页目录名自动匹配 */
  component?: string
  /**
   * API 表的补充说明，键格式 `props:size` / `events:press` / `slots:icon` / `exposed:focus`。
   * 用来补 JSDoc 覆盖不到的地方（目前事件说明无法从 defineEmits 提取）。
   */
  apiNotes?: Record<string, string>
}

export const defineSceneMeta = (meta: SceneMeta): SceneMeta => meta
export const definePageMeta = (meta: PageMeta): PageMeta => meta
