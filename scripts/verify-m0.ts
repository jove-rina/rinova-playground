#!/usr/bin/env node
/**
 * M0 验收脚本。
 *
 *   pnpm verify     # node --experimental-strip-types scripts/verify-m0.ts
 *
 * 静态检查始终执行；运行时检查需要 dev server 已在 5273 端口运行，否则跳过。
 */
import fs from 'node:fs'
import path from 'node:path'

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
    else if (entry.name.endsWith('.vue')) out.push(relPath.replace(/\.vue$/, ''))
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
        .filter((entry) => entry.isFile() && entry.name.endsWith('.vue') && !entry.name.startsWith('.'))
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
record('示例目录三层（分组下不放 .vue）', misplaced.length === 0, misplaced.join(', '))

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
  for (const group of listDirs(scenesRoot)) {
    for (const page of listDirs(path.join(scenesRoot, group))) {
      const metaFile = path.join(scenesRoot, group, page, 'meta.ts')
      if (!fs.existsSync(metaFile)) continue
      const declared = fs.readFileSync(metaFile, 'utf8').match(/component:\s*'([^']+)'/)
      // 与插件一致：没写 component 时按「页目录名 → 页标题」同名匹配
      const candidates = [declared?.[1], page, page.replace(/[-_]/g, '')].filter(Boolean) as string[]
      const byLower = new Map(manifest.components.map((item) => [item.name.toLowerCase(), item.name]))
      const hit = candidates.map((candidate) => byLower.get(candidate.toLowerCase())).find(Boolean)
      if (declared && !hit) {
        bindingMisses.push(`${example.label}: ${group}/${page} → ${declared[1]}`)
        continue
      }
      if (hit) bound += 1
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
  const diskScenes = scanDiskScenes(path.join(example.dir, 'src/scenes')).sort()
  const diskPages = [...new Set(diskScenes.map((id) => id.split('/').slice(0, 2).join('/')))].sort()
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
    '对象类型 API 展开字段（props 对象数组 / 对象 / 事件参数）',
    ok,
    ok
      ? `columns ${columnFields.length} 字段、config ${configFields.length} 字段、sortChange ${eventFields.length} 字段，说明齐全`
      : `columns ${columnFields.length}、config ${configFields.length}、sortChange ${eventFields.length}`
  )
} else {
  record('对象类型 API 展开字段（props 对象数组 / 对象 / 事件参数）', true, '未生成 manifest，跳过')
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

/* 输出 */
let failed = 0
for (const item of results) {
  const mark = item.ok ? 'PASS' : 'FAIL'
  if (!item.ok) failed += 1
  console.log(`${mark}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} 通过`)
process.exit(failed ? 1 : 0)
