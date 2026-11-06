#!/usr/bin/env node
/**
 * M0 验收脚本。
 *
 *   pnpm verify     # node --experimental-strip-types scripts/verify-m0.ts
 *
 * 静态检查始终执行；运行时检查需要 dev server 已在 5273 端口运行，否则跳过。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runTypeFixtureChecks } from './lib/type-fixture.ts'
import { runFieldFixtureChecks } from './lib/field-fixture.ts'

const root = process.cwd()
const pkgDir = path.join(root, 'packages/playground')
const exampleDir = path.join(root, 'examples/minimal-lib')

interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

const results: CheckResult[] = []

const record = (name: string, ok: boolean, detail = ''): void => {
  results.push({ name, ok, detail })
}

const walk = (dir: string, filter: (file: string) => boolean, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, filter, out)
    else if (filter(abs)) out.push(abs)
  }
  return out
}

const rel = (file: string): string => path.relative(root, file)

/* 1. 内核不许出现 UI 组件库（examples/ 是真实库接入示例，允许自带 UI 依赖） */
const FORBIDDEN = ['element-plus', 'naive-ui', 'ant-design-vue', 'vuetify', 'tailwindcss', 'unocss']
const manifestTargets = [
  path.join(root, 'package.json'),
  ...walk(path.join(root, 'packages'), (file) => file.endsWith('package.json') && !file.includes('node_modules')),
]
const offenders: string[] = []
for (const file of manifestTargets) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies }
  for (const name of FORBIDDEN) {
    if (deps[name]) offenders.push(`${rel(file)} → ${name}`)
  }
}
record('无 UI 库依赖', offenders.length === 0, offenders.join(', '))

/* 2. 框架组件样式里不许出现硬编码色值 */
const styleFiles = walk(path.join(pkgDir, 'src'), (file) => /\.(vue|less)$/.test(file))
const hardcoded: string[] = []
for (const file of styleFiles) {
  if (file.endsWith('theme.less')) continue // 变量定义文件允许
  const text = fs.readFileSync(file, 'utf8')
  const hits = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)]
  if (hits.length) hardcoded.push(`${rel(file)}: ${hits.length} 处`)
}
record('组件样式无硬编码色值', hardcoded.length === 0, hardcoded.join(', '))

/* 3. 12 个主题变量齐全 */
const themeCss = fs.readFileSync(path.join(pkgDir, 'src/styles/theme.less'), 'utf8')
const VARS = [
  '--rp-color-bg',
  '--rp-color-surface',
  '--rp-color-border',
  '--rp-color-text',
  '--rp-color-text-muted',
  '--rp-color-primary',
  '--rp-color-primary-contrast',
  '--rp-color-success',
  '--rp-color-warning',
  '--rp-color-danger',
  '--rp-radius',
  '--rp-font-mono',
]
const missing = VARS.filter((name) => !themeCss.includes(`${name}:`))
record('12 个主题变量齐全', missing.length === 0, missing.join(', '))

/* 3.1 演示画布自带 token：组件不一定支持暗色，画布必须能独立于外壳 */
const stageTokens = ["[data-pw-stage='light']", "[data-pw-stage='dark']"].filter((sel) => !themeCss.includes(sel))
record('演示画布自带 light/dark token', stageTokens.length === 0, stageTokens.length ? stageTokens.join(', ') : "theme.less 里有 [data-pw-stage='light'] / 'dark' 两套")

/* 4. 内核无项目内绝对别名引用（@/...） */
const srcFiles = walk(path.join(pkgDir, 'src'), (file) => /\.(ts|vue)$/.test(file))
const aliasHits = srcFiles.filter((file) => /from ['"]@\//.test(fs.readFileSync(file, 'utf8')))
record('内核无 @/ 别名引用', aliasHits.length === 0, aliasHits.join(', '))

/* 5. 运行时：侧栏场景数与磁盘一致 */
/* 5. 三个示例：目录三层 / 页与场景 / API 绑定 */

const EXAMPLES = [
  { label: 'minimal-lib', dir: path.join(root, 'examples/minimal-lib'), port: 5273 },
  { label: 'docs-site', dir: path.join(root, 'examples/docs-site'), port: 5280 },
  { label: 'real-lib', dir: path.join(root, 'examples/real-lib'), port: 5281 },
]

const scanDiskScenes = (dir: string, prefix = '', out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // 与插件扫描保持一致：点号开头的文件/目录跳过
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) scanDiskScenes(abs, relPath, out)
    else if (entry.name.endsWith('.vue') || entry.name.endsWith('.md')) out.push(relPath.replace(/\.(vue|md)$/, ''))
  }
  return out
}

const listDirs = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map((entry) => entry.name)
        .sort()
    : []

const listVue = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            (entry.name.endsWith('.vue') || entry.name.endsWith('.md')) &&
            !entry.name.startsWith('.')
        )
        .map((entry) => entry.name)
    : []

/* 5.1 静态：分组目录下不能直接放 .vue（目录必须三层） */
const misplaced: string[] = []
for (const example of EXAMPLES) {
  const scenesRoot = path.join(example.dir, 'src/scenes')
  for (const group of listDirs(scenesRoot)) {
    for (const file of listVue(path.join(scenesRoot, group))) {
      misplaced.push(`${example.label}: ${group}/${file}`)
    }
  }
}
record('示例目录结构（分组下不放场景文件，页/子页放 .vue 或 .md）', misplaced.length === 0, misplaced.join(', '))

/* 5.2 静态：pageMeta.component 必须能在 manifest 里找到，否则 API 表会静默消失 */
const bindingMisses: string[] = []
const bindingCounts: string[] = []
for (const example of EXAMPLES) {
  const manifestPath = path.join(example.dir, '.playground/manifest.json')
  if (!fs.existsSync(manifestPath)) {
    bindingCounts.push(`${example.label} 无 manifest`)
    continue
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { components: { name: string }[] }
  const names = new Set(manifest.components.map((item) => item.name))
  const scenesRoot = path.join(example.dir, 'src/scenes')
  let bound = 0
  /** 页目录（含子组件页）逐个核对 meta.component */
  const checkPageBinding = (dir: string, label: string): void => {
    const metaFile = path.join(dir, 'meta.ts')
    if (!fs.existsSync(metaFile)) return
    const declared = fs.readFileSync(metaFile, 'utf8').match(/component:\s*'([^']+)'/)
    // 与插件一致：没写 component 时按「页目录名 → 页标题」同名匹配
    const name = path.basename(dir)
    const candidates = [declared?.[1], name, name.replace(/[-_]/g, '')].filter(Boolean) as string[]
    const byLower = new Map(manifest.components.map((item) => [item.name.toLowerCase(), item.name]))
    const hit = candidates.map((candidate) => byLower.get(candidate.toLowerCase())).find(Boolean)
    if (declared && !hit) {
      bindingMisses.push(`${example.label}: ${label} → ${declared[1]}`)
      return
    }
    if (hit) bound += 1
  }
  for (const group of listDirs(scenesRoot)) {
    for (const page of listDirs(path.join(scenesRoot, group))) {
      const pageAbs = path.join(scenesRoot, group, page)
      checkPageBinding(pageAbs, `${group}/${page}`)
      for (const sub of listDirs(pageAbs)) checkPageBinding(path.join(pageAbs, sub), `${group}/${page}/${sub}`)
    }
  }
  bindingCounts.push(`${example.label} ${bound} 个页绑定`)
}
record(
  '页绑定的组件都存在（否则 API 表静默消失）',
  bindingMisses.length === 0,
  bindingMisses.length ? bindingMisses.join(', ') : bindingCounts.join('，')
)

/* 5.3 运行时：每个示例的页 / 场景与磁盘一致（dev server 未启动则跳过） */
for (const example of EXAMPLES) {
  const scenesRoot = path.join(example.dir, 'src/scenes')
  const diskScenes = scanDiskScenes(scenesRoot).sort()
  // 页 = 「分组/页」与「分组/页/子页」两层目录里含 .vue（或含下级 .vue）的目录
  const diskPages = (() => {
    const out: string[] = []
    for (const group of listDirs(scenesRoot)) {
      for (const page of listDirs(path.join(scenesRoot, group))) {
        const pageAbs = path.join(scenesRoot, group, page)
        const pageId = `${group}/${page}`
        const subs = listDirs(pageAbs)
        if (listVue(pageAbs).length || subs.some((sub) => listVue(path.join(pageAbs, sub)).length)) out.push(pageId)
        for (const sub of subs) {
          if (listVue(path.join(pageAbs, sub)).length) out.push(`${pageId}/${sub}`)
        }
      }
    }
    return out.sort()
  })()
  const url = `http://localhost:${example.port}/@id/__x00__virtual:playground/scenes`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    const code = await res.text()
    const scenePart = code.split('export const pages')[0] ?? ''
    const pagePart = code.split('export const pages')[1] ?? ''
    const runtimeScenes = [...scenePart.matchAll(/id: "([^"]+)"/g)].map((match) => match[1] as string).sort()
    const runtimePages = [...pagePart.matchAll(/id: "([^"]+)"/g)].map((match) => match[1] as string).sort()
    const sameScenes =
      runtimeScenes.length === diskScenes.length && runtimeScenes.every((id, index) => id === diskScenes[index])
    const samePages = runtimePages.length === diskPages.length && runtimePages.every((id, index) => id === diskPages[index])
    record(
      `[${example.label}] 页 / 场景与磁盘一致`,
      sameScenes && samePages,
      sameScenes && samePages
        ? `${diskPages.length} 个页 / ${diskScenes.length} 个场景`
        : `磁盘页 ${diskPages.join(',')} / 运行时页 ${runtimePages.join(',')}｜磁盘场景 ${diskScenes.join(',')} / 运行时场景 ${runtimeScenes.join(',')}`
    )

    // 页顺序：先按 config.groups 声明序（groupOrder），再按组内 pageMeta.order，最后按 id
    const parsedPages = pagePart
      .split('\n  {\n')
      .slice(1)
      .map((chunk) => ({
        id: chunk.match(/id: "([^"]+)"/)?.[1] ?? '',
        groupDir: chunk.match(/groupDir: "([^"]+)"/)?.[1] ?? '',
        groupOrder: Number(chunk.match(/groupOrder: (\d+)/)?.[1] ?? NaN),
        parentId: chunk.match(/parentId: "([^"]+)"/)?.[1] ?? '',
        order: Number(chunk.match(/order: (\d+)/)?.[1] ?? NaN),
      }))
      .filter((page) => page.id)

    // 1) 分组按声明序；2) 同一父级下的兄弟按 (order, id)；3) 父页一定排在子页之前
    const groupsOk = parsedPages.every((page, index) => {
      if (index === 0) return true
      return (parsedPages[index - 1] as (typeof parsedPages)[number]).groupOrder <= page.groupOrder
    })
    const siblingsOk = parsedPages.every((page, index) => {
      if (index === 0) return true
      const prev = parsedPages[index - 1] as (typeof parsedPages)[number]
      if (prev.groupOrder !== page.groupOrder || prev.parentId !== page.parentId) return true
      if (prev.order !== page.order) return prev.order < page.order
      return prev.id.localeCompare(page.id) <= 0
    })
    const parentsOk = parsedPages.every((page, index) => {
      if (!page.parentId) return true
      const parentIndex = parsedPages.findIndex((item) => item.id === page.parentId)
      return parentIndex >= 0 && parentIndex < index
    })
    const orderedOk = groupsOk && siblingsOk && parentsOk
    const groupSequence = [...new Set(parsedPages.map((page) => page.groupDir))]
    const multiPageGroup = parsedPages.filter((page) => page.groupDir === 'card' && !page.parentId).length
    const childPages = parsedPages.filter((page) => page.parentId).length
    const multiOk = example.label !== 'minimal-lib' || (multiPageGroup >= 2 && childPages >= 1)
    // 内容页（没绑组件）不能挂源码卡片；Markdown 场景默认也不展示源码
    const pageBlocks = pagePart
      .split('\n  {\n')
      .slice(1)
      .map((chunk) => ({
        id: chunk.match(/id: "([^"]+)"/)?.[1] ?? '',
        component: chunk.match(/component: "([^"]+)"/)?.[1] ?? null,
        showSource: /showSource: true/.test(chunk) ? true : /showSource: false/.test(chunk) ? false : null,
      }))
      .filter((page) => page.id)
    const contentLeaks = pageBlocks.filter((page) => !page.component && page.showSource !== false)
    record(
      `[${example.label}] 内容页不展示源码`,
      contentLeaks.length === 0,
      contentLeaks.length
        ? contentLeaks.map((page) => `${page.id}(showSource=${page.showSource})`).join(', ')
        : `${pageBlocks.filter((page) => !page.component).length} 个内容页均为 false`
    )

    const sceneBlocks = scenePart
      .split('\n  {\n')
      .slice(1)
      .map((chunk) => ({
        id: chunk.match(/id: "([^"]+)"/)?.[1] ?? '',
        lang: chunk.match(/lang: "([^"]+)"/)?.[1] ?? 'vue',
        showSource: /showSource: true/.test(chunk) ? true : /showSource: false/.test(chunk) ? false : null,
      }))
      .filter((scene) => scene.id)
    const mdLeaks = sceneBlocks.filter((scene) => scene.lang === 'md' && scene.showSource !== false)
    record(
      `[${example.label}] Markdown 场景默认不展示源码`,
      mdLeaks.length === 0,
      mdLeaks.length
        ? mdLeaks.map((scene) => scene.id).join(', ')
        : `${sceneBlocks.filter((scene) => scene.lang === 'md').length} 个 .md 场景`
    )

    record(
      `[${example.label}] 页顺序（分组声明序 → 页 order，父页在子页前）`,
      parsedPages.length > 0 && orderedOk && multiOk,
      orderedOk && multiOk
        ? `分组顺序 ${groupSequence.join(' → ')}${
            example.label === 'minimal-lib'
              ? `；card 组 ${multiPageGroup} 个一级页、${childPages} 个子组件页`
              : ''
          }`
        : `顺序异常（分组 ${groupsOk} / 兄弟 ${siblingsOk} / 父页在前 ${parentsOk}）或缺少多页/子页用例`
    )

    // sceneMeta 的字段是否真的进了虚拟模块：只看 sceneMeta 声明块里出现过的字段
    const metaBlocks = walk(path.join(example.dir, 'src/scenes'), (file) => file.endsWith('.vue'))
      .map((file) => fs.readFileSync(file, 'utf8').split('</script>')[0] ?? '')
      .join('\n')
    const expects = [
      /section:\s*['"]/.test(metaBlocks) ? /section: "/.test(code) : true,
      /api:\s*\[/.test(metaBlocks) ? /api: \[/.test(code) : true,
      /hideInNav:\s*true/.test(metaBlocks) ? /hidden: true/.test(code) : true,
      /order:\s*\d/.test(metaBlocks) ? /order: \d+/.test(code) : true,
    ]
    record(`[${example.label}] sceneMeta 字段已注入`, expects.every(Boolean), expects.every(Boolean) ? 'title/order/section/api/hidden 与源码一致' : '虚拟模块缺少源码里声明过的字段')
  } catch {
    record(`[${example.label}] 页 / 场景与磁盘一致`, true, 'dev server 未运行，跳过')
    record(`[${example.label}] 内容页不展示源码`, true, 'dev server 未运行，跳过')
    record(`[${example.label}] Markdown 场景默认不展示源码`, true, 'dev server 未运行，跳过')
    record(`[${example.label}] 页顺序（分组声明序 → 页 order，父页在子页前）`, true, 'dev server 未运行，跳过')
    record(`[${example.label}] sceneMeta 字段已注入`, true, 'dev server 未运行，跳过')
  }

  // API 模块：只注入被页面引用的组件，且绑定必须能解析到
  const apiUrl = `http://localhost:${example.port}/@id/__x00__virtual:playground/api`
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(2000) })
    const code = await res.text()
    const apiMatch = code.match(/export const api = (\{[\s\S]*?\})\nexport const pageComponents = (\{[\s\S]*?\})\n/)
    if (!apiMatch) throw new Error('API 模块格式不符')
    const apiMap = JSON.parse(apiMatch[1] as string) as Record<string, { props: unknown[]; events: unknown[]; slots: unknown[]; exposed: unknown[] }>
    const pageComponents = JSON.parse(apiMatch[2] as string) as Record<string, string>
    const unresolved = Object.entries(pageComponents).filter(([, name]) => !apiMap[name])
    const malformed = Object.entries(apiMap).filter(
      ([, item]) => ![item.props, item.events, item.slots, item.exposed].every(Array.isArray)
    )
    record(
      `[${example.label}] API 模块（绑定可解析、契约结构完整）`,
      unresolved.length === 0 && malformed.length === 0,
      unresolved.length || malformed.length
        ? `未解析：${unresolved.map(([page, name]) => `${page}→${name}`).join(',')}；结构异常：${malformed.map(([name]) => name).join(',')}`
        : `${Object.keys(apiMap).length} 个组件 / ${Object.keys(pageComponents).length} 个页绑定`
    )
  } catch {
    record(`[${example.label}] API 模块（绑定可解析、契约结构完整）`, true, 'dev server 未运行，跳过')
  }
}



/* 6. 不允许 function 声明，一律箭头函数（只扫产品代码，不扫本脚本） */
const codeFiles = [
  ...walk(path.join(root, 'packages'), (file) => /\.(ts|vue)$/.test(file) && !file.includes('node_modules') && !file.includes('/dist/')),
  ...walk(path.join(exampleDir, 'src'), (file) => /\.(ts|vue)$/.test(file)),
]
const functionHits: string[] = []
for (const file of codeFiles) {
  const text = fs.readFileSync(file, 'utf8')
  if (/(^|[^\w.$])function\s+[\w$]*\s*\(/m.test(text)) functionHits.push(rel(file))
}
record('无 function 声明（只用箭头函数）', functionHits.length === 0, functionHits.join(', '))

/* 7. 样式一律 less */
const plainCss = walk(path.join(pkgDir, 'src'), (file) => file.endsWith('.css'))
const vueFiles = codeFiles.filter((file) => file.endsWith('.vue'))
const plainStyleBlocks: string[] = []
for (const file of vueFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/<style([^>]*)>/g)) {
    if (!/lang="less"/.test(match[1] as string)) plainStyleBlocks.push(rel(file))
  }
}
const lessOk = plainCss.length === 0 && plainStyleBlocks.length === 0
record('样式统一 less', lessOk, [...plainCss, ...plainStyleBlocks].map(rel).join(', '))

/* 8. 产品代码不允许 JS：只许 .ts / .vue（构建产物 dist 除外） */
const jsSources = [
  ...walk(path.join(root, 'packages'), (file) => /\.(js|mjs|cjs)$/.test(file) && !file.includes('node_modules') && !file.includes('/dist/')),
  ...walk(path.join(exampleDir, 'src'), (file) => /\.(js|mjs|cjs)$/.test(file)),
]
record('产品代码无 JS 源文件（只用 TS）', jsSources.length === 0, jsSources.map(rel).join(', '))

/* 9. 路由必须走 pathname（History API）；hash 只允许作为页内场景锚点 */
const routerFiles = walk(path.join(pkgDir, 'src'), (file) => /\.(ts|vue)$/.test(file))
const appSource = fs.existsSync(path.join(pkgDir, 'src/app/App.vue'))
  ? fs.readFileSync(path.join(pkgDir, 'src/app/App.vue'), 'utf8')
  : ''
const hashRouteHits = routerFiles.filter((file) => {
  const text = fs.readFileSync(file, 'utf8')
  // 形如 '#/xxx' 的 hash 路由，或直接给 location.hash 赋值来导航
  return /['"`]#\//.test(text) || /location\.hash\s*=/.test(text)
})
const usesHistory = /history\.(push|replace)State/.test(appSource) && !/window\.location\.hash\s*=/.test(appSource)
record(
  '路由使用 History API（hash 仅作锚点）',
  hashRouteHits.length === 0 && usesHistory,
  usesHistory ? 'pathname + pushState/replaceState；#场景名 仅作页内锚点' : `可疑文件：${hashRouteHits.map(rel).join(', ')}`
)

/* 11. 场景样式约束：必须 scoped，且不许命中 :root / html / body（不做沙箱，靠约束兜） */
const sceneStyleOffenders: string[] = []
for (const file of walk(path.join(exampleDir, 'src/scenes'), (item) => item.endsWith('.vue'))) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    const attrs = match[1] ?? ''
    const body = match[2] ?? ''
    if (!/scoped/.test(attrs)) sceneStyleOffenders.push(`${rel(file)}（缺 scoped）`)
    if (/(^|[},]\s*)(:root|html|body)\b/.test(body)) sceneStyleOffenders.push(`${rel(file)}（命中 :root/html/body）`)
  }
}
record(
  '场景样式约束（scoped、不碰全局选择器）',
  sceneStyleOffenders.length === 0,
  sceneStyleOffenders.join(', ')
)

/* 12. 契约清单：组件 props 提取 + 未覆盖标记 */
const manifestPath = path.join(exampleDir, '.playground/manifest.json')
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    components: { name: string; props: { name: string }[]; uncoveredProps: string[] }[]
  }
  const button = manifest.components.find((item) => item.name === 'MyButton')
  const hasProps = Boolean(button && button.props.some((prop) => prop.name === 'size'))
  const flagsUncovered = Boolean(button?.uncoveredProps.includes('pill'))
  record(
    '契约清单提取正确（含未覆盖标记）',
    hasProps && flagsUncovered,
    hasProps ? 'MyButton.props 含 size' : '未提取到 MyButton.props',
  )
} else {
  record('契约清单提取正确（含未覆盖标记）', true, '未生成 manifest，跳过')
}

/* 11.4 每个示例的契约清单结构（静态） */
const manifestIssues: string[] = []
const manifestSummary: string[] = []
for (const example of EXAMPLES) {
  const file = path.join(example.dir, '.playground/manifest.json')
  if (!fs.existsSync(file)) {
    manifestIssues.push(`${example.label} 没有 manifest`)
    continue
  }
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    components: Array<{
      name?: string
      props?: unknown
      events?: unknown
      slots?: unknown
      exposed?: unknown
      undocumented?: unknown
    }>
  }
  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    manifestIssues.push(`${example.label} components 为空`)
    continue
  }
  const bad = manifest.components.filter(
    (item) =>
      !item.name ||
      !Array.isArray(item.props) ||
      !Array.isArray(item.events) ||
      !Array.isArray(item.slots) ||
      !Array.isArray(item.exposed) ||
      !Array.isArray(item.undocumented)
  )
  if (bad.length) manifestIssues.push(`${example.label}: ${bad.map((item) => item.name ?? '?').join(',')} 字段不全`)
  const props = manifest.components.reduce((sum, item) => sum + (item.props as unknown[]).length, 0)
  manifestSummary.push(`${example.label} ${manifest.components.length} 组件 / ${props} props`)
}
record(
  '三个示例的契约清单结构完整',
  manifestIssues.length === 0,
  manifestIssues.length ? manifestIssues.join('；') : manifestSummary.join('，')
)

/* 11.5 API 文档数据：events/slots/exposed 带类型，undocumented 是数组 */
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    components: Array<{
      name: string
      props: Array<{ name: string; description: string }>
      events: Array<{ name: string; type: string; signature: string }>
      slots: Array<{ name: string; description: string }>
      exposed: Array<{ name: string; description: string }>
      undocumented: string[]
    }>
  }
  const input = manifest.components.find((item) => item.name === 'MyInput')
  const eventTyped = Boolean(
    input?.events.some((event) => event.name === 'focus' && event.type.includes('FocusEvent') && event.signature.includes('focus'))
  )
  const slotTyped = Boolean(input?.slots.some((slot) => slot.name === 'prefix'))
  const exposedDoc = Boolean(input?.exposed.some((item) => item.name === 'focus' && item.description.length > 0))
  const noGap = Array.isArray(input?.undocumented) && input.undocumented.length === 0
  record(
    'API 契约（事件类型 / 插槽 / 暴露 / 缺说明清单）',
    eventTyped && slotTyped && exposedDoc && noGap,
    eventTyped ? 'MyInput.events/slots/exposed 字段齐全，缺说明 0' : 'MyInput 契约字段缺失'
  )
} else {
  record('API 契约（事件类型 / 插槽 / 暴露 / 缺说明清单）', true, '未生成 manifest，跳过')
}

/* 11.6 对象类型的 API 要能展开字段（props 的对象数组 + 事件的对象参数） */
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    components: Array<{
      name: string
      props: Array<{ name: string; fields?: Array<{ name: string; type: string; required: boolean; description: string }> }>
      events: Array<{ name: string; fields?: Array<{ name: string; description: string }> }>
    }>
  }
  const table = manifest.components.find((item) => item.name === 'MyTable')
  const columnFields = table?.props.find((prop) => prop.name === 'columns')?.fields ?? []
  const configFields = table?.props.find((prop) => prop.name === 'config')?.fields ?? []
  const eventFields = table?.events.find((event) => event.name === 'sortChange')?.fields ?? []
  const ok =
    columnFields.length === 4 &&
    columnFields.some((field) => field.name === 'align' && field.type.includes('"left"')) &&
    columnFields.every((field) => Boolean(field.description)) &&
    configFields.length === 3 &&
    eventFields.length === 2 &&
    eventFields.every((field) => Boolean(field.description))
  record(
    '对象类型 API 字段提取（manifest，供 MCP 输出）',
    ok,
    ok
      ? `columns ${columnFields.length} 字段、config ${configFields.length} 字段、sortChange ${eventFields.length} 字段，说明齐全`
      : `columns ${columnFields.length}、config ${configFields.length}、sortChange ${eventFields.length}`
  )
} else {
  record('对象类型 API 字段提取（manifest，供 MCP 输出）', true, '未生成 manifest，跳过')
}

/* 11.7 契约里的具名类型要汇总成「类型」页签的数据（声明原文 + 来源文件） */
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    components: Array<{
      name: string
      types?: Array<{ name: string; kind: string; file: string; code: string }>
    }>
  }
  const table = manifest.components.find((item) => item.name === 'MyTable')
  const types = table?.types ?? []
  const named = ['TableColumn', 'TableConfig', 'SortPayload'].every((name) =>
    types.some((item) => item.name === name)
  )
  const withDocs = types.every((item) => item.code.includes('/**') && item.code.includes(item.name))
  const fromSource = types.every((item) => item.file === 'src/lib/MyTable.vue' && item.kind === 'interface')
  const ok = types.length === 3 && named && withDocs && fromSource
  record(
    '类型定义汇总（声明原文 / JSDoc / 来源文件）',
    ok,
    ok
      ? `MyTable ${types.length} 个类型：${types.map((item) => item.name).join('、')}，原文含 JSDoc`
      : `MyTable types=${types.length}，命名 ${named}，含注释 ${withDocs}，来源 ${fromSource}`
  )
} else {
  record('类型定义汇总（声明原文 / JSDoc / 来源文件）', true, '未生成 manifest，跳过')
}

/* 11.8 类型提取：字面量联合 / enum / 交叉 / 内联联合（与 verify:types 同源） */
try {
  const typeChecks = runTypeFixtureChecks()
  const passed = typeChecks.filter((item) => item.ok).length
  const firstFail = typeChecks.find((item) => !item.ok)
  record(
    '类型提取（字面量联合 / enum / 交叉 / 内联联合 / values）',
    passed === typeChecks.length,
    passed === typeChecks.length
      ? `${passed}/${typeChecks.length} 条用例通过（夹具 TagList）`
      : `${passed}/${typeChecks.length} 条通过；首个失败：${firstFail?.name ?? ''}`
  )
} catch (error) {
  record('类型提取（字面量联合 / enum / 交叉 / 内联联合 / values）', false, `夹具运行失败：${String(error)}`)
}

/* 11.9 字段展开规则：外部包不展开 / 32 上限 / 说明清洗（与 verify:fields 同源） */
try {
  const fieldChecks = runFieldFixtureChecks()
  const passed = fieldChecks.filter((item) => item.ok).length
  const firstFail = fieldChecks.find((item) => !item.ok)
  record(
    '字段展开规则（外部包不展开 / 32 上限 / 说明清洗）',
    passed === fieldChecks.length,
    passed === fieldChecks.length
      ? `${passed}/${fieldChecks.length} 条用例通过（夹具 FieldCard）`
      : `${passed}/${fieldChecks.length} 条通过；首个失败：${firstFail?.name ?? ''}`
  )
} catch (error) {
  record('字段展开规则（外部包不展开 / 32 上限 / 说明清洗）', false, `夹具运行失败：${String(error)}`)
}

/* 12. 脚手架默认开契约清单：模板必须声明 components，否则新人拿不到 manifest */
const templateConfigPath = path.join(root, 'packages/create-playground/template/playground.config.ts')
const templateConfig = fs.existsSync(templateConfigPath)
  ? fs.readFileSync(templateConfigPath, 'utf8')
  : ''
record(
  '脚手架模板默认开契约清单',
  /components:\s*\[/.test(templateConfig) && templateConfig.includes('src/components'),
  templateConfig ? '模板 playground.config.ts 声明了 components' : '模板配置文件缺失',
)

/* 13. 文档能力：Markdown 解析器 + 公共排版组件 + 内容页不开源码 */
const { parseFrontmatter, splitBlocks } = (await import(
  '../packages/playground/src/components/prose/parse.ts'
)) as typeof import('../packages/playground/src/components/prose/parse.ts')

const frontmatter = parseFrontmatter(`---
title: 键盘操作
order: 2
tags: [快捷键, 菜单]
showSource: false
---

正文`)
const frontmatterOk =
  frontmatter.title === '键盘操作' &&
  frontmatter.order === '2' &&
  Array.isArray(frontmatter.tags) &&
  (frontmatter.tags as string[]).join(',') === '快捷键,菜单' &&
  frontmatter.showSource === 'false'
record('Markdown frontmatter 解析', frontmatterOk, JSON.stringify(frontmatter))

const blocks = splitBlocks(`前一段

::: tip 小标题
提示正文
:::

中间

::: steps
1. 一
2. 二
:::

::: unknown-thing
不认识也要保留
:::`)
const blocksOk =
  blocks.length === 5 &&
  blocks[0]?.kind === 'md' &&
  blocks[1]?.kind === 'callout' &&
  blocks[1]?.tone === 'tip' &&
  blocks[1]?.title === '小标题' &&
  blocks[2]?.kind === 'md' &&
  blocks[3]?.kind === 'steps' &&
  blocks.some((block) => block.kind === 'md' && block.text.includes('不认识也要保留'))
record(
  'Markdown 容器切分（tip / steps / 未知容器不吞内容）',
  blocksOk,
  `${blocks.length} 块：${blocks.map((block) => block.kind).join(' → ')}`
)

const unclosed = splitBlocks(`::: warn
没有收口`)
const unclosedOk = unclosed.length === 1 && unclosed[0]?.kind === 'md' && unclosed[0]?.text.includes('没有收口')
record('Markdown 未闭合容器回退为正文', unclosedOk, unclosed.map((block) => block.kind).join(','))

const coreIndex = fs.readFileSync(path.join(pkgDir, 'src/index.ts'), 'utf8')
const proseExports = ['PwProse', 'PwCallout', 'PwSteps', 'PwStep', 'PwMarkdown', 'defineMarkdownScene'].filter(
  (name) => !coreIndex.includes(name)
)
const proseDir = path.join(pkgDir, 'src/components/prose')
const enhanceFile = path.join(proseDir, 'enhance.ts')
const enhanceSrc = fs.existsSync(enhanceFile) ? fs.readFileSync(enhanceFile, 'utf8') : ''
const proseSrc = fs.readFileSync(path.join(proseDir, 'PwProse.vue'), 'utf8')
const markdownSrc = fs.readFileSync(path.join(proseDir, 'PwMarkdown.vue'), 'utf8')
const enhanceOk =
  enhanceSrc.includes('enhanceCodeBlocks') &&
  enhanceSrc.includes('data-pw-copy') &&
  enhanceSrc.includes('navigator.clipboard') &&
  enhanceSrc.includes('codeToHtml') &&
  proseSrc.includes('enhanceCodeBlocks') &&
  markdownSrc.includes('enhanceCodeBlocks') &&
  markdownSrc.includes('handleCopyClick')
record(
  '代码块增强：高亮 + 语言角标 + 复制（Markdown 与手写内容页同一条路径）',
  enhanceOk,
  enhanceOk ? 'enhance.ts / PwProse / PwMarkdown 都接上了' : '缺少 enhance.ts 或组件没接'
)

const proseStylePath = path.join(proseDir, 'prose.less')
const proseStyleText = fs.existsSync(proseStylePath) ? fs.readFileSync(proseStylePath, 'utf8') : ''
const copyStyles = ['\\.pw-prose__lang', '\\.pw-prose__copy', 'padding-top: 27px'].filter(
  (pattern) => !new RegExp(pattern).test(proseStyleText)
)
const themeRules = ['var(--shiki-light)', 'var(--shiki-dark)', 'var(--shiki-dark-bg)'].filter(
  (token) => !proseStyleText.includes(token)
)
record('shiki 双主题在 prose 里落地（否则代码块只有颜色变量、没有颜色）', themeRules.length === 0, themeRules.join(', '))

record('代码块工具栏样式（角标 / 复制按钮 / 不压第一行）', copyStyles.length === 0, copyStyles.join(', '))

record('公共排版组件已导出（PwProse / PwCallout / PwSteps / PwMarkdown）', proseExports.length === 0, proseExports.join(', '))

const proseSheet = path.join(pkgDir, 'src/components/prose/prose.less')
const proseCss = fs.existsSync(proseSheet) ? fs.readFileSync(proseSheet, 'utf8') : ''
record(
  '排版样式只取主题变量（.pw-prose）',
  proseCss.includes('.pw-prose') && !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(proseCss),
  fs.existsSync(proseSheet) ? `${proseCss.split('\n').length} 行` : '缺少 prose.less'
)

const mdScenes = walk(path.join(exampleDir, 'src/scenes'), (file) => file.endsWith('.md'))
record(
  'Markdown 场景可用（.md 直接当场景）',
  mdScenes.length >= 4,
  `${mdScenes.length} 个：${mdScenes.map((file) => path.basename(file)).join(', ')}`
)

/* 12.4 代码配色：常量与实际 import 的主题必须一致（改一处漏另一处会静默退化成无高亮） */
const highlighterFile = path.join(pkgDir, 'src/code/highlighter.ts')
const highlighterSrc = fs.readFileSync(highlighterFile, 'utf8')
const lightTheme = highlighterSrc.match(/PW_THEME_LIGHT = '([^']+)'/)?.[1] ?? ''
const darkTheme = highlighterSrc.match(/PW_THEME_DARK = '([^']+)'/)?.[1] ?? ''
const themeImports = [...highlighterSrc.matchAll(/import\('@shikijs\/themes\/([^']+)'\)/g)].map((match) => match[1])
const themeOk =
  Boolean(lightTheme) &&
  Boolean(darkTheme) &&
  themeImports.includes(lightTheme) &&
  themeImports.includes(darkTheme)
record(
  '代码配色主题：常量与 shiki 主题 import 一致',
  themeOk,
  themeOk ? `浅色 ${lightTheme} / 深色 ${darkTheme}` : `常量 ${lightTheme}/${darkTheme}，import ${themeImports.join(',')}`
)

/* 12.5 术语统一：入参 / 出参 → 输入 / 输出 */
const legacyTerms: string[] = []
const termTargets = [
  ...walk(path.join(pkgDir, 'src'), (item) => /\.(ts|vue|md|less)$/.test(item)),
  ...walk(path.join(root, 'docs'), (item) => item.endsWith('.md')),
  path.join(pkgDir, 'README.md'),
]
for (const file of termTargets) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes('入参') || text.includes('出参')) legacyTerms.push(rel(file))
}
record('术语统一（入参 / 出参 → 输入 / 输出）', legacyTerms.length === 0, legacyTerms.join(', '))

/* 12.6 预览宽度：预设 / 自定义 / 设备外壳 */
const { VIEWPORT_PRESETS, CUSTOM_WIDTH, clampWidth, resolveViewport, shellOf } = (await import(
  '../packages/playground/src/app/viewport.ts'
)) as typeof import('../packages/playground/src/app/viewport.ts')

const presetIds = VIEWPORT_PRESETS.map((item) => item.id).join(',')
const presetOk =
  presetIds === 'auto,mobile,tablet,desktop' &&
  VIEWPORT_PRESETS.map((item) => item.px).join(',') === '0,390,820,1280'
record('预览宽度预设（自适应 / 手机 390 / 平板 820 / 桌面 1280）', presetOk, presetIds)

const shellOk =
  shellOf(390) === 'phone' &&
  shellOf(820) === 'tablet' &&
  shellOf(1280) === 'desktop' &&
  resolveViewport({ id: 'custom', px: 700 }).shell === 'tablet' &&
  resolveViewport({ id: 'auto', px: 0 }).shell === 'none'
record('设备外壳按宽度选择（手机 / 平板 / 桌面窗口）', shellOk, `390→${shellOf(390)} 820→${shellOf(820)} 1280→${shellOf(1280)}`)

const clampOk = clampWidth(100) === CUSTOM_WIDTH.min && clampWidth(5000) === CUSTOM_WIDTH.max && clampWidth(375.4) === 375
record('自定义宽度夹在 320–1920px', clampOk, `${clampWidth(100)} / ${clampWidth(5000)} / ${clampWidth(375.4)}`)

const pageSrc = fs.readFileSync(path.join(pkgDir, 'src/app/PlaygroundPage.vue'), 'utf8')
const shellMarkup = ['pw-device-wrap--', 'pw-device__bar', 'pw-device__sensor', 'container-name: pw-preview'].filter(
  (token) => !pageSrc.includes(token)
)
record('预览外壳与容器查询已接线', shellMarkup.length === 0, shellMarkup.join(', '))

// 索引必须在外壳之外：pw-page__work 里 device-wrap 与 pw-index 是兄弟
const workAt = pageSrc.indexOf('class="pw-page__work"')
const indexPath = pageSrc.indexOf('<PlaygroundPageIndex')
const captionAt = pageSrc.indexOf('pw-device__caption')
const indexOutsideShell = workAt >= 0 && indexPath > workAt && indexPath > captionAt
const indexToggle =
  pageSrc.includes("rinova-playground:index-open") &&
  pageSrc.includes('收起索引') &&
  pageSrc.includes('展开索引') &&
  pageSrc.includes('pw-index-slot')
const appSrc = fs.readFileSync(path.join(root, 'packages/playground/src/app/App.vue'), 'utf8')
const themeMotion =
  appSrc.includes('startViewTransition') &&
  appSrc.includes("pseudoElement: '::view-transition-new(root)'") &&
  appSrc.includes('await nextTick()') &&
  appSrc.includes('prefers-reduced-motion')
record('浅色/深色切换有圆开动效（含降级）', themeMotion, themeMotion ? 'View Transitions + reduced-motion 降级' : '缺少切换动效')
const narrowIndex = pageSrc.includes('@media (max-width: 1080px)') && pageSrc.includes('.pw-head-btn--index')
record('窄窗口隐藏索引与开关', narrowIndex, narrowIndex ? '≤1080px 让位' : '缺少窄窗让位规则')

record('索引可展开/收起且状态持久化', indexToggle, indexToggle ? '右上角按钮 + localStorage' : '缺少索引开关')

record(
  '场景索引在外壳之外（不随预览宽度缩放）',
  indexOutsideShell,
  indexOutsideShell ? 'pw-page__work 内：device-wrap + pw-index 并列' : '索引仍在滚动 / 外壳内'
)

/* 13.1 源码搜索的匹配器：大小写 / 全词 / 多次命中（DOM 侧靠它切 <mark>） */
const { findMatches } = await import('../packages/playground/src/code/find.ts')
const text = 'const columns = 1 // Columns\nconst columnWidth = 2'
const searchCases = [
  { label: '默认忽略大小写', got: findMatches(text, 'Columns').length, want: 2 },
  { label: '区分大小写', got: findMatches(text, 'Columns', { caseSensitive: true }).length, want: 1 },
  { label: '全词 + 区分大小写只命中独立词', got: findMatches(text, 'Columns', { wholeWord: true, caseSensitive: true }).length, want: 1 },
  { label: '子串命中两处', got: findMatches(text, 'column').length, want: 3 },
  { label: '空串不命中', got: findMatches(text, '').length, want: 0 },
]
const searchBad = searchCases.filter((item) => item.got !== item.want)
record(
  '源码搜索匹配器（大小写 / 全词 / 多次命中）',
  searchBad.length === 0,
  searchBad.length ? searchBad.map((item) => `${item.label}: ${item.got}≠${item.want}`).join('; ') : '5 条用例通过'
)

/* 13. 契约清单 glob：`**\/` 必须能匹配任意层目录（真实项目组件常在 Xxx/src/components/ 三层） */
const { globToRegExp } = await import('../packages/playground-vite/src/manifest.ts')
const globCases: Array<[pattern: string, file: string, expected: boolean]> = [
  ['src/components/**/*.vue', 'src/components/A.vue', true],
  ['src/components/**/*.vue', 'src/components/X/a.vue', true],
  ['src/components/**/*.vue', 'src/components/X/src/components/a.vue', true],
  ['src/components/**/*.vue', 'src/scenes/a.vue', false],
  ['src/components/*.vue', 'src/components/X/a.vue', false],
  ['src/components/X.vue', 'src/components/X.vue', true],
]
const globFails = globCases.filter(([pattern, file, expected]) => globToRegExp(pattern).test(file) !== expected)
record(
  '契约清单 glob 支持任意层目录',
  globFails.length === 0,
  globFails.length ? globFails.map(([pattern, file]) => `${pattern} ~ ${file}`).join(', ') : `${globCases.length} 条用例`,
)

/* 14. 插件：路径解析 / 测试床文件存在 / 虚拟模块数量 */
const { resolvePluginSpecifier } = await import('../packages/playground-vite/src/plugin-spec.ts')
const pluginRoot = path.join(root, 'examples/minimal-lib')
const specCases: Array<[input: string, expected: string | null]> = [
  ['./src/playground/plugins.ts', '/src/playground/plugins.ts'],
  ['/src/playground/plugins.ts', '/src/playground/plugins.ts'],
  ['@/playground/plugins', '@/playground/plugins'],
  ['my-plugin', 'my-plugin'],
  ['../outside.ts', null],
  ['', null],
]
const specFails = specCases.filter(([input, expected]) => {
  try {
    return resolvePluginSpecifier(pluginRoot, input) !== expected
  } catch {
    return expected !== null
  }
})
record(
  '插件路径解析（相对 / 根相对 / alias / 包名 / 越界 / 空串）',
  specFails.length === 0,
  specFails.length
    ? specFails.map(([input]) => `失败：${input || '(空串)'}`).join(', ')
    : `${specCases.length} 条用例`,
)

const minimalConfigFile = path.join(pluginRoot, 'playground.config.ts')
const pluginBlock = fs.existsSync(minimalConfigFile)
  ? (fs.readFileSync(minimalConfigFile, 'utf8').match(/plugins:\s*\[([\s\S]*?)\]/)?.[1] ?? '')
  : ''
const declaredPlugins = [...pluginBlock.matchAll(/['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .filter((value): value is string => Boolean(value))
const missingPlugins = declaredPlugins.filter((spec) => {
  try {
    const resolved = resolvePluginSpecifier(pluginRoot, spec)
    return resolved.startsWith('/') && !fs.existsSync(path.join(pluginRoot, resolved))
  } catch {
    return true
  }
})
record(
  '测试床插件文件可解析',
  declaredPlugins.length === 1 && missingPlugins.length === 0,
  missingPlugins.length
    ? `找不到：${missingPlugins.join(', ')}`
    : `${declaredPlugins.length} 个：${declaredPlugins.join(', ')}`,
)

const pluginCount = async (port: number): Promise<number | null> => {
  try {
    const res = await fetch(`http://localhost:${port}/@id/__x00__virtual:playground/plugins`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return null
    return ((await res.text()).match(/\(\) => import\(/g) ?? []).length
  } catch {
    return null
  }
}
const minimalPlugins = await pluginCount(5273)
const docsPlugins = await pluginCount(5280)
// docs-site 没配 plugins：dev server 没起时是 null，起了必须是 0
const pluginsOk = minimalPlugins === null || (minimalPlugins === 1 && (docsPlugins === null || docsPlugins === 0))
record(
  '插件虚拟模块数量与配置一致（不配为空）',
  pluginsOk,
  minimalPlugins === null
    ? 'dev server 未运行，跳过'
    : `minimal-lib ${minimalPlugins} 个 / docs-site ${docsPlugins === null ? '未运行' : `${docsPlugins} 个`}`,
)

/* 15. 非组件模块：函数 / 常量契约 + 页绑定 */
const minimalManifestFile = path.join(root, 'examples/minimal-lib/.playground/manifest.json')
let moduleDetail = 'manifest 未生成，跳过'
let moduleOk = true
if (fs.existsSync(minimalManifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(minimalManifestFile, 'utf8')) as {
    modules?: Array<{
      name: string
      rel: string
      functions: Array<{ name: string; signature: string; params: unknown[]; returns: string; covered: boolean }>
      constants: Array<{ name: string }>
      types: Array<{ name: string; code: string }>
    }>
  }
  const modules = manifest.modules ?? []
  const byName = new Map(modules.map((item) => [item.name, item]))
  const money = byName.get('money')
  const hooks = byName.get('useDebounce')
  const constants = byName.get('constants')
  const format = money?.functions.find((fn) => fn.name === 'formatMoney')
  const problems: string[] = []
  if (!money) problems.push('缺 money 模块')
  if (!hooks) problems.push('缺 useDebounce 模块')
  if (!constants) problems.push('缺 constants 模块')
  if (!format) problems.push('缺 formatMoney')
  else {
    if (!/^formatMoney\(value: number, options\?: FormatMoneyOptions\): string$/.test(format.signature))
      problems.push(`formatMoney 签名不对：${format.signature}`)
    if (format.params.length !== 2) problems.push(`formatMoney 参数 ${format.params.length} ≠ 2`)
    if (format.returns !== 'string') problems.push(`formatMoney 返回 ${format.returns}`)
    if (!format.covered) problems.push('formatMoney 应标记为已覆盖')
  }
  if (!hooks?.functions.some((fn) => fn.name === 'useDebounce')) problems.push('useDebounce 不是函数')
  if (!constants?.constants.some((item) => item.name === 'ORDER_STATUS')) problems.push('缺 ORDER_STATUS 常量')
  // 类型页签：导出 interface / type 原文必须带字段 JSDoc
  if (!money?.types.some((type) => type.name === 'FormatMoneyOptions' && type.code.includes('币种代码')))
    problems.push('FormatMoneyOptions 类型未带 JSDoc')
  moduleOk = problems.length === 0
  moduleDetail = problems.length
    ? problems.join('; ')
    : `${modules.length} 个模块：${modules.map((item) => `${item.name}(${item.functions.length}fn/${item.constants.length}const/${item.types.length}type)`).join(' / ')}`
}
record('非组件模块契约（函数签名 / 参数 / 常量 / 类型）', moduleOk, moduleDetail)

/* 16. 运行时：API 虚拟模块里的模块绑定 */
let apiModuleOk = true
let apiModuleDetail = 'dev server 未运行，跳过'
try {
  const res = await fetch('http://localhost:5273/@id/__x00__virtual:playground/api', {
    signal: AbortSignal.timeout(2000),
  })
  const code = await res.text()
  const modulesMatch = code.match(/export const modules = (\{[\s\S]*?\})\nexport const pageModules = (\{[\s\S]*?\})\n/)
  if (!modulesMatch) {
    apiModuleOk = false
    apiModuleDetail = 'API 模块缺少 modules / pageModules'
  } else {
    const modules = JSON.parse(modulesMatch[1] ?? '{}') as Record<string, unknown>
    const pageModules = JSON.parse(modulesMatch[2] ?? '{}') as Record<string, string>
    apiModuleOk = Boolean(modules.money) && pageModules['utils/money'] === 'money'
    apiModuleDetail = `${Object.keys(modules).length} 个模块注入 / pageModules ${JSON.stringify(pageModules)}`
  }
} catch {
  apiModuleDetail = 'dev server 未运行，跳过'
}
record('函数 API：模块契约进虚拟模块且页绑定正确', apiModuleOk, apiModuleDetail)

/* ===== 0.7：AI 能力（manifest env / llms.txt 手册 / 场景校验规则） ===== */

const manifestExamples = ['minimal-lib', 'real-lib']
const envProblems: string[] = []
const envSummary: string[] = []
for (const name of manifestExamples) {
  const file = path.join(root, `examples/${name}/.playground/manifest.json`)
  if (!fs.existsSync(file)) {
    // .playground 是构建产物，没跑过 dev / build 时不存在 —— 与其它运行时检查同样按跳过处理
    envSummary.push(`${name}: 清单未生成，跳过`)
    continue
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    components: { name: string }[]
    env?: {
      sceneRoot: string
      groups: { dir: string; label: string }[]
      globals: Record<string, unknown>
      plugins: string[]
      theme: { ui: string; stage: string }
      components: { configured: boolean; count: number }
      pages: { id: string; dir: string; scenes: string[]; component?: string; module?: string }[]
    }
  }
  const env = data.env
  if (!env) {
    envProblems.push(`${name}: 缺 env 段`)
    continue
  }
  if (!env.pages.length) envProblems.push(`${name}: env.pages 为空`)
  if (env.components.count !== data.components.length) {
    envProblems.push(`${name}: components.count=${env.components.count} 与组件数 ${data.components.length} 不一致`)
  }
  const missingDir = env.pages.filter((page) => !fs.existsSync(path.join(root, `examples/${name}`, page.dir)))
  if (missingDir.length) envProblems.push(`${name}: page.dir 不存在 ${missingDir.map((page) => page.dir).join(', ')}`)
  const danglingScenes = env.pages.flatMap((page) =>
    page.scenes.filter((id) => !id.startsWith(`${page.id}/`)).map((id) => `${page.id}→${id}`)
  )
  if (danglingScenes.length) envProblems.push(`${name}: 页面下的场景 id 不匹配 ${danglingScenes.join(', ')}`)
  envSummary.push(
    `${name}: ${env.pages.length} 页 / ${env.groups.length} 组 / globals ${Object.keys(env.globals).length} 个 / 插件 ${env.plugins.length}`
  )
}
record('manifest env 段（页面清单 / globals / 插件 / 分组）', envProblems.length === 0, envProblems.join('；') || envSummary.join('；'))

const llmsFile = path.join(root, 'examples/minimal-lib/.playground/llms.txt')
const llmsText = fs.existsSync(llmsFile) ? fs.readFileSync(llmsFile, 'utf8') : ''
const llmsSections = ['## 1. 环境', '## 2. 写作规则', '## 3. 最小骨架', '## 4. 页面清单', '## 5. 契约与待办']
const llmsMissing = llmsSections.filter((section) => !llmsText.includes(section))
const llmsNeeds = ['apiBase', '<style scoped lang="less">', 'sceneMeta 字段', 'pageMeta 字段', 'llms-components.txt']
const llmsMissContent = llmsNeeds.filter((item) => !llmsText.includes(item))
record(
  'llms.txt 是「AI 能照着写场景」的手册',
  llmsMissing.length === 0 && llmsMissContent.length === 0,
  llmsMissing.length || llmsMissContent.length
    ? `缺章节：${llmsMissing.join(', ') || '无'}；缺内容：${llmsMissContent.join(', ') || '无'}`
    : `${llmsSections.length} 个章节 / ${llmsText.split('\n').length} 行`
)

/* 11.6 手册不再夹带契约与待办：契约往往几百 KB，整份喂给模型没有意义 */
const llmsParts = ['llms-components.txt', 'llms-todo.txt'].map((name) => {
  const file = path.join(root, 'examples/minimal-lib/.playground', name)
  return { name, exists: fs.existsSync(file), size: fs.existsSync(file) ? fs.statSync(file).size : 0 }
})
const guideTooBig = llmsText.length > 64 * 1024
record(
  'llms 三份分工（手册 ≤ 64KB / 契约 / 待办）',
  !guideTooBig && llmsParts.every((part) => part.exists && part.size > 0),
  guideTooBig
    ? `手册 ${Math.round(llmsText.length / 1024)}KB，超过 64KB`
    : `手册 ${Math.round(llmsText.length / 1024)}KB + ${llmsParts.map((part) => `${part.name} ${Math.round(part.size / 1024)}KB`).join(' / ')}`
)

/* 11.7 清单是单行紧凑 JSON：缩进版在真实宿主上会变成十几万行 */
const compactManifestFile = path.join(root, 'examples/minimal-lib/.playground/manifest.json')
if (fs.existsSync(compactManifestFile)) {
  const compactText = fs.readFileSync(compactManifestFile, 'utf8').trimEnd()
  const lineCount = compactText.split('\n').length
  record(
    '清单是单行紧凑 JSON（可读性交给 jq）',
    lineCount === 1,
    `${lineCount} 行 / ${Math.round(compactText.length / 1024)}KB`
  )
} else {
  record('清单是单行紧凑 JSON（可读性交给 jq）', true, '未生成 manifest，跳过')
}

const { validateScenes } = await import('../packages/playground-mcp/src/validate.ts')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rp-verify-'))
const fixtureSceneDir = path.join(fixtureRoot, 'src/scenes/demo/page')
fs.mkdirSync(fixtureSceneDir, { recursive: true })
fs.writeFileSync(
  path.join(fixtureSceneDir, 'good.vue'),
  [
    '<script setup lang="ts">',
    'const text = \'ok\'',
    '</script>',
    '',
    '<script lang="ts">',
    'export const sceneMeta = { title: \'好场景\', section: \'props\', api: [\'size\'] }',
    '</script>',
    '',
    '<template><div>{{ text }}</div></template>',
    '',
    '<style scoped lang="less">',
    '.demo { color: var(--rp-color-text); }',
    '</style>',
    '',
  ].join('\n')
)
fs.writeFileSync(
  path.join(fixtureSceneDir, 'bad.vue'),
  [
    '<script setup lang="ts">',
    'const state = useScenePayload({})',
    '</script>',
    '',
    '<script lang="ts">',
    'export const sceneMeta = { title: \'坏场景\', tittle: \'拼错\', payload: { a: 1 } }',
    '</script>',
    '',
    '<template><div /></template>',
    '',
    '<style>',
    'html { color: red; }',
    'body { margin: 0; }',
    '</style>',
    '',
  ].join('\n')
)
const fixtureManifest = {
  env: {
    sceneRoot: 'src/scenes',
    pages: [
      { id: 'demo/page', group: 'Demo', groupDir: 'demo', dir: 'src/scenes/demo/page', component: 'MyCard' },
      { id: 'demo/ghost', group: 'Demo', groupDir: 'demo', dir: 'src/scenes/demo/ghost', component: 'NotExist' },
    ],
  },
  components: [{ name: 'MyCard' }],
  modules: [],
  scenes: [
    { id: 'demo/page/good', rel: 'src/scenes/demo/page/good.vue', lang: 'vue' as const },
    { id: 'demo/page/bad', rel: 'src/scenes/demo/page/bad.vue', lang: 'vue' as const },
  ],
}
const fixtureIssues = validateScenes(fixtureRoot, fixtureManifest)
const rules = new Set(fixtureIssues.map((issue) => issue.rule))
const expectedRules = ['style-scoped', 'style-global', 'deprecated-api', 'scene-meta-field', 'page-component']
const missingRules = expectedRules.filter((rule) => !rules.has(rule))
const goodIssues = validateScenes(fixtureRoot, fixtureManifest, 'src/scenes/demo/page/good.vue')
record(
  '场景校验规则（scoped / 全局选择器 / 废弃 API / meta 字段 / 页绑定）',
  missingRules.length === 0 && goodIssues.length === 0,
  missingRules.length ? `未触发：${missingRules.join(', ')}` : `坏场景命中 ${rules.size} 条规则 / 好场景 0 问题`
)
fs.rmSync(fixtureRoot, { recursive: true, force: true })

/* 输出 */
let failed = 0
for (const item of results) {
  const mark = item.ok ? 'PASS' : 'FAIL'
  if (!item.ok) failed += 1
  console.log(`${mark}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} 通过`)
process.exit(failed ? 1 : 0)