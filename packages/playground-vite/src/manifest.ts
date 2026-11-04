import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

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
  /** 对象 / 对象数组类型的字段展开（一层），如 `columns: Column[]` → Column 的字段 */
  fields?: ManifestField[]
}

export interface ManifestEvent {
  name: string
  /** 参数列表，如 `[event: FocusEvent]` */
  type: string
  /** 完整签名，如 `(event: "focus", event: FocusEvent): void` */
  signature: string
  description: string
  /** 某个对象参数展开后的字段（取第一个带属性的参数） */
  fields?: ManifestField[]
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
  kind: 'interface' | 'type'
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

export interface Manifest {
  generatedAt: string
  components: ManifestComponent[]
  scenes: ManifestScene[]
}

export interface ManifestInput {
  root: string
  /** 组件 glob，如 `src/lib/**\/*.vue` */
  patterns: string[]
  /** tsconfig 路径（相对项目根） */
  tsconfig: string
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

const readFields = (prop: unknown): ManifestField[] => {
  try {
    if (DEBUG_FIELDS) console.warn('[fields] enter', (prop as { name?: string }).name)
    const getter = (prop as { getTypeObject?: () => unknown }).getTypeObject
    if (typeof getter !== 'function') {
      if (DEBUG_FIELDS) console.warn('[fields] no getTypeObject')
      return []
    }
    const type = getter.call(prop) as Record<string, unknown> | undefined
    if (!type) {
      if (DEBUG_FIELDS) console.warn('[fields] no type')
      return []
    }
    if (DEBUG_FIELDS) console.warn('[fields] type flags', Number(type.flags), 'keys', Object.keys(type).slice(0, 8).join(','))
    const ts = type.checker as Record<string, (...args: never[]) => unknown> & {
      typeToString: (value: unknown) => string
    }
    if (!ts || typeof ts.getPropertiesOfType !== 'function') {
      if (DEBUG_FIELDS) console.warn('[fields] no checker', Object.keys(type))
      return []
    }

    let target: Record<string, unknown> = type
    if ((Number(type.flags) & FLAG_UNION) === FLAG_UNION) {
      const parts = (type.types as Array<Record<string, unknown>> | undefined) ?? []
      const objectPart = parts.find((part) => (Number(part.flags) & FLAG_OBJECT) === FLAG_OBJECT)
      if (!objectPart) {
        if (DEBUG_FIELDS) console.warn('[fields] union without object', parts.map((part) => Number(part.flags)).join(','))
        return []
      }
      target = objectPart
    }
    // 数组：取元素类型
    const args = target.typeArguments as unknown[] | undefined
    if (args && args.length) target = args[0] as Record<string, unknown>
    if ((Number(target.flags) & FLAG_OBJECT) !== FLAG_OBJECT) {
      if (DEBUG_FIELDS) console.warn('[fields] target not object', Number(target.flags), ts.typeToString(target))
      return []
    }

    const symbols = (ts.getPropertiesOfType as unknown as (value: unknown) => Array<Record<string, unknown>>)(target)
    return symbols
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
          description,
        }
      })
      .filter((item): item is ManifestField => item !== null)
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[fields] error', String(error))
    return []
  }
}

/** 事件：从参数元组里找第一个对象参数，展开它的字段 */
const readEventFields = (event: unknown): ManifestField[] => {
  try {
    const getter = (event as { getTypeObject?: () => unknown }).getTypeObject
    if (typeof getter !== 'function') return []
    const tuple = getter.call(event) as Record<string, unknown> | undefined
    if (!tuple) return []
    const ts = tuple.checker as Record<string, (...args: never[]) => unknown> & {
      typeToString: (value: unknown) => string
      getPropertiesOfType: (value: unknown) => Array<Record<string, unknown>>
    }
    if (!ts || typeof ts.getPropertiesOfType !== 'function') return []
    const args = (tuple.typeArguments as unknown[] | undefined) ?? []
    for (const arg of args) {
      const type = arg as Record<string, unknown>
      if ((Number(type.flags) & FLAG_OBJECT) !== FLAG_OBJECT) continue
      const fields = readFields({
        getTypeObject: () => type,
      })
      if (fields.length) return fields
    }
    return []
  } catch (error) {
    if (DEBUG_FIELDS) console.warn('[fields] event error', String(error))
    return []
  }
}

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
        const fields = readFields(prop)
        collectType(typeObjectOf(prop))
        return {
          name: prop.name,
          type,
          required: Boolean(prop.required),
          default: String(prop.default ?? ''),
          description: prop.description ?? '',
          ...(fields.length ? { fields } : {}),
        }
      })

    const events: ManifestEvent[] = meta.events.map((event) => {
      const fields = readEventFields(event)
      const tuple = typeObjectOf(event) as Record<string, unknown> | undefined
      for (const arg of (tuple?.typeArguments as unknown[] | undefined) ?? []) collectType(arg)
      return {
        name: event.name,
        type: normalizeType(event.type),
        signature: String(event.signature ?? ''),
        description: event.description ?? '',
        ...(fields.length ? { fields } : {}),
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

export const renderLlmsTxt = (manifest: Manifest): string => {
  const lines: string[] = ['# 组件能力清单（rinova-playground 生成）', '']

  for (const component of manifest.components) {
    lines.push(`## ${component.name} (${component.rel})`, '')
    if (!component.props.length) lines.push('- 无对外 props')
    for (const prop of component.props) {
      const flags = [prop.required ? 'required' : '', prop.default ? `default=${prop.default}` : '']
        .filter(Boolean)
        .join(', ')
      lines.push(`- prop ${prop.name}: ${prop.type}${flags ? ` (${flags})` : ''}`)
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
    if (component.uncoveredProps.length)
      lines.push(`- 未覆盖 props: ${component.uncoveredProps.join(', ')}`)
    if (component.undocumented.length)
      lines.push(`- 缺说明: ${component.undocumented.join(', ')}`)
    lines.push('')
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
    { file: path.join(outDir, 'manifest.json'), content: `${JSON.stringify(manifest, null, 2)}\n` },
    { file: path.join(outDir, 'llms.txt'), content: renderLlmsTxt(manifest) },
    { file: path.join(outDir, 'coverage.md'), content: renderCoverage(manifest) },
  ]

  for (const target of targets) fs.writeFileSync(target.file, target.content, 'utf8')
  return targets.map((target) => target.file)
}
