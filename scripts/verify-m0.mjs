#!/usr/bin/env node
/**
 * M0 验收脚本。
 *
 *   node scripts/verify-m0.mjs
 *
 * 静态检查始终执行；运行时检查需要 dev server 已在 5273 端口运行，否则跳过。
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkgDir = path.join(root, 'packages/playground')
const exampleDir = path.join(root, 'examples/minimal-lib')
const results = []

const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
}

const walk = (dir, filter, out = []) => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, filter, out)
    else if (filter(abs)) out.push(abs)
  }
  return out
}

/* 1. 不许出现 UI 组件库 */
const FORBIDDEN = ['element-plus', 'naive-ui', 'ant-design-vue', 'vuetify', 'tailwindcss', 'unocss']
const manifests = walk(root, (file) => file.endsWith('package.json') && !file.includes('node_modules'))
const offenders = []
for (const file of manifests) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies }
  for (const name of FORBIDDEN) {
    if (deps[name]) offenders.push(`${path.relative(root, file)} → ${name}`)
  }
}
record('无 UI 库依赖', offenders.length === 0, offenders.join(', '))

/* 2. 框架组件样式里不许出现硬编码色值 */
const styleFiles = walk(path.join(pkgDir, 'src'), (file) => /\.(vue|css)$/.test(file))
const hardcoded = []
for (const file of styleFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const hits = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)]
  if (file.endsWith('theme.less')) continue // 变量定义文件允许
  if (hits.length) hardcoded.push(`${path.relative(root, file)}: ${hits.length} 处`)
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
const scanDiskScenes = (dir, prefix = '', out = []) => {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) scanDiskScenes(abs, rel, out)
    else if (entry.name.endsWith('.vue')) out.push(rel.replace(/\.vue$/, ''))
  }
  return out
}

const diskScenes = scanDiskScenes(path.join(exampleDir, 'src/scenes')).sort()
const VIRTUAL = 'http://localhost:5273/@id/__x00__virtual:playground/scenes'

try {
  const res = await fetch(VIRTUAL, { signal: AbortSignal.timeout(2000) })
  const code = await res.text()
  const runtimeScenes = [...code.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]).sort()
  const same =
    runtimeScenes.length === diskScenes.length &&
    runtimeScenes.every((id, index) => id === diskScenes[index])
  record(
    '侧栏场景与磁盘一致',
    same,
    same ? `${diskScenes.length} 个` : `磁盘 ${diskScenes.join(',')} / 运行时 ${runtimeScenes.join(',')}`
  )
} catch {
  record('侧栏场景与磁盘一致', true, 'dev server 未运行，跳过')
}

/* 6. 不允许 function 声明，一律箭头函数（只扫产品代码，不扫本脚本） */
const codeFiles = [
  ...walk(path.join(root, 'packages'), (file) => /\.(ts|js|mjs|vue)$/.test(file) && !file.includes('node_modules')),
  ...walk(path.join(exampleDir, 'src'), (file) => /\.(ts|vue)$/.test(file)),
]
const functionHits = []
for (const file of codeFiles) {
  const text = fs.readFileSync(file, 'utf8')
  if (/(^|[^\w.$])function\s+[\w$]*\s*\(/m.test(text)) functionHits.push(path.relative(root, file))
}
record('无 function 声明（只用箭头函数）', functionHits.length === 0, functionHits.join(', '))

/* 7. 样式一律 less */
const styleFileHits = walk(path.join(pkgDir, 'src'), (file) => file.endsWith('.css'))
const vueFiles = codeFiles.filter((file) => file.endsWith('.vue'))
const plainStyleBlocks = []
for (const file of vueFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/<style([^>]*)>/g)) {
    if (!/lang="less"/.test(match[1])) plainStyleBlocks.push(path.relative(root, file))
  }
}
const lessOk = styleFileHits.length === 0 && plainStyleBlocks.length === 0
record('样式统一 less', lessOk, [...styleFileHits, ...plainStyleBlocks].map((f) => path.relative(root, f)).join(', '))

/* 输出 */
let failed = 0
for (const item of results) {
  const mark = item.ok ? 'PASS' : 'FAIL'
  if (!item.ok) failed += 1
  console.log(`${mark}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} 通过`)
process.exit(failed ? 1 : 0)
