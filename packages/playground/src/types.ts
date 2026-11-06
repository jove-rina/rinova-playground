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
  /**
   * 索引分组；未声明时按 `props` 处理（内容区与索引必须都算在 Props 段，
   * 否则这个场景会出现在正文里却在右侧索引里消失）
   */
  section?: SceneSection
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
  /** 场景文件类型：`.vue` 手写，或 `.md`（Markdown 内容页） */
  lang: 'vue' | 'md'
  order: number
  tags: string[] | null
  description: string | null
  hidden: boolean
  /** 是否在场景下方展示源码卡片（已按 场景 > 页 > 全局 合并好） */
  showSource: boolean
  /** 文档场景：不套演示画布，内容直接铺在页面上 */
  doc: boolean
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
  /** 分组排序权重：`config.groups` 的键索引；未登记的组排最后 */
  groupOrder?: number
  /** 1 = 组件页，2 = 子组件页（组件页下的子目录） */
  depth?: 1 | 2
  /** 父组件页 id（子组件页才有），如 `card/card` */
  parentId?: string | null
  /** 组内排序权重（pageMeta.order），缺省 MAX_SAFE_INTEGER */
  order: number
  /** 这一页演示的组件名（pageMeta.component 或按目录名匹配） */
  component: string | null
  /** 这一页展示的非组件模块名（pageMeta.module 或按目录名匹配） */
  module?: string | null
  /** API 补充说明（pageMeta.apiNotes），键格式 `events:press` */
  apiNotes: Record<string, string> | null
  /** 这一页是否展示场景源码（pageMeta.showSource），未设置时跟随全局 sources */
  showSource: boolean | null
  /** 这一页是否文档页（pageMeta.doc） */
  doc: boolean | null
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
  /** 字面量联合 / enum 的可选值，如 mode: 'default' | 'table' → ['default','table'] */
  values?: string[]
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

/** 契约里引用到的具名类型定义（源文件原文），汇总在 API 的「类型」页签 */
export interface ComponentApiType {
  name: string
  kind: 'interface' | 'type'
  /** 声明所在文件，相对项目根 */
  file: string
  /** 声明原文（含 JSDoc） */
  code: string
}

export interface ComponentApi {
  name: string
  rel: string
  props: ComponentApiProp[]
  events: ComponentApiEvent[]
  slots: ComponentApiSlot[]
  exposed: ComponentApiExposed[]
  /** props / events / slots / exposed 类型里引用到的具名类型（一层），没有就是 undefined */
  types?: ComponentApiType[]
  scenes: string[]
  uncoveredProps: string[]
  undocumented: string[]
}