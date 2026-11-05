import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { globToRegExp } from './manifest.js'

const require = createRequire(import.meta.url)

/** 非组件文件（纯函数 / hooks / 常量）的契约。页面通过 `pageMeta.module` 绑定。 */

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
  /** 名字以 use + 大写开头即为 hook，UI 上单独标一下 */
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
  /** 短值直接给原文，长的留空（由类型 + 说明承担） */
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
  /** 引用了这个模块的场景 id（sceneMeta.files 命中） */
  scenes: string[]
  /** 没有任何场景提到的导出名 */
  uncovered: string[]
}

export interface BuildModulesInput {
  root: string
  /** 模块 glob，如 `src/lib/**\/*.ts` */
  patterns: string[]
  tsconfig: string
  scenes: Array<{ id: string; rel: string; sources: { rel: string }[] }>
}

interface ProgramCache {
  key: string
  program: import('typescript').Program
}

let programCache: ProgramCache | null = null

const toPosix = (value: string): string => value.split(path.sep).join('/')

const walkMatch = (root: string, patterns: RegExp[]): string[] => {
  const out: string[] = []
  const walk = (dir: string): void => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
        continue
      }
      const rel = toPosix(path.relative(root, abs))
      if (patterns.some((pattern) => pattern.test(rel))) out.push(rel)
    }
  }
  walk(root)
  return out.sort()
}

const fileKey = (abs: string): string => {
  try {
    const stat = fs.statSync(abs)
    return `${stat.mtimeMs}:${stat.size}`
  } catch {
    return 'missing'
  }
}

/**
 * 用一个 TypeScript Program 抽取 `.ts` 的导出契约。
 *
 * 只在配置了 `modules` 时才会被调用 —— 不配这项的项目不会多付建 Program 的开销。
 */
export const buildModules = (input: BuildModulesInput): ModuleApi[] => {
  const ts = require('typescript') as typeof import('typescript')
  const patterns = input.patterns.map((pattern) => globToRegExp(pattern))
  const files = walkMatch(input.root, patterns)
  if (!files.length) return []

  const tsconfigPath = path.isAbsolute(input.tsconfig) ? input.tsconfig : path.join(input.root, input.tsconfig)
  const cacheKey = `${tsconfigPath}|${files.map((rel) => `${rel}@${fileKey(path.join(input.root, rel))}`).join(',')}`

  if (!programCache || programCache.key !== cacheKey) {
    const readConfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    const parsed = ts.parseJsonConfigFileContent(readConfig.config ?? {}, ts.sys, path.dirname(tsconfigPath))
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options })
    programCache = { key: cacheKey, program }
  }

  const program = programCache.program
  const checker = program.getTypeChecker()

  const sceneTexts = input.scenes.map((scene) => {
    const abs = path.join(input.root, scene.rel)
    try {
      return { id: scene.id, text: fs.readFileSync(abs, 'utf8'), sources: scene.sources.map((item) => item.rel) }
    } catch {
      return { id: scene.id, text: '', sources: scene.sources.map((item) => item.rel) }
    }
  })

  const modules: ModuleApi[] = []

  for (const rel of files) {
    const abs = path.join(input.root, rel)
    const source = program.getSourceFile(abs)
    if (!source) continue

    const moduleSymbol = checker.getSymbolAtLocation(source)
    if (!moduleSymbol) continue

    const functions: ModuleFunction[] = []
    const constants: ModuleConstant[] = []
    const types: ModuleType[] = []

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
      const name = exported.getName()
      if (name.startsWith('_') || name === 'default') continue

      const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
      const coveredBy = sceneTexts.filter((scene) => scene.text.includes(name)).map((scene) => scene.id)
      const covered = coveredBy.length > 0

      // 类型别名 / interface → 类型页签
      if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
        const node = symbol.declarations?.[0]
        if (node) {
          types.push({
            name,
            kind: ts.isInterfaceDeclaration(node) ? 'interface' : 'type',
            file: rel,
            code: node.getText(source).trim(),
          })
        }
        continue
      }

      const type = declaration ? checker.getTypeOfSymbolAtLocation(symbol, declaration) : null
      const signature = type?.getCallSignatures()[0]

      // 函数 / hook（`const fn = () => {}` 也走这里）
      if (signature) {
        const params: ModuleParam[] = signature.getParameters().map((param) => {
          const paramDeclaration = param.valueDeclaration as import('typescript').ParameterDeclaration | undefined
          const paramType = paramDeclaration
            ? checker.getTypeOfSymbolAtLocation(param, paramDeclaration)
            : type ?? checker.getAnyType()
          const isBinding = Boolean(paramDeclaration && ts.isObjectBindingPattern(paramDeclaration.name))
          const typeName = checker.typeToString(paramType)
          return {
            // 解构参数在 TS 里名字是 __0，用类型名兜底
            name: isBinding ? 'options' : param.getName(),
            type: typeName,
            // 有默认值的参数在调用时可省，展示成可选更贴近实际用法
            optional:
              (param.flags & ts.SymbolFlags.Optional) !== 0 ||
              Boolean(paramDeclaration?.questionToken) ||
              Boolean(paramDeclaration?.initializer),
            default: paramDeclaration?.initializer ? paramDeclaration.initializer.getText(source).slice(0, 40) : '',
            description: ts.displayPartsToString(param.getDocumentationComment(checker)).trim(),
          }
        })

        const returns = checker.typeToString(signature.getReturnType())
        const signatureText = `${name}${signature.getTypeParameters()?.length ? '<…>' : ''}(${params
          .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
          .join(', ')}): ${returns}`

        functions.push({
          name,
          kind: /^use[A-Z]/.test(name) ? 'hook' : 'function',
          signature: signatureText,
          params,
          returns,
          description,
          covered,
          coveredBy,
        })
        continue
      }

      // 常量 / 字典
      if (symbol.flags & ts.SymbolFlags.Variable) {
        const initializer = (declaration as import('typescript').VariableDeclaration | undefined)?.initializer
        const raw = initializer ? initializer.getText(source) : ''
        constants.push({
          name,
          type: type ? checker.typeToString(type) : '',
          value: raw && raw.length <= 80 ? raw : '',
          description,
          covered,
          coveredBy,
        })
      }
    }

    const uncovered = [...functions, ...constants].filter((item) => !item.covered).map((item) => item.name)
    const scenes = sceneTexts.filter((scene) => scene.sources.includes(rel)).map((scene) => scene.id)

    // 没有任何可展示契约的文件（纯 re-export、只有一个默认导出等）不进清单
    if (!functions.length && !constants.length && !types.length) continue

    modules.push({
      name: rel.split('/').pop()?.replace(/\.(ts|mts|js)$/, '') ?? rel,
      rel,
      functions,
      constants,
      types,
      scenes,
      uncovered,
    })
  }

  return modules
}
