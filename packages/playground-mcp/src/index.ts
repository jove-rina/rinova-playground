#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

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

interface Manifest {
  generatedAt: string
  components: ManifestComponent[]
  scenes: ManifestScene[]
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

  const server = new McpServer({ name: 'rinova-playground', version: '0.1.0' })

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

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[rinova-playground-mcp] 已启动，清单：${manifestPath}（${manifest.components.length} 个组件）`)
}

await main()
