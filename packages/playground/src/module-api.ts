/**
 * 非组件文件（纯函数 / hooks / 常量）的契约。
 * 由 `@rinova/playground-vite` 用 TypeScript 编译器 API 抽取，写进 `.playground/manifest.json`；
 * 这里的类型与 `packages/playground-vite/src/module-api.ts` 同构 —— manifest.json 就是那条契约。
 */

export interface ModuleParam {
  name: string
  type: string
  optional: boolean
  /** 源码里的默认值原文，没有就是空串 */
  default: string
  description: string
}

export interface ModuleFunction {
  name: string
  /** 名字以 use + 大写开头即为 hook */
  kind: 'function' | 'hook'
  /** `formatMoney(value: number, options?: FormatMoneyOptions): string` */
  signature: string
  params: ModuleParam[]
  returns: string
  description: string
  /** 有没有场景引用过这个名字 */
  covered: boolean
  /** 引用过这个名字的场景 id */
  coveredBy?: string[]
}

export interface ModuleConstant {
  name: string
  type: string
  /** 短值直接给原文，长的留空 */
  value: string
  description: string
  covered: boolean
  /** 引用过这个名字的场景 id */
  coveredBy?: string[]
}

export interface ModuleType {
  name: string
  kind: 'interface' | 'type'
  file: string
  code: string
}

export interface ModuleApi {
  /** 文件名去掉扩展名，如 `money` */
  name: string
  rel: string
  functions: ModuleFunction[]
  constants: ModuleConstant[]
  types: ModuleType[]
  /** 引用了这个模块的场景 id */
  scenes: string[]
  /** 没有任何场景提到的导出名 */
  uncovered: string[]
}
