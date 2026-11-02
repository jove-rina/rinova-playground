import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

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

export interface ManifestProp {
  name: string
  type: string
  required: boolean
  default: string
  description: string
}

export interface ManifestComponent {
  name: string
  rel: string
  props: ManifestProp[]
  events: string[]
  slots: string[]
  exposed: string[]
  scenes: string[]
  uncoveredProps: string[]
}

export interface ManifestScene {
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
  scenes: Array<{ id: string; title: string; group: string; rel: string; sources: { rel: string }[] }>
}

const toPosix = (value: string): string => value.split(path.sep).join('/')

/** 极简 glob：只支持 `dir/**\/*.vue`、`dir/*.vue`、`dir/name.vue` */
const globToRegExp = (pattern: string): RegExp => {
  const normalized = toPosix(pattern)
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const withGlob = escaped.replace(/\*\*\//g, '(?:.*/)?').replace(/\*/g, '[^/]*')
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

const normalizeType = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(String).join(' | ')
  return String(value ?? '')
}

export const buildManifest = (input: ManifestInput): Manifest => {
  const { createChecker } = require('vue-component-meta') as typeof import('vue-component-meta')

  const tsconfigPath = path.isAbsolute(input.tsconfig)
    ? input.tsconfig
    : path.join(input.root, input.tsconfig)
  const checker = createChecker(tsconfigPath)

  const sceneTexts = new Map<string, string>()
  for (const scene of input.scenes) {
    const abs = path.join(input.root, scene.rel)
    sceneTexts.set(
      scene.id,
      fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : ''
    )
  }

  const components: ManifestComponent[] = findComponentFiles(input.root, input.patterns).map((rel) => {
    const meta = checker.getComponentMeta(path.join(input.root, rel))

    const props: ManifestProp[] = meta.props
      .filter((prop) => isOwnProp(prop.name))
      .map((prop) => ({
        name: prop.name,
        type: normalizeType(prop.type),
        required: Boolean(prop.required),
        default: String(prop.default ?? ''),
        description: prop.description ?? '',
      }))

    // 关联场景：场景源码里出现过该组件的文件名（import 路径或组件标签）
    const base = componentName(rel)
    const related = input.scenes.filter((scene) => {
      const text = sceneTexts.get(scene.id) ?? ''
      return scene.sources.some((source) => source.rel === rel) || text.includes(base)
    })

    const uncoveredProps = props
      .filter(
        (prop) =>
          !related.some((scene) => new RegExp(`\\b${prop.name}\\b`).test(sceneTexts.get(scene.id) ?? ''))
      )
      .map((prop) => prop.name)

    return {
      name: meta.name || base,
      rel,
      props,
      events: meta.events.map((event) => event.name),
      slots: meta.slots.map((slot) => slot.name),
      exposed: meta.exposed.map((item) => item.name),
      scenes: related.map((scene) => scene.id),
      uncoveredProps,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    components,
    scenes: input.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      group: scene.group,
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
    if (component.events.length) lines.push(`- events: ${component.events.join(', ')}`)
    if (component.slots.length) lines.push(`- slots: ${component.slots.join(', ')}`)
    if (component.exposed.length) lines.push(`- exposed: ${component.exposed.join(', ')}`)
    if (component.scenes.length) lines.push(`- 相关场景: ${component.scenes.join(', ')}`)
    if (component.uncoveredProps.length)
      lines.push(`- 未覆盖 props: ${component.uncoveredProps.join(', ')}`)
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
