import type { Component } from 'vue'

/** 页内索引分组，顺序固定：概要 → Props → Events → Exposes → Slots */
export type SceneSection = 'overview' | 'props' | 'events' | 'exposes' | 'slots'

/** 一个被扫描到的场景。目录约定：`scenes/<分组>/<组件页>/<场景>.vue` */
export interface SceneDescriptor {
  /** `group/page/scene` */
  id: string
  /** 场景文件名，页内锚点 */
  name: string
  /** 侧栏外的场景标题，默认由文件名推导 */
  title: string
  section: SceneSection
  /** sceneMeta.api：本场景覆盖的公开 API 名 */
  api: string[] | null
  /** 分组显示名 */
  group: string
  groupDir: string
  /** `groupDir/pageDir` */
  pageId: string
  /** 页标题 */
  page: string
  /** 相对项目根的 URL，用于动态 import */
  path: string
  /** 绝对文件路径 */
  file: string
  /** 相对项目根的路径，如 `src/scenes/button/button/basic.vue` */
  rel: string
  lang: 'vue'
  order: number
  tags: string[] | null
  description: string | null
  hidden: boolean
  load: () => Promise<{ default: Component }>
  raw: () => Promise<string>
  sources: { rel: string; raw: () => Promise<string> }[]
}

/** 组件页 */
export interface PageDescriptor {
  /** `groupDir/pageDir` */
  id: string
  group: string
  groupDir: string
  title: string
  description: string | null
  order: number
  /** 这一页演示的组件名（pageMeta.component 或按目录名匹配） */
  component: string | null
  /** API 补充说明（pageMeta.apiNotes），键格式 `events:press` */
  apiNotes: Record<string, string> | null
}

/** 组件契约：由 vue-component-meta 从 TS 类型 + JSDoc 生成 */
export interface ComponentApiField {
  name: string
  type: string
  required: boolean
  description: string
}

export interface ComponentApiProp {
  name: string
  type: string
  required: boolean
  default: string
  description: string
  /** 对象 / 对象数组类型的字段（一层），如 columns: TableColumn[] */
  fields?: ComponentApiField[]
}

export interface ComponentApiEvent {
  name: string
  type: string
  signature: string
  description: string
  /** 对象参数展开后的字段 */
  fields?: ComponentApiField[]
}

export interface ComponentApiSlot {
  name: string
  type: string
  description: string
}

export interface ComponentApiExposed {
  name: string
  type: string
  description: string
}

export interface ComponentApi {
  name: string
  rel: string
  props: ComponentApiProp[]
  events: ComponentApiEvent[]
  slots: ComponentApiSlot[]
  exposed: ComponentApiExposed[]
  scenes: string[]
  uncoveredProps: string[]
  undocumented: string[]
}
