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
  /** 懒加载场景组件 */
  load: () => Promise<{ default: Component }>
  /** 懒加载场景源码（?raw） */
  raw: () => Promise<string>
}
