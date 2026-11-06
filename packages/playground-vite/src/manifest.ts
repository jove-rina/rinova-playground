import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { ModuleApi } from './module-api.js'

const require = createRequire(import.meta.url)

/**
 * 契约提取的进程内缓存。
 *
 * 真实项目里每次保存都全量重跑 `createChecker` + 逐组件 `getComponentMeta` 太慢
 * （实测 406 个组件一次 7.2s）。这里做两层缓存：
 * 1. checker 按 tsconfig 复用 —— 省掉重复建 TS Program 的开销；
 * 2. 组件 meta 按 文件 mtime+size 缓存 —— 没改动的组件直接复用。
 *
 * 代价：跨文件的类型变化（改了被引用的 .ts）不会自动失效，需要重启 dev 或改动该组件本身。
 */
let checkerCache: { tsconfigPath: string; checker: { getComponentMeta: (file: string) => unknown } } | null = null
const metaCache = new Map<string, { key: string; meta: unknown }>()

const clearManifestCache = (): void => {
  checkerCache = null
  metaCache.clear()
}

/**
 * 组件文件改动后，把最新文本推给 checker。
 *
 * 不推的话语言服务仍在用建 checker 时的旧快照：改了 props 后契约清单不更新，
 * API 页要重启 dev 才变（踩过：加一个 prop 等 15s 仍是旧列表）。
 * 只更新被改的那个文件，代价远低于清空整个 checker。
 */
export const syncComponentFile = (abs: string): boolean => {
  const checker = checkerCache?.checker as { updateFile?: (file: string, text: string) => void } | undefined
  if (!checker || typeof checker.updateFile !== 'function') return false
  try {
    checker.updateFile(abs, fs.readFileSync(abs, 'utf8'))
    return true
  } catch {
    return false
  }
}

/** Vue 自带的透传 props，不属于组件自身契约 */
const BUILTIN_PROPS = new Set([
  'key',
  'ref',
  'ref_for',
  'ref_key',
  'class',
  'style',
  'is',
  'as',
])

export interface ManifestField {
  name: string
  type: string
  required: boolean
  description: string
}

export interface ManifestProp {
  name: string
  type: string
  required: boolean
  default: string
  description: string
  /** 对象 / 对象数组类型的字段展开（一层；只展开本项目声明的字段，最多 32 个），如 `columns: Column[]` → Column 的字段 */
  fields?: ManifestField[]
  /** 截断前的字段总数（只在 `fields` 存在时给出，用于「共 N 个字段，省略 M」这类提示） */
  fieldCount?: number
  /** `fields` 是否被 32 个的上限截断 */
  fieldsTruncated?: boolean
  /** 字面量联合 / enum 的可选值，如 `mode: 'default' | 'table'` → ['default','table'] */
  values?: string[]
}

export interface ManifestEvent {
  name: string
  /** 参数列表，如 `[event: FocusEvent]` */
  type: string
  /** 完整签名，如 `(event: "focus", event: FocusEvent): void` */
  signature: string
  description: string
  /** 某个对象参数展开后的字段（取第一个带属性的参数；只展开本项目声明的字段，最多 32 个） */
  fields?: ManifestField[]
  /** 截断前的字段总数 */
  fieldCount?: number
  /** `fields` 是否被 32 个的上限截断 */
  fieldsTruncated?: boolean
}

export interface ManifestSlot {
  name: string
  /** 作用域类型，如 `{}` 或 `{ item: Row }` */
  type: string
  description: string
}

export interface ManifestExposed {
  name: string
  type: string
  description: string
}

/** 组件契约里引用到的具名类型定义（源文件原文，含 JSDoc） */
export interface ManifestType {
  name: string
  /** interface / type alias / enum（字面量联合别名归到 type） */
  kind: 'interface' | 'type' | 'enum'
  /** 声明所在文件，相对项目根 */
  file: string
  /** 声明原文，直接交给代码块高亮 */
  code: string
}

export interface ManifestComponent {
  name: string
  rel: string
  props: ManifestProp[]
  events: ManifestEvent[]
  slots: ManifestSlot[]
  exposed: ManifestExposed[]
  /** props / events / slots / exposed 类型里引用到的具名 interface / type（一层） */
  types?: ManifestType[]
  scenes: string[]
  uncoveredProps: string[]
  /** 没写 JSDoc 的 API，格式 `props:disabled` / `events:press` */
  undocumented: string[]
}

export interface ManifestScene {
  lang?: 'vue' | 'md'
  id: string
  title: string
  group: string
  rel: string
  sources: string[]
}

/** 页级信息（供 MCP / llms.txt 描述「这个演示站有什么」） */
export interface ManifestPage {
  /** `groupDir/pageDir`，二级页是 `groupDir/pageDir/subDir` */
  id: string
  group: string
  groupDir: string
  title: string
  order: number
  depth: 1 | 2
  parentId?: string
  component?: string
  module?: string
  doc?: boolean
  showSource?: boolean
  /** 页面目录（相对项目根），场景文件就放这里 */
  dir: string
  scenes: string[]
}

/**
 * 演示环境（MCP / llms.txt 的数据源）。
 *
 * 只放**可序列化**的东西：`globals` 本来就是纯常量，`plugins` 是模块路径（执行结果在运行时才有）。
 */
export interface ManifestEnv {
  title: string
  /** 场景根目录（相对项目根），如 `src/scenes` */
  sceneRoot: string
  /** 路由前缀，默认 `/` */
  routeBase: string
  groups: Array<{ dir: string; label: string }>
  globals: Record<string, unknown>
  plugins: string[]
  theme: { ui: string; stage: string }
  sources: boolean
  components: { configured: boolean; count: number }
  modules: { configured: boolean; count: number }
  pages: ManifestPage[]
}

export interface Manifest {
  generatedAt: string
  components: ManifestComponent[]
  scenes: ManifestScene[]
  /** 非组件文件（函数 / hooks / 常量）的契约；配了 config.modules 才有 */
  modules: ModuleApi[]
  /** 演示环境：globals / 插件 / 分组 / 页面清单（0.7 起） */
  env: ManifestEnv
}

export interface ManifestInput {
  root: string
  /** 组件 glob，如 `src/lib/**\/*.vue` */
  patterns: string[]
  /** tsconfig 路径（相对项目根） */
  tsconfig: string
  /** 已经抽好的非组件模块契约 */
  modules?: ModuleApi[]
  /** 演示环境（globals / 插件 / 分组 / 页面清单） */
  env: ManifestEnv
  scenes: Array<{
    id: string
    title: string
    group: string
    rel: string
    lang?: 'vue' | 'md'
    sources: { rel: string }[]
  }>
}

const toPosix = (value: string): string => value.split(path.sep).join('/')

/** 极简 glob：支持 `dir/**\/*.vue`（任意层）、`dir/*.vue`、`dir/name.vue` */
const DEEP_PLACEHOLDER = '\u0001'

export const globToRegExp = (pattern: string): RegExp => {
  const normalized = toPosix(pattern)
  const escaped = normalized
    // 先换成占位符：否则 `**\/` 变成 `(?:.*\/)?` 之后，下面的 `*` 替换会把里面的 `*` 也吃掉
    .replace(/\*\*\//g, DEEP_PLACEHOLDER)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
  const withGlob = escaped.split(DEEP_PLACEHOLDER).join('(?:.*/)?')
  return new RegExp(`^${withGlob}$`)
}

const walkVueFiles = (dir: string, prefix = '', out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const abs = path.join(dir, entry.name)
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) walkVueFiles(abs, rel, out)
    else if (entry.name.endsWith('.vue')) out.push(rel)
  }
  return out
}

const findComponentFiles = (root: string, patterns: string[]): string[] => {
  const files = walkVueFiles(root)
  const matchers = patterns.map(globToRegExp)
  return files.filter((rel) => matchers.some((re) => re.test(rel))).sort()
}

const componentName = (rel: string): string => path.basename(rel, '.vue')

/** 去掉 Vue 透传 props 与 onVue:* 钩子 */
const isOwnProp = (name: string): boolean => !BUILTIN_PROPS.has(name) && !name.startsWith('onVue:')

const FLAG_OBJECT = 524288 // ts.TypeFlags.Object
const FLAG_UNION = 1048576 // ts.TypeFlags.Union

/**
 * 展开对象 / 对象数组类型的字段（一层）。
 * vue-component-meta 的 schema 只是类型名字符串，这里借 getTypeObject() 拿 TS 类型对象自己走一遍。
 */
const DEBUG_FIELDS = Boolean(process.env.RINOVA_DEBUG_FIELDS)

/** 单个 prop / 事件参数展开的字段上限；超出按声明序截断并标明真实数量 */
const MAX_FIELDS = 32
/** 字段说明字数上限：外部库的 JSDoc 常带整段文档，会把宿主 API 表淹掉 */
const MAX_FIELD_DESCRIPTION = 160

/** 字段展开结果：字段本身 + 截断前的真实数量 */
interface FieldExpansion {
  fields: ManifestField[]
  total: number
}

const EMPTY_EXPANSION: FieldExpansion = { fields: [], total: 0 }

/**
 * 字段说明清洗：剥掉浏览器支持表格 / Baseline 段落（那是外部库的文档，不是宿主的 API 说明）并按字数截断。
 * 导出的目的是让 verify 能直接对规则做单测。
 */
export const cleanFieldDescription = (text: string): string => {
  if (!text) return ''
  const kept = text
    .split('\n')
    .filter((line) => !/^\s*\|/.test(line))
    .filter((line) => !/^(This feature is (not )?Baseline|Baseline \d{4})/i.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return kept.length > MAX_FIELD_DESCRIPTION ? `${kept.slice(0, MAX_FIELD_DESCRIPTION).trimEnd()}…` : kept
}

/**
 * 字段是不是本项目的声明。
 *
 * 第三方包（element-plus 的 TableProps → csstype 的 CSS.Properties 1348 个 CSS 字段）与 TS lib 里的成员，
 * 文档属于那个库、不属于宿主的 API；全量展开会把一份清单撑到几 MB，而且对写场景的人没有用。
 * 这类 prop 只保留类型名，要看细节去 Types 页签 / 直接看包的类型定义。
 */
const isOwnField = (symbol: Record<string, unknown>): boolean => {
  const declarations = symbol.declarations as Array<Record<string, unknown>> | undefined
  const declaration = (symbol.valueDeclaration ?? declarations?.[0]) as Record<string, unknown> | undefined
  const getSourceFile = declaration?.getSourceFile as (() => { fileName: string }) | undefined
  if (typeof getSourceFile !== 'function') return true
  try {
    return !isExternalDeclaration(getSourceFile.call(declaration).fileName)
  } catch {
    return true
  }
}

const readFields = (prop: unknown): FieldExpansion => {
  try {
    if (DEBUG_FIELDS) console.warn('[fields] enter', (prop as { name?: string }).name)
    const getter = (prop as { getTypeObject?: () => unknown }).getTypeObject
    if (typeof getter !== 'function') {
      if (DEBUG_FIELDS) console.warn('[fields] no getTypeObject')
      return EMPTY_EXPANSION
    }
    const type = getter.call(prop) as Record<string, unknown> | undefined
    if (!type) {
      if (DEBUG_FIELDS) console.warn('[fields] no type')
      return EMPTY_EXPANSION
    }
    if (DEBUG_FIELDS) console.warn('[fields] type flags', Number(type.flags), 'keys', Object.keys(type).slice(0, 8).join(','))
    const ts = type.checker as Record<string, (...args: never[]) => unknown> & {
      typeToString: (value: unknown) => string
    }
    if (!ts || typeof ts.getPropertiesOfType !== 'function') {
      if (DEBUG_FIELDS) console.warn('[fields] no checker', Object.keys(type))
      return EMPTY_EXPANSION
    }

    let target: Record<string, unknown> = type
    if ((Number(type.flags) & FLAG_UNION) === FLAG_UNION) {
      const parts = (type.types as Array<Record<string, unknown>> | undefined) ?? []
      const objectPart = parts.find((part) => (Number(part.flags) & FLAG_OBJECT) === FLAG_OBJECT)
      if (!objectPart) {
        if (DEBUG_FIELDS) console.warn('[fields] union without object', parts.map((part) => Number(part.flags)).join(','))
        return EMPTY_EXPANSION
      }
      target = objectPart
    }
    // 数组：取元素类型
    const args = target.typeArguments as unknown[] | undefined
    if (args && args.length) target = args[0] as Record<string, unknown>
    if ((Number(target.flags) & FLAG_OBJECT) !== FLAG_OBJECT) {
      if (DEBUG_FIELDS) console.warn('[fields] target not object', Number(target.flags), ts.typeToString(target))
      return EMPTY_EXPANSION
    }

    const symbols = (ts.getPropertiesOfType as unknown as (value: unknown) => Array<Record<string, unknown>>)(target)
    const own = symbols.filter((symbol) => isOwnField(symbol))
    if (!own.length) {
      if (DEBUG_FIELDS) console.warn('[fields] 全部字段来自外部包，跳过', own.length, '/', symbols.length)
      return EMPTY_EXPANSION
    }
    const fields = own
      .slice(0, MAX_FIELDS)
      .map((symbol) => {
        const name = (symbol.getName as () => string)()
        if (name.startsWith('__')) return null
        const declarations = symbol.declarations as Array<unknown> | undefined
        const location = (symbol.valueDeclaration ?? declarations?.[0]) as unknown
        const symbolType = (
          ts.getTypeOfSymbolAtLocation as unknown as (value: unknown, node: unknown) => unknown
        )(symbol, location)
        const text = ts.typeToString(symbolType)
        const docs = (symbol.getDocumentationComment as unknown as (c: unknown) => unknown[])(ts)
        const description = Array.isArray(docs)
          ? docs.map((part) => (part as { text?: string }).text ?? '').join('').trim()
          : ''
        return {
          name,
          type: text,
          // 可选性以类型里的 undefined 为准：vue-component-meta 包了一层 symbol，flags 不可靠
          required: !/\|\s*undefined$/.test(text),
          description: cleanFieldDescription(description),
        }
      })
      .filter((item): item is ManifestField => item !== null)
    return { fields, total: own.length }
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[fields] error', String(error))
    return EMPTY_EXPANSION
  }
}

/** 事件：从参数元组里找第一个对象参数，展开它的字段 */
const readEventFields = (event: unknown): FieldExpansion => {
  try {
    const getter = (event as { getTypeObject?: () => unknown }).getTypeObject
    if (typeof getter !== 'function') return EMPTY_EXPANSION
    const tuple = getter.call(event) as Record<string, unknown> | undefined
    if (!tuple) return EMPTY_EXPANSION
    const ts = tuple.checker as Record<string, (...args: never[]) => unknown> & {
      typeToString: (value: unknown) => string
      getPropertiesOfType: (value: unknown) => Array<Record<string, unknown>>
    }
    if (!ts || typeof ts.getPropertiesOfType !== 'function') return EMPTY_EXPANSION
    const args = (tuple.typeArguments as unknown[] | undefined) ?? []
    for (const arg of args) {
      const type = arg as Record<string, unknown>
      if ((Number(type.flags) & FLAG_OBJECT) !== FLAG_OBJECT) continue
      const expansion = readFields({
        getTypeObject: () => type,
      })
      if (expansion.fields.length) return expansion
    }
    return EMPTY_EXPANSION
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[fields] event error', String(error))
    return EMPTY_EXPANSION
  }
}

/** 把字段展开结果拼成 prop / event 上的可选片段（有字段才出现这几个键） */
const fieldSpread = (
  expansion: FieldExpansion
): { fields?: ManifestField[]; fieldCount?: number; fieldsTruncated?: boolean } =>
  expansion.fields.length
    ? {
        fields: expansion.fields,
        fieldCount: expansion.total,
        ...(expansion.total > expansion.fields.length ? { fieldsTruncated: true } : {}),
      }
    : {}

const normalizeType = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(String).join(' | ')
  return String(value ?? '')
}

const FLAG_SYMBOL_INTERFACE = 64 // ts.SymbolFlags.Interface
const FLAG_SYMBOL_TYPEALIAS = 524288 // ts.SymbolFlags.TypeAlias
/** 容器类型：取元素类型继续回溯 */
const WRAPPER_TYPE_NAMES = new Set(['Array', 'ReadonlyArray', 'Set', 'ReadonlySet', 'Map', 'ReadonlyMap', 'Promise'])

/** 第三方包与 TS lib 里的类型不收录（Array / Record / HTMLElement 之类，读了也只是噪音） */
const isExternalDeclaration = (file: string): boolean =>
  /[/\\]node_modules[/\\]/.test(file) || /[/\\]lib\.[a-z0-9.]+\.d\.ts$/.test(file)

/** 取 schema 项上的 TS 类型对象，拿不到就返回 undefined */
const typeObjectOf = (value: unknown): unknown => {
  try {
    const getter = (value as { getTypeObject?: () => unknown }).getTypeObject
    return typeof getter === 'function' ? getter.call(value) : undefined
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[types] getTypeObject error', String(error))
    return undefined
  }
}

/**
 * 从类型对象回溯到具名 interface / type，切出声明原文（含 JSDoc）。
 *
 * 类型字符串（`TableColumn[]`）拿不到结构，只能顺着类型对象往下走：联合去掉 undefined、
 * 容器取元素类型，直到命中本项目的 interface / type 符号。只回溯一层，避免递归整个类型图。
 */
const readTypeDeclaration = (type: unknown, root: string): ManifestType | null => {
  try {
    let current = type as Record<string, unknown> | undefined
    for (let depth = 0; depth < 5 && current; depth += 1) {
      const flags = Number(current.flags)
      if ((flags & FLAG_UNION) === FLAG_UNION) {
        const parts = (current.types as Array<Record<string, unknown>> | undefined) ?? []
        current = parts.find((part) => (Number(part.flags) & FLAG_OBJECT) === FLAG_OBJECT)
        continue
      }
      if ((flags & FLAG_OBJECT) !== FLAG_OBJECT) return null

      const getSymbol = current.getSymbol as (() => Record<string, unknown> | undefined) | undefined
      const symbol =
        (typeof getSymbol === 'function' ? getSymbol.call(current) : undefined) ??
        (current.symbol as Record<string, unknown> | undefined)
      if (!symbol) return null

      const name = (symbol.getName as () => string)()
      const args = current.typeArguments as unknown[] | undefined
      if (WRAPPER_TYPE_NAMES.has(name) && args?.length) {
        current = args[0] as Record<string, unknown>
        continue
      }

      const symbolFlags = Number(symbol.flags)
      const isInterface = (symbolFlags & FLAG_SYMBOL_INTERFACE) === FLAG_SYMBOL_INTERFACE
      if (!isInterface && (symbolFlags & FLAG_SYMBOL_TYPEALIAS) !== FLAG_SYMBOL_TYPEALIAS) return null

      const declarations = symbol.declarations as Array<Record<string, unknown>> | undefined
      const node = declarations?.[0]
      if (!node) return null
      const sourceFile = (node.getSourceFile as () => { fileName: string; text: string })()
      if (isExternalDeclaration(sourceFile.fileName)) return null

      // getFullStart 在声明前留出 JSDoc 的整体注释，trim 后正好从 /** 开始
      const start = Number((node.getFullStart as () => number)())
      const end = Number((node.getEnd as () => number)())
      const code = sourceFile.text.slice(start, end).trim()
      if (!code) return null

      return {
        name,
        kind: isInterface ? 'interface' : 'type',
        file: toPosix(path.relative(root, sourceFile.fileName)),
        code,
      }
    }
    return null
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[types] read error', String(error))
    return null
  }
}


/* ------------------------------------------------------------------ *
 * 类型定义（AST）：声明处类型节点优先
 *
 * 背景：`readTypeDeclaration` 从「已解析的类型对象」回溯，只认 Object 类型。
 * 于是 `type TaoFormMode = 'default' | 'table'` 这种字面量联合别名（union 里没有
 * Object 成员）整体落空 —— Types 页签不出现、类型列也点不开。
 *
 * 这里顺着 vue-component-meta 生成的虚拟文件（路径同 .vue）读声明处的类型节点：
 *   type __VLS_Props = TaoFormPropsType
 *   type __VLS_Emit  = TaoFormEmitsType
 *   type __VLS_Slots = ...
 * 把本地 interface / type alias / enum 的声明原文收进 types，并把字面量联合 /
 * enum 的成员值抽成 values。旧的类型对象回溯保留作 runtime props 的 fallback。
 * ------------------------------------------------------------------ */

/** 避免 d.ts 硬绑宿主 TS 版本：这里只用到极稳定的语法节点判断与 SymbolFlags */
type TsApi = any

const MAX_TYPE_DEPTH = 3
const MAX_TYPES_PER_COMPONENT = 60
const MAX_TYPE_CODE = 4000
const MAX_VALUES = 30

let tsCache: { root: string; ts: TsApi | null } | null = null

/** 解析 typescript：先按插件自身解析，失败回落到宿主项目根 */
const loadTypeScript = (root: string): TsApi | null => {
  if (tsCache?.root === root) return tsCache.ts
  let ts: TsApi | null = null
  try {
    ts = require('typescript') as TsApi
  } catch {
    ts = null
  }
  if (!ts) {
    try {
      ts = createRequire(path.join(root, 'package.json'))('typescript') as TsApi
    } catch {
      ts = null
    }
  }
  tsCache = { root, ts }
  return ts
}

interface AstContext {
  ts: TsApi
  checker: any
  root: string
}

interface AstTypeResult {
  types: ManifestType[]
  /** prop 名 → 可选值（字面量联合 / enum 成员） */
  propValues: Map<string, string[]>
}

const VIRTUAL_TYPE_NAMES = {
  props: '__VLS_Props',
  emit: '__VLS_Emit',
  slots: '__VLS_Slots'
} as const

/** import 进来的是 Alias symbol，不展开只能拿到 ImportSpecifier */
const resolveAliasSymbol = (ctx: AstContext, symbol: any): any => {
  if (!symbol) return undefined
  const { ts, checker } = ctx
  return (symbol.flags & ts.SymbolFlags.Alias) === ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol
}

/** 取类型节点指向的符号；TypeReference 的符号挂在 typeName 上，不是节点本身 */
const symbolOfTypeNode = (ctx: AstContext, node: any): any => {
  if (!node) return undefined
  const target = ctx.ts.isTypeReferenceNode(node) ? node.typeName : node
  return resolveAliasSymbol(ctx, ctx.checker.getSymbolAtLocation(target))
}

/** 定位虚拟文件里 `type __VLS_Xxx = ...;` 的类型节点 */
const findVirtualTypeNode = (ctx: AstContext, sourceFile: any, name: string): any => {
  const { ts } = ctx
  for (const statement of sourceFile.statements ?? []) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name &&
      statement.name.text === name
    ) {
      return statement.type
    }
  }
  return null
}

/** 接口（含 extends 链）的成员：名字 → PropertySignature 节点 */
const collectInterfaceMembers = (
  ctx: AstContext,
  symbol: any,
  depth = 0,
  out = new Map<string, any>()
): Map<string, any> => {
  if (!symbol || depth > MAX_TYPE_DEPTH) return out
  const { ts, checker } = ctx
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
      const members = declaration.members ?? declaration.type?.members ?? []
      for (const member of members) {
        const name = member.name?.getText?.() ?? member.name?.text
        if (name && member.type && !out.has(name)) out.set(name, member)
      }
      for (const clause of declaration.heritageClauses ?? []) {
        for (const type of clause.types ?? []) {
          const base = resolveAliasSymbol(ctx, checker.getSymbolAtLocation(type.expression))
          if (base) collectInterfaceMembers(ctx, base, depth + 1, out)
        }
      }
    }
  }
  return out
}

/**
 * 从类型节点直接取成员：`defineProps<{...}>()` 的类型是匿名 TypeLiteral，
 * 没有符号可以解析（宿主里非常常见），必须从节点本身取。
 */
const collectMemberNodes = (ctx: AstContext, node: any, out = new Map<string, any>(), depth = 0): Map<string, any> => {
  if (!node || depth > MAX_TYPE_DEPTH) return out
  const { ts } = ctx
  if (ts.isParenthesizedTypeNode(node)) return collectMemberNodes(ctx, node.type, out, depth + 1)
  if (ts.isIntersectionTypeNode(node)) {
    for (const part of node.types ?? []) collectMemberNodes(ctx, part, out, depth + 1)
    return out
  }
  if (ts.isTypeLiteralNode(node)) {
    for (const member of node.members ?? []) {
      const name = member.name?.getText?.() ?? member.name?.text
      if (name && !out.has(name)) out.set(name, member)
    }
    return out
  }
  if (ts.isTypeReferenceNode(node)) {
    collectInterfaceMembers(ctx, symbolOfTypeNode(ctx, node), depth, out)
  }
  return out
}

/** 取类型节点里的调用签名（defineEmits 的 `type __VLS_Emit = {...}`） */
const collectCallSignatures = (ctx: AstContext, node: any, out: any[] = [], depth = 0): any[] => {
  if (!node || depth > MAX_TYPE_DEPTH) return out
  const { ts } = ctx
  if (ts.isParenthesizedTypeNode(node)) return collectCallSignatures(ctx, node.type, out, depth + 1)
  if (ts.isIntersectionTypeNode(node)) {
    for (const part of node.types ?? []) collectCallSignatures(ctx, part, out, depth + 1)
    return out
  }
  if (ts.isTypeLiteralNode(node)) {
    for (const member of node.members ?? []) {
      if (ts.isCallSignatureDeclaration(member)) out.push(member)
    }
    return out
  }
  if (ts.isTypeReferenceNode(node)) {
    for (const declaration of symbolOfTypeNode(ctx, node)?.declarations ?? []) {
      for (const member of declaration.members ?? []) {
        if (ts.isCallSignatureDeclaration(member)) out.push(member)
      }
    }
  }
  return out
}

/** 把一个具名符号的声明原文收进 types；只沿「别名 → 目标」「interface → extends」走，不展开成员 */
const addNamedType = (ctx: AstContext, symbol: any, out: Map<string, ManifestType>, depth = 0): void => {
  if (!symbol || depth > MAX_TYPE_DEPTH || out.size >= MAX_TYPES_PER_COMPONENT) return
  const { ts } = ctx
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isInterfaceDeclaration(declaration)) {
      const name = symbol.getName()
      if (out.has(name)) return
      const file = declaration.getSourceFile()
      if (isExternalDeclaration(file.fileName)) return
      const code = file.text.slice(declaration.getFullStart(), declaration.getEnd()).trim()
      if (!code) return
      out.set(name, {
        name,
        kind: 'interface',
        file: toPosix(path.relative(ctx.root, file.fileName)),
        code: code.length > MAX_TYPE_CODE ? `${code.slice(0, MAX_TYPE_CODE)}\n// …（已截断）` : code
      })
      for (const clause of declaration.heritageClauses ?? []) {
        for (const type of clause.types ?? []) {
          addNamedType(ctx, resolveAliasSymbol(ctx, ctx.checker.getSymbolAtLocation(type.expression)), out, depth + 1)
        }
      }
      return
    }
    if (ts.isTypeAliasDeclaration(declaration) || ts.isEnumDeclaration(declaration)) {
      const name = symbol.getName()
      if (out.has(name)) return
      const file = declaration.getSourceFile()
      if (isExternalDeclaration(file.fileName)) return
      const code = file.text.slice(declaration.getFullStart(), declaration.getEnd()).trim()
      if (!code) return
      out.set(name, {
        name,
        kind: ts.isEnumDeclaration(declaration) ? 'enum' : 'type',
        file: toPosix(path.relative(ctx.root, file.fileName)),
        code: code.length > MAX_TYPE_CODE ? `${code.slice(0, MAX_TYPE_CODE)}\n// …（已截断）` : code
      })
      // 别名链：type A = B → 继续追 B（深度受限）
      if (ts.isTypeAliasDeclaration(declaration)) walkTypeNode(ctx, declaration.type, out, depth + 1)
      return
    }
  }
}

/** 遍历类型节点，收集其中引用的具名类型 */
const walkTypeNode = (ctx: AstContext, node: any, out: Map<string, ManifestType>, depth = 0): void => {
  if (!node || depth > MAX_TYPE_DEPTH || out.size >= MAX_TYPES_PER_COMPONENT) return
  const { ts, checker } = ctx
  if (ts.isParenthesizedTypeNode(node)) return walkTypeNode(ctx, node.type, out, depth)
  if (ts.isArrayTypeNode(node)) return walkTypeNode(ctx, node.elementType, out, depth)
  if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
    for (const item of node.types ?? []) walkTypeNode(ctx, item, out, depth)
    return
  }
  if (ts.isTypeOperatorNode(node)) return walkTypeNode(ctx, node.type, out, depth)
  if (ts.isTypeReferenceNode(node)) {
    addNamedType(ctx, resolveAliasSymbol(ctx, checker.getSymbolAtLocation(node.typeName)), out)
    for (const arg of node.typeArguments ?? []) walkTypeNode(ctx, arg, out, depth + 1)
    return
  }
  if (ts.isFunctionTypeNode(node)) {
    for (const param of node.parameters ?? []) walkTypeNode(ctx, param.type, out, depth)
    walkTypeNode(ctx, node.type, out, depth)
    return
  }
  if (ts.isTypeLiteralNode(node)) {
    for (const member of node.members ?? []) walkTypeNode(ctx, member.type, out, depth + 1)
  }
}

/** 字面量联合 / enum → 可选值列表；不是可枚举值就返回空数组 */
const readValues = (ctx: AstContext, node: any, depth = 0): string[] => {
  if (!node || depth > MAX_TYPE_DEPTH) return []
  const { ts, checker } = ctx
  if (ts.isParenthesizedTypeNode(node)) return readValues(ctx, node.type, depth)
  if (ts.isLiteralTypeNode(node)) {
    const literal = node.literal
    if (ts.isStringLiteral(literal) || ts.isNumericLiteral(literal)) return [literal.text]
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return ['true']
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return ['false']
    return []
  }
  if (ts.isUnionTypeNode(node)) {
    const values: string[] = []
    for (const item of node.types ?? []) {
      if (item.kind === ts.SyntaxKind.UndefinedKeyword || item.kind === ts.SyntaxKind.NullKeyword) continue
      values.push(...readValues(ctx, item, depth))
    }
    return [...new Set(values)].slice(0, MAX_VALUES)
  }
  if (ts.isTypeReferenceNode(node)) {
    const symbol = resolveAliasSymbol(ctx, checker.getSymbolAtLocation(node.typeName))
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isEnumDeclaration(declaration)) {
        return declaration.members.map((member: any) => member.name.getText()).slice(0, MAX_VALUES)
      }
      if (ts.isTypeAliasDeclaration(declaration)) return readValues(ctx, declaration.type, depth + 1)
    }
  }
  return []
}

/**
 * 从组件虚拟文件里抽类型定义与可选值。
 * 拿不到 program / 虚拟文件（runtime props、旧版 vue-component-meta）时返回 null，
 * 走原来的类型对象回溯。
 */
const readAstTypes = (input: {
  root: string
  abs: string
  meta: { props: Array<{ name: string }>; events: Array<{ name: string }>; slots: Array<{ name: string }> }
  checker: unknown
}): AstTypeResult | null => {
  const ts = loadTypeScript(input.root)
  if (!ts) {
    if (DEBUG_FIELDS) console.warn('[ast] typescript 解析失败')
    return null
  }
  const getProgram = (input.checker as { getProgram?: () => unknown }).getProgram
  if (typeof getProgram !== 'function') {
    if (DEBUG_FIELDS) console.warn('[ast] checker 没有 getProgram')
    return null
  }
  try {
    const program = getProgram.call(input.checker) as { getSourceFile: (file: string) => any; getTypeChecker: () => any } | undefined
    const sourceFile = program?.getSourceFile(input.abs)
    if (!program || !sourceFile) {
      if (DEBUG_FIELDS) console.warn('[ast] 虚拟文件缺失', input.abs, Boolean(program))
      return null
    }
    const ctx: AstContext = { ts, checker: program.getTypeChecker(), root: input.root }
    const types = new Map<string, ManifestType>()
    const propValues = new Map<string, string[]>()

    const propsType = findVirtualTypeNode(ctx, sourceFile, VIRTUAL_TYPE_NAMES.props)
    const members = collectMemberNodes(ctx, propsType)

    for (const prop of input.meta.props) {
      const member = members.get(prop.name)
      if (!member) continue
      walkTypeNode(ctx, member.type, types)
      const values = readValues(ctx, member.type)
      if (values.length > 1) propValues.set(prop.name, values)
    }

    const emitType = findVirtualTypeNode(ctx, sourceFile, VIRTUAL_TYPE_NAMES.emit)
    for (const signature of collectCallSignatures(ctx, emitType)) {
      if (!signature.parameters?.length) continue
      const names = readValues(ctx, signature.parameters[0].type)
      if (!names.length) continue
      if (!input.meta.events.some((event) => names.includes(event.name))) continue
      for (const param of signature.parameters.slice(1)) walkTypeNode(ctx, param.type, types)
    }

    const slotsType = findVirtualTypeNode(ctx, sourceFile, VIRTUAL_TYPE_NAMES.slots)
    const slotMembers = collectMemberNodes(ctx, slotsType)
    for (const slot of input.meta.slots) {
      const member = slotMembers.get(slot.name)
      if (member?.type) walkTypeNode(ctx, member.type, types)
    }

    if (DEBUG_FIELDS) console.warn('[ast]', input.abs, 'types', types.size, 'values', propValues.size)
    return { types: [...types.values()], propValues }
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[ast] error', String(error))
    return null
  }
}

export const buildManifest = (input: ManifestInput): Manifest => {
  const { createChecker } = require('vue-component-meta') as typeof import('vue-component-meta')

  const tsconfigPath = path.isAbsolute(input.tsconfig)
    ? input.tsconfig
    : path.join(input.root, input.tsconfig)

  // tsconfig 换了要整体失效；否则复用同一个 checker（建 TS Program 是主要开销）
  if (checkerCache && checkerCache.tsconfigPath !== tsconfigPath) clearManifestCache()
  if (!checkerCache) {
    checkerCache = { tsconfigPath, checker: createChecker(tsconfigPath) as never }
  }
  const checker = checkerCache.checker as ReturnType<typeof createChecker>

  /** 按 mtime+size 命中缓存，只对改动过的组件重跑提取 */
  const readMeta = (rel: string): ReturnType<typeof checker.getComponentMeta> => {
    const abs = path.join(input.root, rel)
    let key = 'missing'
    try {
      const stat = fs.statSync(abs)
      key = `${stat.mtimeMs}:${stat.size}`
    } catch {
      key = `missing:${Date.now()}`
    }
    const hit = metaCache.get(rel)
    if (hit && hit.key === key) return hit.meta as ReturnType<typeof checker.getComponentMeta>
    const fresh = checker.getComponentMeta(abs)
    metaCache.set(rel, { key, meta: fresh })
    return fresh
  }

  const sceneTexts = new Map<string, string>()
  for (const scene of input.scenes) {
    // 合成条目没有源文件，rel 为空，不能去 read
    if (!scene.rel) {
      sceneTexts.set(scene.id, '')
      continue
    }
    const abs = path.join(input.root, scene.rel)
    sceneTexts.set(scene.id, fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '')
  }

  const components: ManifestComponent[] = findComponentFiles(input.root, input.patterns).map((rel) => {
    const meta = readMeta(rel)
    // 声明处类型节点（AST）优先：字面量联合 / enum 别名只有这条路能拿到定义
    const astTypes = readAstTypes({
      root: input.root,
      abs: path.join(input.root, rel),
      meta,
      checker
    })

    /** 本组件契约引用到的具名类型，按名字去重 */
    const typeRefs = new Map<string, ManifestType>()
    const collectType = (type: unknown): void => {
      const item = readTypeDeclaration(type, input.root)
      if (item && !typeRefs.has(item.name)) typeRefs.set(item.name, item)
    }

    const props: ManifestProp[] = meta.props
      .filter((prop) => isOwnProp(prop.name))
      .map((prop) => {
        const type = normalizeType(prop.type)
        const fieldExpansion = readFields(prop)
        collectType(typeObjectOf(prop))
        const values = astTypes?.propValues.get(prop.name)
        return {
          name: prop.name,
          type,
          required: Boolean(prop.required),
          default: String(prop.default ?? ''),
          description: prop.description ?? '',
          ...fieldSpread(fieldExpansion),
          ...(values?.length ? { values } : {}),
        }
      })

    const events: ManifestEvent[] = meta.events.map((event) => {
      const fieldExpansion = readEventFields(event)
      const tuple = typeObjectOf(event) as Record<string, unknown> | undefined
      for (const arg of (tuple?.typeArguments as unknown[] | undefined) ?? []) collectType(arg)
      return {
        name: event.name,
        type: normalizeType(event.type),
        signature: String(event.signature ?? ''),
        description: event.description ?? '',
        ...fieldSpread(fieldExpansion),
      }
    })

    const slots: ManifestSlot[] = meta.slots.map((slot) => {
      collectType(typeObjectOf(slot))
      return {
        name: slot.name,
        type: normalizeType(slot.type),
        description: slot.description ?? '',
      }
    })

    const exposed: ManifestExposed[] = meta.exposed.map((item) => {
      collectType(typeObjectOf(item))
      return {
        name: item.name,
        type: normalizeType(item.type),
        description: item.description ?? '',
      }
    })

    // 只有 .vue 场景算「用到了这个组件」：Markdown 文档里提到 prop 名字不算演示
    const demos = input.scenes.filter((scene) => (scene.lang ?? 'vue') === 'vue')

    // 关联场景：场景源码里出现过该组件的文件名（import 路径或组件标签）
    const base = componentName(rel)
    const related = demos.filter((scene) => {
      const text = sceneTexts.get(scene.id) ?? ''
      return scene.sources.some((source) => source.rel === rel) || text.includes(base)
    })

    const uncoveredProps = props
      .filter(
        (prop) =>
          !related.some((scene) => new RegExp(`\\b${prop.name}\\b`).test(sceneTexts.get(scene.id) ?? ''))
      )
      .map((prop) => prop.name)

    // 注意：vue-component-meta 不解析 defineEmits 的 JSDoc，事件说明只能靠 pageMeta.apiNotes 补，
    // 所以这里不把 events 计为「缺说明」，否则每个组件都恒缺。
    const undocumented: string[] = [
      ...props.filter((item) => !item.description).map((item) => `props:${item.name}`),
      ...slots.filter((item) => !item.description).map((item) => `slots:${item.name}`),
      ...exposed.filter((item) => !item.description).map((item) => `exposed:${item.name}`),
    ]

    // AST 补进来的类型排在后面：保持原有「对象类型」顺序稳定（verify 有断言）
    for (const item of astTypes?.types ?? []) {
      if (!typeRefs.has(item.name)) typeRefs.set(item.name, item)
    }

    return {
      name: meta.name || base,
      rel,
      props,
      events,
      slots,
      exposed,
      ...(typeRefs.size ? { types: [...typeRefs.values()] } : {}),
      scenes: related.map((scene) => scene.id),
      uncoveredProps,
      undocumented,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    components,
    modules: input.modules ?? [],
    env: input.env,
    scenes: input.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      group: scene.group,
      lang: scene.lang ?? 'vue',
      rel: scene.rel,
      sources: scene.sources.map((source) => source.rel),
    })),
  }
}

const renderComponentBlock = (component: ManifestComponent): string[] => {
  const lines: string[] = [`## ${component.name} (${component.rel})`, '']
  if (!component.props.length) lines.push('- 无对外 props')
  for (const prop of component.props) {
    const flags = [prop.required ? 'required' : '', prop.default ? `default=${prop.default}` : '']
      .filter(Boolean)
      .join(', ')
    const values = prop.values?.length ? `（可选值：${prop.values.join(' / ')}）` : ''
    lines.push(`- prop ${prop.name}: ${prop.type}${flags ? ` (${flags})` : ''}${values}`)
    if (prop.description) lines.push(`  ${prop.description}`)
  }
  if (component.events.length) {
    lines.push(`- events: ${component.events.map((event) => `${event.name}${event.type}`).join(', ')}`)
  }
  if (component.slots.length) {
    lines.push(`- slots: ${component.slots.map((slot) => `${slot.name}${slot.type ? ` ${slot.type}` : ''}`).join(', ')}`)
  }
  if (component.exposed.length) {
    lines.push(`- exposed: ${component.exposed.map((item) => `${item.name}${item.type ? `: ${item.type}` : ''}`).join(', ')}`)
  }
  if (component.types?.length) {
    lines.push(`- 类型定义: ${component.types.map((item) => `${item.name} (${item.file})`).join(', ')}`)
  }
  if (component.scenes.length) lines.push(`- 相关场景: ${component.scenes.join(', ')}`)
  if (component.uncoveredProps.length) lines.push(`- 未覆盖 props: ${component.uncoveredProps.join(', ')}`)
  if (component.undocumented.length) lines.push(`- 缺说明: ${component.undocumented.join(', ')}`)
  lines.push('')
  return lines
}

const renderModuleBlock = (module: ModuleApi): string[] => {
  const lines: string[] = [`## ${module.name} (${module.rel})`, '']
  for (const fn of module.functions) {
    lines.push(`- ${fn.kind} ${fn.signature}`)
    if (fn.description) lines.push(`  ${fn.description}`)
    for (const param of fn.params) {
      const flags = [param.optional ? '可选' : '', param.default ? `默认 ${param.default}` : '']
        .filter(Boolean)
        .join(', ')
      lines.push(
        `  - 参数 ${param.name}: ${param.type}${flags ? ` (${flags})` : ''}${param.description ? ` — ${param.description}` : ''}`
      )
    }
    if (fn.returns) lines.push(`  返回: ${fn.returns}`)
  }
  for (const constant of module.constants) {
    lines.push(`- const ${constant.name}: ${constant.type}${constant.value ? ` = ${constant.value}` : ''}`)
    if (constant.description) lines.push(`  ${constant.description}`)
  }
  if (module.types.length) lines.push(`- 类型定义: ${module.types.map((item) => `${item.name} (${item.file})`).join(', ')}`)
  if (module.scenes.length) lines.push(`- 相关场景: ${module.scenes.join(', ')}`)
  if (module.uncovered.length) lines.push(`- 未覆盖: ${module.uncovered.join(', ')}`)
  lines.push('')
  return lines
}

/** 环境段：AI 要先知道「这是什么站、能用什么」 */
const renderEnvSection = (env: ManifestEnv | undefined, manifest: Manifest): string[] => {
  const lines: string[] = ['## 1. 环境', '']
  const groups = env?.groups ?? []
  const pages = env?.pages ?? []
  const globals = env?.globals ?? {}
  const plugins = env?.plugins ?? []
  const sceneRoot = env?.sceneRoot ?? 'src/scenes'
  const routeBase = env?.routeBase ?? '/'
  const theme = env?.theme ?? { ui: 'auto', stage: 'light' }

  lines.push('| 项 | 值 |', '|---|---|')
  lines.push(`| 项目标题 | ${env?.title || 'rinova-playground'} |`)
  lines.push(`| 场景目录 | \`${sceneRoot}\`（严格三层：\`<分组>/<页面>/<场景>\`，子组件页可四层） |`)
  lines.push(`| 路由 | history 路由：\`${routeBase}\` + \`<分组>/<页面>\`，页内锚点 \`#<场景名>\` |`)
  lines.push(
    `| 分组 | ${groups.length ? groups.map((group) => `\`${group.dir}\` = ${group.label}`).join('；') : '未配置 groups'} |`
  )
  lines.push(`| 页面 / 场景 | ${pages.length} 个页面 / ${manifest.scenes.length} 个场景 |`)
  lines.push('| 外壳能力 | 明暗切换、预览宽度（自适应 / 手机 390 / 平板 820 / 桌面 1280）、源码卡片内搜索、页内索引 |')
  lines.push(
    `| 契约 | 组件 ${env?.components.count ?? manifest.components.length} 个${
      env?.components.configured === false ? '（未配置 components）' : ''
    }；模块 ${env?.modules.count ?? manifest.modules.length} 个${
      env?.modules.configured === false ? '（未配置 modules）' : ''
    }；插件 ${plugins.length} 个 |`
  )
  lines.push(`| 主题 | 外壳 ${theme.ui}、演示画布 ${theme.stage}；所有颜色走 \`var(--rp-color-*)\` |`)
  lines.push('')

  lines.push('### globals（场景里 `usePlaygroundEnv()` 读取）', '')
  if (Object.keys(globals).length) {
    lines.push('```json', JSON.stringify(globals, null, 2), '```', '')
  } else {
    lines.push('没有配置 `globals`。', '')
  }

  lines.push('### 插件', '')
  if (!plugins.length) {
    lines.push('没有配置 `plugins`；场景里不能假设存在登录态 / 环境变量。', '')
  } else {
    for (const plugin of plugins) lines.push(`- \`${plugin}\``)
    lines.push('')
  }
  lines.push('```ts')
  lines.push("import { usePlaygroundEnv, usePlaygroundPlugin } from '@rinova/playground'")
  lines.push('')
  lines.push('// globals 与插件返回值按声明顺序浅合并')
  lines.push('const env = usePlaygroundEnv<{ apiBase: string }>()')
  lines.push("// 单个插件的返回值；name 是插件在 ctx.setup 里注册的名字")
  lines.push("const auth = usePlaygroundPlugin<{ user: { name: string } }>('auth')")
  lines.push('```')
  lines.push('')
  lines.push('插件在 `PlaygroundRoot` 初始化完成后才可用；初始化失败时整页错误卡片，`optional: true` 的插件会被跳过。')
  lines.push('')

  return lines
}

/** 写作规则 + 最小骨架：AI 照这个写就能被框架认出来 */
const renderAuthoringSection = (): string[] => [
  '## 2. 写作规则',
  '',
  '1. 目录严格三层：`<场景根>/<分组目录>/<页面目录>/<场景名>.vue`；组件有子组件时允许四层 `<页面目录>/<子页目录>/`。',
  '2. 分组目录必须先在 `playground.config.ts` 的 `groups` 里登记，否则侧栏显示英文目录名。',
  '3. 页面信息写在 `<页面目录>/meta.ts` 的 `pageMeta`：组件页写 `component`，模块页写 `module`，都不是就是内容页（必须写 `showSource: false`）。',
  '4. 场景信息写在 `.vue` 的**普通 `<script>`** 块（不是 `<script setup>`）里的 `sceneMeta`；`.md` 场景写在 `---` 头里。',
  '5. 样式只能 `<style scoped lang="less">`，禁止命中 `:root` / `html` / `body`（会污染整个 playground，verify 会判 FAIL）。',
  '6. 只写 TypeScript、只用箭头函数；场景根不用写 `w-full`，框架已经给 `.pw-stage__inner > *` 封顶。',
  '7. 参数与输出用 `useSceneArgs(defaults, { options, labels, slot? })` / `useSceneOutput(() => ({ ... }), slot?)`；`useScenePayload` 与 sceneMeta 里的 `payload` 已删除。',
  '8. 颜色用 `var(--rp-color-*)`，不要写死十六进制或 `rgb()`。',
  '',
  '### sceneMeta 字段',
  '',
  '| 字段 | 类型 | 说明 |',
  '|---|---|---|',
  '| `title` | string | 页内索引 / 侧栏里的名字 |',
  "| `order` | number | 页内顺序 |",
  "| `section` | 'overview' / 'props' / 'events' / 'exposes' / 'slots' | 页内索引分组 |",
  '| `api` | string[] | 这个场景演示的 API 名，会变成标题下的标签并可跳到 API 表 |',
  '| `tags` | string[] | 搜索关键词 |',
  '| `description` | string | 场景说明 |',
  '| `hideInNav` | boolean | 不进侧栏，但可直接访问 |',
  '| `files` | string[] | 源码卡片里额外展示的文件 |',
  '| `showSource` | boolean | 是否给源码卡片（缺省跟随页 / 全局） |',
  '',
  '### pageMeta 字段（`<页面>/meta.ts`）',
  '',
  '| 字段 | 类型 | 说明 |',
  '|---|---|---|',
  '| `title` | string | 页名 |',
  '| `order` | number | 组内顺序 |',
  '| `description` | string | 页说明 |',
  '| `component` | string | 这一页演示的组件名（必须出现在组件契约里） |',
  '| `module` | string | 这一页演示的模块名（`config.modules` 里的文件名） |',
  '| `apiNotes` | Record<string, string> | 补 API 说明，键 `events:press` / `props:size` |',
  '| `showSource` | boolean | 页级源码开关 |',
  '| `doc` | boolean | 文档页：不套演示画布 |',
  '',
  '## 3. 最小骨架',
  '',
  '场景文件 `src/scenes/<分组>/<页面>/<场景>.vue`：',
  '',
  '```vue',
  '<script setup lang="ts">',
  "import { useSceneArgs } from '@rinova/playground'",
  "import MyButton from '@/lib/MyButton.vue'",
  '',
  "const args = useSceneArgs<{ size: 'md' | 'sm' | 'lg'; disabled: boolean }>({ size: 'md', disabled: false })",
  '</script>',
  '',
  '<script lang="ts">',
  '// 普通 <script> 块里的 sceneMeta 由插件在构建期读取',
  'export const sceneMeta = {',
  "  title: '基础用法',",
  "  section: 'props',",
  "  api: ['size', 'disabled'],",
  '}',
  '</script>',
  '',
  '<template>',
  '  <div class="demo">',
  '    <MyButton :size="args.size" :disabled="args.disabled">按钮</MyButton>',
  '  </div>',
  '</template>',
  '',
  '<style scoped lang="less">',
  '.demo {',
  '  display: flex;',
  '  gap: 8px;',
  '}',
  '</style>',
  '```',
  '',
  '新页面还需要 `<页面>/meta.ts`：',
  '',
  '```ts',
  "import { definePageMeta } from '@rinova/playground'",
  '',
  'export const pageMeta = definePageMeta({',
  "  title: 'Button',",
  '  order: 1,',
  "  component: 'MyButton',",
  '})',
  '```',
  '',
  'Markdown 场景（`<页面>/<场景>.md`，默认不展示源码、不套画布）：',
  '',
  '```md',
  '---',
  'title: 安装',
  'order: 1',
  '---',
  '',
  '正文……支持 `::: tip / info / warn / danger` 与 `::: steps`。',
  '```',
  '',
]

/** 页面清单：AI 要知道「已经有什么」，才知道该往哪加 */
const renderPageSection = (env: ManifestEnv | undefined, manifest: Manifest): string[] => {
  const lines = ['## 4. 页面清单', '']
  const pages = env?.pages ?? []
  if (!pages.length) return [...lines, '（页面清单不可用：清单里没有 env 段，重新跑 pnpm dev 生成）', '']

  lines.push('| 分组 | 页面 | id | 目录 | 绑定 | 场景 |', '|---|---|---|---|---|---|')
  for (const page of pages) {
    const binding = page.component ? `组件 ${page.component}` : page.module ? `模块 ${page.module}` : '内容页'
    lines.push(
      `| ${page.group} | ${page.title} | \`${page.id}\` | \`${page.dir}\` | ${binding} | ${page.scenes.length} 个 |`
    )
  }
  lines.push('')

  const emptyPages = pages.filter((page) => !page.scenes.length)
  if (emptyPages.length) {
    lines.push(`- 没有任何场景的页面：${emptyPages.map((page) => `\`${page.id}\``).join(', ')}`)
  }
  const emptyScenes = manifest.scenes.filter((scene) => !scene.rel)
  if (emptyScenes.length) lines.push(`- 没有源文件的场景条目：${emptyScenes.map((scene) => scene.id).join(', ')}`)
  lines.push('')
  return lines
}

const llmsHeader = (manifest: Manifest, suffix: string): string[] => [
  `# ${manifest.env?.title || 'rinova-playground'} · ${suffix}（rinova-playground 自动生成）`,
  '',
]

const kbOf = (text: string): string => `${Math.max(1, Math.round(text.length / 1024))}KB`

/**
 * 手册只留「怎么写场景 + 去哪查」。
 *
 * 组件契约（往往是几百 KB）与覆盖待办各放一个文件：AI 读手册只要几 KB，
 * 需要某个组件的契约时走 MCP（`capability_get`）而不是整份文件。
 */
export const renderLlmsTxt = (manifest: Manifest): string => {
  const componentsTxt = renderLlmsComponents(manifest)
  const todoTxt = renderLlmsTodo(manifest)
  const lines: string[] = [
    ...llmsHeader(manifest, '演示环境说明'),
    '> 由 `@rinova/playground-vite` 在 dev / build 时生成，随源码自动更新。要加一个演示，照 §3 的骨架写文件即可，不需要注册、不需要改配置。',
    '> 查契约用 `@rinova/playground-mcp` 的 MCP 工具（`capability_search` / `capability_get` / `fields_of` / `env_get` / `scene_scaffold` / `scene_validate` / `scenario_list` / `coverage_report`）—— 不要整份读契约文件。',
    '',
    ...renderEnvSection(manifest.env, manifest),
    ...renderAuthoringSection(),
    ...renderPageSection(manifest.env, manifest),
    '## 5. 契约与待办（另两个文件）',
    '',
    `- 组件契约：\`llms-components.txt\`（${manifest.components.length} 个组件，${kbOf(componentsTxt)}）—— 单个组件的 props / events / slots，优先用 MCP 的 \`capability_get\` 按需取。`,
    `- 类型与字段：对象 prop 只展开本项目声明的字段（最多 32 个），外部包的字段只给类型名；说明里的浏览器支持表格已剥掉。`,
    `- 覆盖待办：\`llms-todo.txt\`（${kbOf(todoTxt)}）—— 没有场景覆盖的 props、没有 JSDoc 的 API。`,
    '',
  ]
  return `${lines.join('\n').trim()}\n`
}

/** 组件 / 模块契约全文（大文件，给 grep 与人工查阅，不要整份喂给模型） */
export const renderLlmsComponents = (manifest: Manifest): string => {
  const lines: string[] = [...llmsHeader(manifest, '组件契约'), '## 1. 组件契约', '']
  for (const component of manifest.components) lines.push(...renderComponentBlock(component))
  lines.push('## 2. 模块契约（函数 / hooks / 常量）', '')
  if (!manifest.modules.length) lines.push('没有配置 `config.modules`。', '')
  for (const module of manifest.modules) lines.push(...renderModuleBlock(module))
  return `${lines.join('\n').trim()}\n`
}

/** 覆盖与说明的待办清单（单独成文，避免把手册撑到几百 KB） */
export const renderLlmsTodo = (manifest: Manifest): string => {
  const lines: string[] = [...llmsHeader(manifest, '覆盖与待办'), '## 1. 待办：覆盖与说明', '']
  const uncovered = manifest.components.flatMap((component) =>
    component.uncoveredProps.map((prop) => `- ${component.name}.${prop}（没有场景用到）`)
  )
  const undocumented = manifest.components.flatMap((component) =>
    component.undocumented.map((item) => `- ${component.name} ${item}（没有 JSDoc）`)
  )
  const moduleUncovered = manifest.modules.flatMap((module) =>
    module.uncovered.map((name) => `- ${module.name}.${name}（没有场景用到）`)
  )
  if (!uncovered.length && !undocumented.length && !moduleUncovered.length) {
    lines.push('全部 props / 导出都有场景，且都有 JSDoc。', '')
  } else {
    if (uncovered.length) lines.push('### 没有场景覆盖的 props', '', ...uncovered, '')
    if (moduleUncovered.length) lines.push('### 没有场景覆盖的模块导出', '', ...moduleUncovered, '')
    if (undocumented.length) lines.push('### 没有 JSDoc 的 API', '', ...undocumented, '')
  }
  return `${lines.join('\n').trim()}\n`
}

export const renderCoverage = (manifest: Manifest): string => {
  const rows = manifest.components.flatMap((component) =>
    component.props.map((prop) => ({
      component: component.name,
      prop: prop.name,
      covered: !component.uncoveredProps.includes(prop.name),
    }))
  )

  const total = rows.length
  const covered = rows.filter((row) => row.covered).length
  const missing = manifest.components.flatMap((component) =>
    component.undocumented.map((item) => `| ${component.name} | ${item} |`)
  )

  const lines = [
    '# Props 覆盖报告',
    '',
    `生成时间：${manifest.generatedAt}`,
    `覆盖：${covered}/${total}（${total ? Math.round((covered / total) * 100) : 0}%）`,
    '',
    '| 组件 | prop | 有场景覆盖 |',
    '|---|---|---|',
    ...rows.map((row) => `| ${row.component} | ${row.prop} | ${row.covered ? '是' : '否'} |`),
    '',
    '# 缺 JSDoc 的 API',
    '',
    '补上 `/** 说明 */` 就会出现在页面的 API 表里。',
    '',
    '| 组件 | API |',
    '|---|---|',
    ...(missing.length ? missing : ['| — | 全部已写说明 |']),
    '',
  ]

  return lines.join('\n')
}

export const writeManifest = (outDir: string, manifest: Manifest): string[] => {
  fs.mkdirSync(outDir, { recursive: true })
  const targets = [
    // 紧凑 JSON：缩进版在真实宿主上会变成十几万行，谁要读用 `jq .` / `jq '.[]'`
    { file: path.join(outDir, 'manifest.json'), content: `${JSON.stringify(manifest)}\n` },
    { file: path.join(outDir, 'llms.txt'), content: renderLlmsTxt(manifest) },
    { file: path.join(outDir, 'llms-components.txt'), content: renderLlmsComponents(manifest) },
    { file: path.join(outDir, 'llms-todo.txt'), content: renderLlmsTodo(manifest) },
    { file: path.join(outDir, 'coverage.md'), content: renderCoverage(manifest) },
  ]

  for (const target of targets) fs.writeFileSync(target.file, target.content, 'utf8')
  return targets.map((target) => target.file)
}
