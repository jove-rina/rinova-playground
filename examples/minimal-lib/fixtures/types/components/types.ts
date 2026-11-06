/** 标签色调（字面量联合别名：旧实现抽不出来） */
export type TagTone = 'neutral' | 'success' | 'danger'

/** 标签尺寸（TS enum） */
export enum TagSize {
  Sm = 'sm',
  Md = 'md'
}

/** 单个标签 */
export interface TagItem {
  /** 文案 */
  label: string
  /** 色调 */
  tone?: TagTone
}

/** 标签组额外信息（交叉类型用） */
export type TagExtra = {
  /** 序号 */
  index?: number
}
