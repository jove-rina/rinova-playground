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
  /** 隐藏于侧栏，但可通过链接直达 */
  hideInNav?: boolean
}

export const defineSceneMeta = (meta: SceneMeta): SceneMeta => meta
