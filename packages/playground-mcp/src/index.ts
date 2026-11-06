#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { scaffoldScene, validateScenes } from './validate.js'
import type { ValidateManifest } from './validate.js'

const require = createRequire(import.meta.url)
/** 版本从 package.json 读，免得 source 里的硬编码跟发版脚本脱节 */
const MCP_VERSION = (require('../package.json') as { version: string }).version

interface ManifestField {
  name: string
  type: string
  required: boolean
  description: string
}

interface ManifestProp {
  name: string
  type: string
  required: boolean
  default: string
  description: string
  fields?: ManifestField[]
  fieldCount?: number
  fieldsTruncated?: boolean
}

interface ManifestEvent {
  name: string
  type: string
  signature: string
  description: string
  fields?: ManifestField[]
  fieldCount?: number
  fieldsTruncated?: boolean
}

interface ManifestComponent {
  name: string
  rel: string
  props: ManifestProp[]
  events: ManifestEvent[]
  slots: { name: string; type: string; description: string }[]
  exposed: { name: string; type: string; description: string }[]
  types?: { name: string; kind: string; file: string; code: string }[]
  scenes: string[]
  uncoveredProps: string[]
  undocumented: string[]
}

interface ManifestScene {
  id: string
  title: string
  group: string
  rel: string
  sources: string[]
}

interface ManifestPage {
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
  dir: string
  scenes: string[]
}

interface ManifestEnv {
  title: string
  sceneRoot: string
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

interface Manifest extends ValidateManifest {
  generatedAt: string
  components: ManifestComponent[]
  scenes: ManifestScene[]
  modules: Array<{
    name: string
    rel: string
    functions: { name: string; kind: string; signature: string; description: string }[]
    constants: { name: string; type: string; value: string; description: string }[]
    types: { name: string; kind: string; file: string }[]
    scenes: string[]
    uncovered: string[]
  }>
  /** 演示环境（globals / 插件 / 分组 / 页面清单）；0.5 及更早的清单没有这一段 */
  env?: ManifestEnv
}

const toPosix = (value: string): string => value.split(path.sep).join('/')

/** 在源文件里定位某个标识符首次出现的行，产出 `path:line` 锚点 */
const locate = (root: string, rel: string, needle: string): string => {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) return rel
  const lines = fs.readFileSync(abs, 'utf8').split('\n')
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 先找声明行（`rows?:` / `rows:` / `rows =`），避免命中 JSDoc 里提到的同名词
  const declaration = new RegExp(`^\\s*(?:readonly\\s+)?${escaped}\\??\\s*[:=]`)
  const word = new RegExp(`\\b${escaped}\\b`)
  const isComment = (line: string): boolean => /^\s*(?:\*|\/\/|<!--)/.test(line)
  const codeLines = lines.map((line, index) => ({ line, index })).filter((item) => !isComment(item.line))
  const hit =
    codeLines.find((item) => declaration.test(item.line)) ??
    codeLines.find((item) => word.test(item.line))
  return hit ? `${rel}:${hit.index + 1}` : rel
}

/**
 * 只要行号：组件的所有 prop / event 都在同一个文件里（路径写在标题下那一行），
 * 每行再带一遍绝对路径等于把同一段字符串复制几百次 —— 真实宿主上一个 500 行的响应有 4/5 是路径。
 */
const lineOf = (root: string, rel: string, needle: string): string => {
  const located = locate(root, rel, needle)
  const at = located.lastIndexOf(':')
  return at >= rel.length ? `L${located.slice(at + 1)}` : ''
}

const USAGE = `rinova-playground-mcp —— 把契约清单暴露给 AI 编码工具（只读）

用法：
  rinova-playground-mcp [--project <目录>] [--manifest <文件>]

选项：
  --project <目录>   项目根（默认：当前目录，并向上找 .playground/manifest.json）
  --manifest <文件>  直接指定清单文件
  -h, --help         显示帮助

清单由 @rinova/playground-vite 在 pnpm dev / pnpm build 时生成，需要 playground.config.ts 里配置 components。
`

/** 从 start 向上最多 6 层找 .playground/manifest.json（客户端启动目录常常是包内子目录） */
const findManifestUp = (start: string): string | null => {
  let dir = path.resolve(start)
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, '.playground/manifest.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

interface ResolvedArgs {
  /** 项目根（含 .playground 的那一层），用于拼 `文件:行号` 锚点 */
  project: string
  manifest: string
  /** 找不到清单时用来提示「从哪开始找的」 */
  searchFrom: string
}

const readStamp = (file: string): string => {
  try {
    const stat = fs.statSync(file)
    return `${stat.mtimeMs}:${stat.size}`
  } catch {
    return 'missing'
  }
}

const parseArgs = (argv: string[]): ResolvedArgs => {
  const args = argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(USAGE)
    process.exit(0)
  }
  const readFlag = (flag: string): string | undefined => {
    const index = args.indexOf(flag)
    return index > -1 ? args[index + 1] : undefined
  }

  const manifestArg = readFlag('--manifest')
  if (manifestArg) {
    const manifest = path.resolve(manifestArg)
    return { project: path.dirname(path.dirname(manifest)), manifest, searchFrom: path.dirname(manifest) }
  }

  const projectArg = readFlag('--project')
  const base = projectArg ? path.resolve(projectArg) : process.cwd()
  const found = findManifestUp(base)
  return {
    project: found ? path.dirname(path.dirname(found)) : base,
    manifest: found ?? path.join(base, '.playground/manifest.json'),
    searchFrom: base,
  }
}

const loadManifest = (file: string, searchFrom: string): Manifest => {
  if (!fs.existsSync(file)) {
    throw new Error(
      [
        `找不到契约清单：${file}`,
        `（从 ${searchFrom} 向上找了 6 层）`,
        '',
        '生成方式：在项目里配置 playground.config.ts 的 components（可选 modules），然后跑一次 pnpm dev 或 pnpm build。',
        '也可以在客户端配置里用 --project <项目根> 或 --manifest <.playground/manifest.json 的绝对路径> 显式指定。',
      ].join('\n')
    )
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest
}

/**
 * 单个工具响应里内联展开的字段上限。
 *
 * 超过就只给一行「共 N 个字段」+ `fields_of` 的取法：真实宿主里一个 prop 可能有几十上百个字段，
 * 全量铺进一次响应就是几百 KB，模型读不动也记不住。
 */
const MAX_FIELDS_INLINE = 8
/** Types 段最多展开几个类型的源码原文 */
const MAX_TYPES_INLINE = 12

const fieldLine = (field: ManifestField): string =>
  `  · ${field.name}: ${field.type}${field.required ? ' (必填)' : ''}${field.description ? ` — ${field.description}` : ''}`

const formatFields = (
  propName: string,
  expansion: { fields?: ManifestField[]; fieldCount?: number; fieldsTruncated?: boolean },
  componentName: string
): string[] => {
  const fields = expansion.fields ?? []
  if (!fields.length) return []
  const total = expansion.fieldCount ?? fields.length
  if (fields.length > MAX_FIELDS_INLINE) {
    return [
      `  · 共 ${total} 个字段${expansion.fieldsTruncated ? '（已按声明序截断）' : ''}，用 fields_of(component="${componentName}", prop="${propName}") 取前 20`,
    ]
  }
  const lines = fields.map(fieldLine)
  if (total > fields.length) lines.push(`  · …另有 ${total - fields.length} 个字段（已截断），用 fields_of 取`)
  return lines
}

const formatComponent = (root: string, component: ManifestComponent, manifest: Manifest): string => {
  const componentLine = lineOf(root, component.rel, component.name)
  const source = componentLine ? `${component.rel}:${componentLine.slice(1)}` : component.rel
  const anchor = (needle: string): string => {
    const at = lineOf(root, component.rel, needle)
    return at ? ` ← ${at}` : ''
  }
  const lines: string[] = [`# ${component.name}`, `源码：${source}（下面的 ← L<n> 指这个文件的行号）`, '', '## Props']

  if (!component.props.length) lines.push('- （无对外 props）')
  for (const prop of component.props) {
    const flags = [prop.required ? 'required' : '', prop.default ? `default=${prop.default}` : '']
      .filter(Boolean)
      .join(', ')
    lines.push(`- ${prop.name}: ${prop.type}${flags ? ` (${flags})` : ''}${anchor(prop.name)}`)
    if (prop.description) lines.push(`  ${prop.description}`)
    lines.push(...formatFields(prop.name, prop, component.name))
  }

  if (component.events.length) {
    lines.push('', '## Events')
    for (const event of component.events) {
      lines.push(`- ${event.name} ${event.type}${event.description ? ` — ${event.description}` : ''}`)
      if (event.signature) lines.push(`  ${event.signature}`)
      lines.push(...formatFields(event.name, event, component.name))
    }
  }
  if (component.slots.length) {
    lines.push('', '## Slots')
    for (const slot of component.slots) {
      lines.push(`- ${slot.name}${slot.description ? ` — ${slot.description}` : ''}`)
    }
  }
  if (component.exposed.length) {
    lines.push('', '## Exposed')
    for (const item of component.exposed) {
      lines.push(`- ${item.name}: ${item.type}${item.description ? ` — ${item.description}` : ''}`)
    }
  }

  if (component.types?.length) {
    lines.push('', '## Types')
    component.types.slice(0, MAX_TYPES_INLINE).forEach((item) => {
      lines.push(`- ${item.name}（${item.kind}，${item.file}）`, '```ts', item.code, '```')
    })
    if (component.types.length > MAX_TYPES_INLINE) {
      lines.push(`- …另有 ${component.types.length - MAX_TYPES_INLINE} 个类型，看页面「Types」页签`)
    }
  }

  const scenes = manifest.scenes.filter((scene) => component.scenes.includes(scene.id))
  lines.push('', '## 相关场景')
  if (!scenes.length) lines.push('- （暂无场景，建议补一个）')
  for (const scene of scenes) {
    lines.push(`- ${scene.group} / ${scene.title}  ← ${scene.rel}`)
  }

  if (component.uncoveredProps.length) {
    lines.push('', `## 未覆盖 props`, ...component.uncoveredProps.map((name) => `- ${name}`))
  }

  return lines.join('\n')
}

const matches = (component: ManifestComponent, query: string): boolean => {
  const needle = query.toLowerCase()
  return (
    component.name.toLowerCase().includes(needle) ||
    component.rel.toLowerCase().includes(needle) ||
    component.props.some((prop) => prop.name.toLowerCase().includes(needle)) ||
    component.scenes.some((scene) => scene.toLowerCase().includes(needle))
  )
}

const main = async (): Promise<void> => {
  const { project, manifest: manifestPath, searchFrom } = parseArgs(process.argv)

  let manifest: Manifest
  try {
    manifest = loadManifest(manifestPath, searchFrom)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }

  /**
   * 清单是构建产物，dev server 会在场景 / 组件变化后重写它。
   * 每次工具调用前比一下 mtime+size，变了就重读 —— 否则 MCP 会一直拿启动那一刻的页面表。
   */
  let manifestStamp = readStamp(manifestPath)
  const refresh = (): void => {
    const stamp = readStamp(manifestPath)
    if (stamp === manifestStamp) return
    try {
      manifest = loadManifest(manifestPath, searchFrom)
      manifestStamp = stamp
    } catch {
      // 清单正在被写（JSON 半个文件）或暂时不可读：沿用上一次的，下次调用再试
    }
  }

  const server = new McpServer({ name: 'rinova-playground', version: MCP_VERSION })

  server.registerTool(
    'capability_search',
    {
      title: '搜索组件能力',
      description: '按组件名 / prop 名 / 场景 id 搜索，返回带文件行号的摘要',
      inputSchema: { query: z.string().min(1).describe('关键词'), limit: z.number().int().min(1).max(20).optional() },
    },
    ({ query, limit }) => {
      refresh()
      const hits = manifest.components.filter((component) => matches(component, query)).slice(0, limit ?? 5)
      if (!hits.length) {
        return { content: [{ type: 'text', text: `没有匹配 "${query}" 的组件。已知组件：${manifest.components.map((item) => item.name).join(', ')}` }] }
      }
      const text = hits
        .map(
          (component) =>
            `- ${component.name}（${component.rel}）props: ${
              component.props.map((prop) => prop.name).join(', ') || '无'
            }｜场景 ${component.scenes.length} 个`
        )
        .join('\n')
      return { content: [{ type: 'text', text }] }
    }
  )

  server.registerTool(
    'capability_get',
    {
      title: '获取组件契约',
      description: '返回组件的 props / events / slots / exposed、源码锚点与相关场景',
      inputSchema: { component: z.string().min(1).describe('组件名，如 MyButton') },
    },
    ({ component }) => {
      refresh()
      const found = manifest.components.find(
        (item) => item.name.toLowerCase() === component.toLowerCase() || item.rel.endsWith(component)
      )
      if (!found) {
        return {
          content: [
            { type: 'text', text: `没找到组件 "${component}"。可用：${manifest.components.map((item) => item.name).join(', ')}` },
          ],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: formatComponent(project, found, manifest) }] }
    }
  )

  server.registerTool(
    'fields_of',
    {
      title: '取对象字段',
      description:
        '按需取某个 prop / 事件参数展开后的字段（默认前 20 个）。capability_get 里字段超过 8 个时只给总数，细节用这个工具取',
      inputSchema: {
        component: z.string().min(1).describe('组件名，如 MyTable'),
        prop: z.string().min(1).describe('prop 名或事件名，如 columns'),
        limit: z.number().int().min(1).max(200).optional().describe('最多返回多少个字段，默认 20'),
      },
    },
    ({ component, prop, limit }) => {
      refresh()
      const found = manifest.components.find(
        (item) => item.name.toLowerCase() === component.toLowerCase() || item.rel.endsWith(component)
      )
      if (!found) {
        return { content: [{ type: 'text', text: `没找到组件 "${component}"。` }], isError: true }
      }
      const expansion =
        found.props.find((item) => item.name === prop) ?? found.events.find((item) => item.name === prop)
      if (!expansion) {
        const names = [...found.props.map((item) => item.name), ...found.events.map((item) => item.name)]
        return {
          content: [{ type: 'text', text: `${found.name} 没有 "${prop}"。可选：${names.join(', ') || '无'}` }],
          isError: true,
        }
      }
      const fields = expansion.fields ?? []
      if (!fields.length) {
        return {
          content: [
            {
              type: 'text',
              text: `${found.name}.${prop} 没有可展开的字段：类型是 ${(expansion as ManifestProp).type ?? ''}，字段要么来自外部包（如 element-plus / csstype），要么不是对象类型。`,
            },
          ],
        }
      }
      const size = Math.min(limit ?? 20, fields.length)
      const total = expansion.fieldCount ?? fields.length
      const lines = [
        `# ${found.name}.${prop}：${total} 个字段${expansion.fieldsTruncated ? '（清单按声明序截断到 32 个）' : ''}`,
        '',
        ...fields.slice(0, size).map((field) => `- ${field.name}: ${field.type}${field.required ? ' (必填)' : ''}${field.description ? ` — ${field.description}` : ''}`),
      ]
      if (total > size) lines.push('', `（显示前 ${size} 个；调大 limit 最多 200）`)
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }
  )

  server.registerTool(
    'scenario_list',
    {
      title: '列出场景',
      description: '列出全部场景；传 component 则只列该组件相关的场景',
      inputSchema: { component: z.string().optional().describe('组件名，可选') },
    },
    ({ component }) => {
      refresh()
      const scenes = component
        ? manifest.scenes.filter((scene) => {
            const target = manifest.components.find((item) => item.name === component)
            return target ? target.scenes.includes(scene.id) : false
          })
        : manifest.scenes

      if (!scenes.length) return { content: [{ type: 'text', text: '没有场景。' }] }

      const text = scenes
        .map((scene) => `- ${scene.group} / ${scene.title}  id=${scene.id}  ← ${scene.rel}`)
        .join('\n')
      return { content: [{ type: 'text', text }] }
    }
  )

  server.registerTool(
    'coverage_report',
    {
      title: 'props 覆盖报告',
      description:
        '默认给按组件汇总的覆盖情况（哪个组件缺多少 prop 有场景）；detail=true 才逐个列出没有场景覆盖的 props',
      inputSchema: {
        detail: z.boolean().optional().describe('true 则逐条列出未覆盖的 props，默认只给汇总'),
        limit: z.number().int().min(1).max(200).optional().describe('detail=true 时最多列多少条，默认 50'),
      },
    },
    ({ detail, limit }) => {
      refresh()
      const total = manifest.components.reduce((sum, component) => sum + component.props.length, 0)
      const uncovered = manifest.components.reduce((sum, component) => sum + component.uncoveredProps.length, 0)
      const head = `覆盖 ${total - uncovered}/${total}｜清单生成时间 ${manifest.generatedAt}`
      if (!uncovered) {
        return { content: [{ type: 'text', text: `${head}\n\n全部 props 都有场景覆盖。` }] }
      }
      if (!detail) {
        const rows = manifest.components
          .filter((component) => component.uncoveredProps.length)
          .map((component) => ({
            text: `- ${component.name}: ${component.uncoveredProps.length}/${component.props.length} 个 prop 缺场景`,
            count: component.uncoveredProps.length,
          }))
          .sort((a, b) => b.count - a.count)
        const showsMissing = manifest.components.filter((component) => component.undocumented.length).length
        const top = rows.slice(0, 20).map((row) => row.text)
        if (rows.length > top.length) top.push(`- …另有 ${rows.length - top.length} 个组件有缺口`)
        return {
          content: [
            {
              type: 'text',
              text: [
                head,
                '',
                `缺场景的组件：${rows.length} 个；缺 JSDoc 的组件：${showsMissing} 个`,
                '',
                ...top,
                '',
                '要看具体是哪几个 prop：coverage_report(detail=true)；待办全文在 .playground/llms-todo.txt。',
              ].join('\n'),
            },
          ],
        }
      }
      const size = limit ?? 50
      const rows = manifest.components.flatMap((component) =>
        component.uncoveredProps.map((prop) => ({
          name: `${component.name}.${prop}`,
          rel: component.rel,
          prop
        }))
      )
      const shown = rows.slice(0, size).map((row) => `- ${row.name}  ← ${locate(project, row.rel, row.prop)}`)
      if (rows.length > shown.length) shown.push(`- …另有 ${rows.length - shown.length} 条（调大 limit，或看 .playground/llms-todo.txt）`)
      return { content: [{ type: 'text', text: `${head}\n\n${shown.join('\n')}` }] }
    }
  )

  const kebab = (input: string): string => {
    const ascii = input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return ascii || ''
  }

  const formatEnv = (manifest: Manifest): string => {
    const env = manifest.env
    if (!env) {
      return '这份清单里没有 env 段（0.5 及更早的清单没有）。重新跑一次 pnpm dev 生成：清单由 @rinova/playground-vite 在扫描场景时写入。'
    }
    const lines: string[] = [
      `# 演示环境：${env.title}`,
      '',
      `- 场景目录：${env.sceneRoot}（严格三层：<分组>/<页面>/<场景>；子组件页可四层）`,
      `- 路由：history 路由 ${env.routeBase} + <分组>/<页面>，页内锚点 #<场景名>`,
      `- 外壳能力：明暗切换、预览宽度（自适应 / 手机 390 / 平板 820 / 桌面 1280）、源码卡片内搜索、页内索引`,
      `- 契约：组件 ${env.components.count} 个${env.components.configured ? '' : '（未配置 components）'}、模块 ${
        env.modules.count
      } 个${env.modules.configured ? '' : '（未配置 modules）'}、插件 ${env.plugins.length} 个`,
      `- 主题：外壳 ${env.theme.ui}、演示画布 ${env.theme.stage}；颜色只用 var(--rp-color-*)`,
      '',
      '## 分组',
      '',
    ]
    if (!env.groups.length) lines.push('（没有分组：playground.config.ts 里配置 groups）')
    for (const group of env.groups) lines.push(`- ${group.dir} = ${group.label}`)

    lines.push('', '## globals（场景里 usePlaygroundEnv() 读取）', '')
    lines.push(
      Object.keys(env.globals).length ? '```json\n' + JSON.stringify(env.globals, null, 2) + '\n```' : '（没有配置 globals）'
    )

    lines.push('', '## 插件', '')
    if (!env.plugins.length) {
      lines.push('（没有配置插件；场景里不能假设存在登录态 / 环境变量）')
    } else {
      for (const plugin of env.plugins) lines.push(`- ${plugin}`)
      lines.push('', '场景里这样取：')
      lines.push('```ts')
      lines.push("const env = usePlaygroundEnv<{ apiBase: string }>()  // globals + 插件返回值合并")
      lines.push("const auth = usePlaygroundPlugin<{ user: { name: string } }>('auth')  // name 是插件注册的名字")
      lines.push('```')
    }

    lines.push('', `## 页面（${env.pages.length}）`, '', '| 页面 | id | 绑定 | 场景 |', '|---|---|---|---|')
    for (const page of env.pages) {
      const binding = page.component ? `组件 ${page.component}` : page.module ? `模块 ${page.module}` : '内容页'
      lines.push(`| ${page.title} | ${page.id} | ${binding} | ${page.scenes.length} 个 |`)
    }
    return lines.join('\n')
  }

  server.registerTool(
    'env_get',
    {
      title: '演示环境',
      description: '返回 globals / 插件 / 分组 / 页面清单与外壳能力，写场景前先读它',
      inputSchema: {},
    },
    () => {
      refresh()
      return { content: [{ type: 'text', text: formatEnv(manifest) }] }
    }
  )

  server.registerTool(
    'scene_scaffold',
    {
      title: '生成场景骨架',
      description: '按环境规则算出该建的文件路径与内容（不落盘，写入交给客户端的文件工具）',
      inputSchema: {
        title: z.string().min(1).describe('场景标题，如「基础用法」'),
        page: z.string().optional().describe('已有页面 id（如 button/button）；新建页时传页目录名'),
        group: z.string().optional().describe('分组目录名，如 button；page 已存在时可省略'),
        component: z.string().optional().describe('这一页演示的组件名，如 MyButton'),
        lang: z.enum(['vue', 'md']).optional().describe('场景类型，默认 vue'),
        section: z.enum(['overview', 'props', 'events', 'exposes', 'slots']).optional(),
        api: z.array(z.string()).optional().describe('这个场景演示的 API 名'),
        slug: z.string().optional().describe('场景文件名（不含扩展名）；中文标题请显式传，默认取标题的英文缩写'),
      },
    },
    ({ title, page, group, component, lang, section, api, slug }) => {
      refresh()
      const env = manifest.env
      if (!env) {
        return {
          content: [
            {
              type: 'text',
              text: '这份清单里没有 env 段，无法推算目录。先跑一次 pnpm dev 重新生成清单。',
            },
          ],
          isError: true,
        }
      }

      const matchesPage = page
        ? env.pages.filter(
            (item) =>
              item.id === page ||
              (group ? item.id === `${group}/${page}` : false) ||
              item.dir.split('/').pop() === page ||
              item.title === page
          )
        : []
      if (matchesPage.length > 1) {
        return {
          content: [
            {
              type: 'text',
              text: `"${page}" 命中多个页面：${matchesPage.map((item) => item.id).join(', ')}。请传完整 id。`,
            },
          ],
          isError: true,
        }
      }
      const target = matchesPage[0]
      const groupDir = target?.groupDir ?? group
      if (!groupDir) {
        return {
          content: [
            {
              type: 'text',
              text: `需要知道放在哪个分组。已有分组：${env.groups.map((item) => item.dir).join(', ') || '（无）'}\n` +
                `已有页面：${env.pages.map((item) => item.id).join(', ') || '（无）'}`,
            },
          ],
          isError: true,
        }
      }
      if (!env.groups.some((item) => item.dir === groupDir)) {
        return {
          content: [
            {
              type: 'text',
              text: `分组 "${groupDir}" 不在 playground.config.ts 的 groups 里（现有：${env.groups
                .map((item) => item.dir)
                .join(', ')}）。要么先登记分组，要么换一个。`,
            },
          ],
          isError: true,
        }
      }

      const pageDir = target ? (target.dir.split('/').pop() ?? target.id) : kebab(page ?? component ?? groupDir) || groupDir
      const chosenSlug = slug ?? kebab(title) ?? ''
      if (!chosenSlug) {
        return {
          content: [
            {
              type: 'text',
              text: `标题「${title}」不是英文，算不出文件名。请再传一个 slug（如 basic / size）。`,
            },
          ],
          isError: true,
        }
      }

      const componentName = component ?? target?.component
      const componentRel = componentName
        ? manifest.components.find((item) => item.name === componentName)?.rel
        : undefined
      if (componentName && !componentRel) {
        return {
          content: [
            {
              type: 'text',
              text: `组件 "${componentName}" 不在组件契约里（可用：${manifest.components.map((item) => item.name).join(', ') || '无'}）。`,
            },
          ],
          isError: true,
        }
      }

      const scaffold = scaffoldScene({
        sceneRoot: env.sceneRoot,
        groupDir,
        pageDir,
        slug: chosenSlug,
        title,
        lang: lang ?? 'vue',
        component: componentName,
        componentRel,
        section,
        api,
      })

      const lines = [`# 要写入的文件`, '']
      lines.push('## ' + scaffold.sceneFile, '', '```' + (lang ?? 'vue'), scaffold.sceneContent.trimEnd(), '```', '')
      if (fs.existsSync(path.join(project, scaffold.pageMetaFile))) {
        lines.push(`页面目录已存在（${scaffold.pageMetaFile}），只写场景文件即可。`, '')
      } else {
        lines.push('## ' + scaffold.pageMetaFile + '（新页面，需要建）', '', '```ts', scaffold.pageMetaContent.trimEnd(), '```', '')
      }
      lines.push(`写完之后调 scene_validate（path=${scaffold.sceneFile}）校验；dev server 会自己热更新。`)

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }
  )

  server.registerTool(
    'scene_validate',
    {
      title: '校验场景',
      description: '按框架的硬约束检查场景文件：目录层级、样式 scoped、禁用全局选择器、sceneMeta 字段、页绑定',
      inputSchema: {
        path: z.string().optional().describe('只校验这个文件（相对项目根）；不传则全量校验'),
      },
    },
    ({ path: target }) => {
      refresh()
      if (!manifest.env) {
        return {
          content: [{ type: 'text', text: '这份清单里没有 env 段，无法校验。先跑一次 pnpm dev 重新生成清单。' }],
          isError: true,
        }
      }
      const issues = validateScenes(project, manifest, target)
      const errors = issues.filter((item) => item.level === 'error')
      const warns = issues.filter((item) => item.level === 'warn')
      const scope = target ? `文件 ${target}` : `${manifest.scenes.length} 个场景`
      if (!issues.length) {
        return { content: [{ type: 'text', text: `校验通过（${scope}）。` }] }
      }
      const lines = [`${scope}：${errors.length} 个错误 / ${warns.length} 个提醒`, '']
      for (const issue of [...errors, ...warns]) {
        lines.push(`- [${issue.level === 'error' ? '错误' : '提醒'}] ${issue.file}${issue.line ? `:${issue.line}` : ''} · ${issue.rule}`)
        lines.push(`  ${issue.message}`)
      }
      return { content: [{ type: 'text', text: lines.join('\n') }], isError: errors.length > 0 }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[rinova-playground-mcp] 已启动，清单：${manifestPath}（${manifest.components.length} 个组件）`)
}

await main()
