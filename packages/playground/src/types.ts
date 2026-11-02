import type { Component } from 'vue'

/** 一个被扫描到的场景。由 @rinova/playground-vite 在构建期生成。 */
export interface SceneDescriptor {
  /** 场景 id，等于相对 scenes 根目录的路径（不含扩展名），如 `button/basic` */
  id: string
  /** 侧栏显示的标题，默认由文件名推导 */
  title: string
  /** 一级分组名，等于场景所在目录名（按目录首字母大写化） */
  group: string
  /** 相对项目根的 URL，用于动态 import */
  path: string
  /** 绝对文件路径，用于展示与错误提示 */
  file: string
  /** 相对项目根的路径，如 `src/scenes/button/basic.vue` */
  rel: string
  /** 源码语言（固定 'vue'，源码面板高亮用） */
  lang: 'vue'
  /** 同层排序权重，未声明时为 Number.MAX_SAFE_INTEGER */
  order: number
  /** sceneMeta.tags */
  tags: string[] | null
  /** sceneMeta.description，显示在预览区上方 */
  description: string | null
  /** sceneMeta.hideInNav：不进侧栏但可通过 URL 直达 */
  hidden: boolean
  /** 懒加载场景组件 */
  load: () => Promise<{ default: Component }>
  /** 懒加载场景源码（?raw） */
  raw: () => Promise<string>
  /** 源码面板的文件列表：场景自身在前，sceneMeta.files 在后 */
  sources: { rel: string; raw: () => Promise<string> }[]
}
