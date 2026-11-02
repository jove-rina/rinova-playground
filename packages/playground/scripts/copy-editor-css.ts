/**
 * 把 Monaco 自带的样式整份搬到 dist/editor.css。
 * 用 prebuild 产物（min/vs/editor/editor.main.css）而不是 esm 里散落的 css：
 * 它已经内联了 codicon 字体，单独成文件后不会有任何相对路径依赖。
 */
import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const candidates = [
  path.join(cwd, 'node_modules/monaco-editor/min/vs/editor/editor.main.css'),
  path.join(cwd, '../../node_modules/.pnpm/monaco-editor@0.57.0/node_modules/monaco-editor/min/vs/editor/editor.main.css'),
]

const source = candidates.find((file) => fs.existsSync(file))
if (!source) {
  console.error('[playground] 找不到 monaco 的 editor.main.css，editor.css 未生成')
  process.exit(1)
}

const target = path.join(cwd, 'dist/editor.css')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.copyFileSync(source, target)

const size = (fs.statSync(target).size / 1024).toFixed(1)
console.log(`[playground] 编辑器样式 → dist/editor.css（${size} KB，打开代码面板时才加载）`)
