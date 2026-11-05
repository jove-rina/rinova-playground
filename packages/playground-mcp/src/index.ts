#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { scaffoldScene, validateScenes } from './validate.js'
import type { ValidateManifest } from './validate.js'

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
}

interface ManifestComponent {
  name: string
  rel: string
  props: ManifestProp[]
  events: { name: string; type: string; signature: string; description: string; fields?: ManifestField[] }[]
  slots: { name: string; type: string; description: string }[]
  exposed: { name: string; type: string; description: string }[]
  types?: { name: string; kind: string; file: string; code: string }[]
  scenes: string[]
  uncoveredProps: string[]
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

const parseArgs = (argv: string[]): { project: string; manifest: string } => {
  const args = argv.slice(2)
  const projectIndex = args.indexOf('--project')
  const manifestIndex = args.indexOf('--manifest')
  const project = path.resolve(projectIndex > -1 ? (args[projectIndex + 1] ?? '.') : '.')
  const manifest =
    manifestIndex > -1
      ? path.resolve(args[manifestIndex + 1] ?? '')
      : path.join(project, '.playground/manifest.json')
  return { project, manifest }
}

const loadManifest = (file: string): Manifest => {
  if (!fs.existsSync(file)) {
    throw new Error(
      `找不到契约清单：${file}\n先运行 pnpm dev 或 pnpm build 生成（需要 playground.config.ts 里配置 components）`
    )
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest
}

const formatComponent = (root: string, component: ManifestComponent, manifest: Manifest): string => {
  const lines: string[] = [
    `# ${component.name}`,
    `源码：${locate(root, component.rel, component.name)}`,
    '',
    '## Props',
  ]

  if (!component.props.length) lines.push('- （无对外 props）')
  for (const prop of component.props) {
    const flags = [prop.required ? 'required' : '', prop.default ? `default=${prop.default}` : '']
      .filter(Boolean)
      .join(', ')
    lines.push(
      `- ${prop.name}: ${prop.type}${flags ? ` (${flags})` : ''}  ← ${locate(root, component.rel, prop.name)}`
    )
    if (prop.description) lines.push(`  ${prop.description}`)
    for (const field of prop.fields ?? []) {
      lines.push(
        `  · ${field.name}: ${field.type}${field.required ? ' (必填)' : ''}${field.description ? ` — ${field.description}` : ''}`
      )
    }
  }

  if (component.events.length) {
    lines.push('', '## Events')
    for (const event of component.events) {
      lines.push(`- ${event.name} ${event.type}${event.description ? ` — ${event.description}` : ''}`)
      if (event.signature) lines.push(`  ${event.signature}`)
      for (const field of event.fields ?? []) {
        lines.push(`  · ${field.name}: ${field.type}${field.description ? ` — ${field.description}` : ''}`)
      }
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
    for (const item of component.types) {
      lines.push(`- ${item.name}（${item.kind}，${item.file}）`, '```ts', item.code, '```')
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
  const { project, manifest: manifestPath } = parseArgs(process.argv)

  let manifest: Manifest
  try {
    manifest = loadManifest(manifestPath)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }

  const server = new McpServer({ name: 'rinova-playground', version: '0.7.0' })

  server.registerTool(
    'capability_search',
    {
      title: '搜索组件能力',
      description: '按组件名 / prop 名 / 场景 id 搜索，返回带文件行号的摘要',
      inputSchema: { query: z.string().min(1).describe('关键词'), limit: z.number().int().min(1).max(20).optional() },
    },
    ({ query, limit }) => {
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
    'scenario_list',
    {
      title: '列出场景',
      description: '列出全部场景；传 component 则只列该组件相关的场景',
      inputSchema: { component: z.string().optional().describe('组件名，可选') },
    },
    ({ component }) => {
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
      description: '列出没有场景覆盖的 props，作为补场景的待办',
      inputSchema: {},
    },
    () => {
      const rows = manifest.components.flatMap((component) =>
        component.uncoveredProps.map((prop) => `- ${component.name}.${prop}  ← ${locate(project, component.rel, prop)}`)
      )
      const total = manifest.components.reduce((sum, component) => sum + component.props.length, 0)
      const uncovered = rows.length
      const head = `覆盖 ${total - uncovered}/${total}｜清单生成时间 ${manifest.generatedAt}`
      return { content: [{ type: 'text', text: rows.length ? `${head}\n\n${rows.join('\n')}` : `${head}\n\n全部 props 都有场景覆盖。` }] }
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
    () => ({ content: [{ type: 'text', text: formatEnv(manifest) }] })
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
