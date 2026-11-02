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

/* 1. 不许出现 UI 组件库 */
const FORBIDDEN = ['element-plus', 'naive-ui', 'ant-design-vue', 'vuetify', 'tailwindcss', 'unocss']
const manifests = walk(root, (file) => file.endsWith('package.json') && !file.includes('node_modules'))
const offenders: string[] = []
for (const file of manifests) {
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
const scanDiskScenes = (dir: string, prefix = '', out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // 与插件扫描保持一致：点号开头的文件/目录跳过（临时预览文件就藏在这里）
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) scanDiskScenes(abs, relPath, out)
    else if (entry.name.endsWith('.vue')) out.push(relPath.replace(/\.vue$/, ''))
  }
  return out
}

const diskScenes = scanDiskScenes(path.join(exampleDir, 'src/scenes')).sort()
const VIRTUAL = 'http://localhost:5273/@id/__x00__virtual:playground/scenes'

try {
  const res = await fetch(VIRTUAL, { signal: AbortSignal.timeout(2000) })
  const code = await res.text()
  const runtimeScenes = [...code.matchAll(/id: "([^"]+)"/g)].map((match) => match[1] as string).sort()
  const same =
    runtimeScenes.length === diskScenes.length && runtimeScenes.every((id, index) => id === diskScenes[index])
  record(
    '侧栏场景与磁盘一致',
    same,
    same ? `${diskScenes.length} 个` : `磁盘 ${diskScenes.join(',')} / 运行时 ${runtimeScenes.join(',')}`
  )
  record(
    'sceneMeta 生效（标题/排序/隐藏）',
    code.includes('按钮 · 基础用法') && /order: 1,/.test(code) && /hidden: true/.test(code),
    code.includes('按钮 · 基础用法') ? '已解析 title / order / hidden' : '未在虚拟模块里找到 sceneMeta 字段'
  )
} catch {
  record('侧栏场景与磁盘一致', true, 'dev server 未运行，跳过')
  record('sceneMeta 生效（标题/排序/隐藏）', true, 'dev server 未运行，跳过')
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

/* 9. 路由必须是 History，不许用 hash */
const hashHits = walk(path.join(pkgDir, 'src'), (file) => /\.(ts|vue)$/.test(file)).filter((file) =>
  /location\.hash|hashchange/.test(fs.readFileSync(file, 'utf8'))
)
record('路由使用 History API（无 hash）', hashHits.length === 0, hashHits.map(rel).join(', '))

/* 11. 契约清单：组件 props 提取 + 未覆盖标记 */
const manifestPath = path.join(exampleDir, '.playground/manifest.json')
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    components: { name: string; props: { name: string }[]; uncoveredProps: string[] }[]
  }
  const button = manifest.components.find((item) => item.name === 'MyButton')
  const hasProps = Boolean(button && button.props.some((prop) => prop.name === 'size'))
  const flagsUncovered = Boolean(button?.uncoveredProps.includes('loading'))
  record(
    '契约清单提取正确（含未覆盖标记）',
    hasProps && flagsUncovered,
    hasProps ? 'MyButton.props 含 size' : '未提取到 MyButton.props',
  )
} else {
  record('契约清单提取正确（含未覆盖标记）', true, '未生成 manifest，跳过')
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

/* 输出 */
let failed = 0
for (const item of results) {
  const mark = item.ok ? 'PASS' : 'FAIL'
  if (!item.ok) failed += 1
  console.log(`${mark}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} 通过`)
process.exit(failed ? 1 : 0)
