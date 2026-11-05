import fs from 'node:fs'
import path from 'node:path'

/**
 * 场景校验：把插件的构建期约束抽成可复跑的一套规则，供 MCP 的 `scene_validate` 调用。
 *
 * 刻意不依赖任何包（只用 fs / path）：脚本、MCP、verify 都能直接 import 同一份实现。
 */

export interface SceneIssue {
  level: 'error' | 'warn'
  /** 规则名，报告里直接显示 */
  rule: string
  /** 相对项目根的路径 */
  file: string
  line?: number
  message: string
}

export interface ValidatePage {
  id: string
  group: string
  groupDir: string
  dir: string
  component?: string
  module?: string
  showSource?: boolean
  doc?: boolean
}

export interface ValidateManifest {
  env?: {
    sceneRoot?: string
    pages?: ValidatePage[]
  }
  components: Array<{ name: string }>
  modules: Array<{ name: string }>
  scenes: Array<{ id: string; rel: string; lang?: 'vue' | 'md' }>
}

/** sceneMeta 允许的字段（拼错的字段构建期会被静默忽略，所以这里显式列出来） */
const SCENE_META_FIELDS = new Set([
  'title',
  'order',
  'tags',
  'description',
  'hideInNav',
  'files',
  'section',
  'api',
  'showSource',
])

const toPosix = (value: string): string => value.split(path.sep).join('/')

const lineOf = (source: string, index: number): number => source.slice(0, index).split('\n').length

/** 极简 frontmatter 读取：只认 `---` 头里的 `key: value` */
const readFrontmatter = (source: string): Record<string, string> => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const data: Record<string, string> = {}
  for (const raw of (match[1] ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf(':')
    if (index < 1) continue
    data[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }
  return data
}

/** 取出 `<script>`（不含 setup）块里的 sceneMeta 对象原文 */
const readSceneMetaBlock = (source: string): string | null => {
  const scripts = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  for (const script of scripts) {
    if (/\bsetup\b/.test(script[1] ?? '')) continue
    const body = script[2] ?? ''
    if (body.includes('sceneMeta')) return body
  }
  return null
}

const checkVueScene = (rel: string, source: string): SceneIssue[] => {
  const issues: SceneIssue[] = []

  for (const style of source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    const attrs = style[1] ?? ''
    const body = style[2] ?? ''
    const start = style.index ?? 0
    if (!/\bscoped\b/.test(attrs)) {
      issues.push({
        level: 'error',
        rule: 'style-scoped',
        file: rel,
        line: lineOf(source, start),
        message: '<style> 缺少 scoped，样式会污染其它场景',
      })
    }
    for (const hit of body.matchAll(/(?:^|[},])\s*(:root|html|body)\b/gm)) {
      issues.push({
        level: 'error',
        rule: 'style-global',
        file: rel,
        line: lineOf(source, start + (hit.index ?? 0)),
        message: `样式命中 \`${hit[2]}\`，会影响整个 playground`,
      })
    }
  }
  if (!/<style/.test(source)) {
    // 不需要样式是合法写法，这里不报
  }

  if (/\buseScenePayload\b/.test(source)) {
    issues.push({
      level: 'error',
      rule: 'deprecated-api',
      file: rel,
      line: lineOf(source, source.search(/\buseScenePayload\b/)),
      message: 'useScenePayload 已删除，改用 useSceneArgs / useSceneOutput',
    })
  }

  const meta = readSceneMetaBlock(source)
  if (meta) {
    for (const field of meta.matchAll(/(?:^|[{,;\n])\s*([A-Za-z_$][\w$]*)\s*:/gm)) {
      const name = field[1] ?? ''
      if (SCENE_META_FIELDS.has(name)) continue
      issues.push({
        level: 'warn',
        rule: 'scene-meta-field',
        file: rel,
        line: lineOf(source, (source.indexOf(meta) + (field.index ?? 0))),
        message: `sceneMeta 里没有 \`${name}\` 这个字段（会被静默忽略）`,
      })
    }
    if (/\bpayload\s*:/.test(meta)) {
      issues.push({
        level: 'error',
        rule: 'deprecated-api',
        file: rel,
        line: lineOf(source, source.indexOf(meta)),
        message: 'sceneMeta.payload 不生效，改用 useSceneArgs / useSceneOutput',
      })
    }
  } else if (source.includes('sceneMeta')) {
    issues.push({
      level: 'warn',
      rule: 'scene-meta-block',
      file: rel,
      message: 'sceneMeta 必须写在普通 <script> 块里（<script setup> 里的构建期读不到）',
    })
  }

  return issues
}

const checkMarkdownScene = (rel: string, source: string): SceneIssue[] => {
  const issues: SceneIssue[] = []
  const data = readFrontmatter(source)
  if (!data.title) {
    issues.push({ level: 'warn', rule: 'md-title', file: rel, line: 1, message: 'Markdown 场景缺少 frontmatter `title`' })
  }
  if (data.showSource && data.showSource !== 'false') {
    issues.push({
      level: 'warn',
      rule: 'md-source',
      file: rel,
      line: 1,
      message: 'Markdown 场景默认不展示源码，这里的 showSource 通常不需要',
    })
  }
  return issues
}

/**
 * 校验场景与页面绑定。
 *
 * `only` 传一个相对路径时只校验该文件（用于「写完立刻验」），否则全量。
 */
export const validateScenes = (root: string, manifest: ValidateManifest, only?: string): SceneIssue[] => {
  const issues: SceneIssue[] = []
  const sceneRoot = toPosix(manifest.env?.sceneRoot ?? 'src/scenes').replace(/\/$/, '')
  const pages = manifest.env?.pages ?? []
  const componentNames = new Set(manifest.components.map((item) => item.name))
  const moduleNames = new Set(manifest.modules.map((item) => item.name))
  const target = only ? toPosix(only).replace(/^\.\//, '') : ''

  // 页绑定：组件 / 模块必须真的在契约里（只校验单个文件时跳过，避免报告与这次改动无关的页面）
  for (const page of target ? [] : pages) {
    const metaFile = `${page.dir}/meta.ts`
    if (page.component && !componentNames.has(page.component)) {
      issues.push({
        level: 'error',
        rule: 'page-component',
        file: metaFile,
        message: `pageMeta.component = "${page.component}" 不在组件契约里（可用：${[...componentNames].join(', ') || '无'}）`,
      })
    }
    if (page.module && !moduleNames.has(page.module)) {
      issues.push({
        level: 'error',
        rule: 'page-module',
        file: metaFile,
        message: `pageMeta.module = "${page.module}" 不在模块契约里（可用：${[...moduleNames].join(', ') || '无'}）`,
      })
    }
    if (!page.component && !page.module && page.showSource !== false && !page.doc) {
      issues.push({
        level: 'warn',
        rule: 'page-content-source',
        file: metaFile,
        message: '内容页（没有 component / module）应写 showSource: false，否则源码卡片会挂在文档页上',
      })
    }
  }

  const pageDirs = new Set(pages.map((page) => toPosix(page.dir)))

  const entries = [...manifest.scenes]
  // 刚写出来的场景还没被扫进清单：指定 path 时也校验（读磁盘，不依赖清单）
  if (target && !entries.some((scene) => toPosix(scene.rel ?? '') === target)) {
    entries.push({ id: target, rel: target, lang: target.endsWith('.md') ? 'md' : 'vue' })
  }

  for (const scene of entries) {
    const rel = toPosix(scene.rel ?? '')
    if (!rel) continue
    if (target && rel !== target) continue

    const segments = rel.split('/')
    const depth = segments.length - sceneRoot.split('/').length
    if (!rel.startsWith(`${sceneRoot}/`)) {
      issues.push({
        level: 'error',
        rule: 'scene-dir',
        file: rel,
        message: `场景必须放在 \`${sceneRoot}/\` 下面`,
      })
      continue
    }
    if (depth < 3 || depth > 4) {
      issues.push({
        level: 'error',
        rule: 'scene-dir',
        file: rel,
        line: 1,
        message: `目录层级是 ${depth} 层，必须是 <分组>/<页面>/<场景>（3 层）或 <分组>/<页面>/<子页>/<场景>（4 层）`,
      })
    }

    const pageDir = segments.slice(0, -1).join('/')
    if (pages.length && !pageDirs.has(pageDir)) {
      issues.push({
        level: 'error',
        rule: 'scene-page',
        file: rel,
        message: `所在目录 \`${pageDir}\` 不是任何已登记的页面（缺 meta.ts？）`,
      })
    }

    let source = ''
    try {
      source = fs.readFileSync(path.join(root, rel), 'utf8')
    } catch {
      issues.push({ level: 'error', rule: 'scene-missing', file: rel, message: '读不到文件' })
      continue
    }

    if ((scene.lang ?? (rel.endsWith('.md') ? 'md' : 'vue')) === 'md') {
      issues.push(...checkMarkdownScene(rel, source))
    } else {
      issues.push(...checkVueScene(rel, source))
    }
  }

  return issues.sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.level.localeCompare(b.level)
  )
}

/** 场景骨架：`scene_scaffold` 用它生成文件内容（不落盘，写入交给客户端） */
export interface ScaffoldInput {
  sceneRoot: string
  groupDir: string
  pageDir: string
  /** 场景文件名（不含扩展名） */
  slug: string
  title: string
  lang: 'vue' | 'md'
  component?: string
  /** 组件源码相对项目根的路径（来自清单），用来算相对 import */
  componentRel?: string
  section?: string
  api?: string[]
}

/** 相对 import：从场景目录指向组件文件 */
const relativeImport = (fromDir: string, targetRel: string): string => {
  const rel = path.posix.relative(fromDir, targetRel)
  return rel.startsWith('.') ? rel : `./${rel}`
}

export const scaffoldScene = (
  input: ScaffoldInput
): { sceneFile: string; sceneContent: string; pageMetaFile: string; pageMetaContent: string } => {
  const dir = `${input.sceneRoot}/${input.groupDir}/${input.pageDir}`
  const component = input.component || 'MyComponent'
  const importPath = input.componentRel ? relativeImport(dir, input.componentRel) : `@/lib/${component}.vue`
  const importHint = input.componentRel ? '' : `  // 换成真实路径：清单里没有 ${component}`
  const section = input.section || 'overview'
  const metaLines = [
    'export const sceneMeta = {',
    `  title: '${input.title}',`,
    `  section: '${section}',`,
    ...(input.api?.length ? [`  api: [${input.api.map((name) => `'${name}'`).join(', ')}],`] : []),
    '}',
  ]

  const sceneContent =
    input.lang === 'md'
      ? ['---', `title: ${input.title}`, '---', '', '正文……', ''].join('\n')
      : [
          '<script setup lang="ts">',
          "import { useSceneArgs } from '@rinova/playground'",
          `import ${component} from '${importPath}'`,
          ...(importHint ? [importHint] : []),
          '',
          'const args = useSceneArgs({})',
          '</script>',
          '',
          '<script lang="ts">',
          ...metaLines,
          '</script>',
          '',
          '<template>',
          '  <div class="demo">',
          `    <${component} v-bind="args" />`,
          '  </div>',
          '</template>',
          '',
          '<style scoped lang="less">',
          '.demo {',
          '  display: flex;',
          '  gap: 8px;',
          '}',
          '</style>',
          '',
        ].join('\n')

  const pageMetaContent = [
    "import { definePageMeta } from '@rinova/playground'",
    '',
    'export const pageMeta = definePageMeta({',
    `  title: '${input.pageDir}',`,
    ...(input.component ? [`  component: '${input.component}',`] : []),
    '})',
    '',
  ].join('\n')

  return {
    sceneFile: `${dir}/${input.slug}.${input.lang}`,
    sceneContent,
    pageMetaFile: `${dir}/meta.ts`,
    pageMetaContent,
  }
}
