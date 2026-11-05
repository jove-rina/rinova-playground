#!/usr/bin/env node
// 发版前逐个包做 pack 预检：版本、体积、README、bin/入口文件是否在包里
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const packages = ['playground', 'playground-vite', 'playground-mcp', 'create-playground']
let failed = 0
let expectedVersion = ''

for (const name of packages) {
  const dir = path.resolve('packages', name)
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--registry', 'https://registry.npmjs.org/'], {
    cwd: dir,
    encoding: 'utf8',
  })
  const info = Object.values(JSON.parse(raw))[0]
  const files = info.files.map((file) => file.path)
  const missing = []

  if (!files.includes('README.md')) missing.push('README.md')
  const pkg = JSON.parse(execFileSync('node', ['-p', 'JSON.stringify(require("./package.json"))'], { cwd: dir, encoding: 'utf8' }))
  for (const [binName, binPath] of Object.entries(pkg.bin ?? {})) {
    const normalized = String(binPath).replace(/^\.\//, '')
    if (!files.includes(normalized)) missing.push(`${binName}→${normalized}`)
  }
  for (const field of ['main', 'module', 'types']) {
    const value = pkg[field]
    if (!value) continue
    if (!files.includes(String(value).replace(/^\.\//, ''))) missing.push(`${field}→${value}`)
  }
  if (!expectedVersion) expectedVersion = pkg.version
  if (pkg.version !== expectedVersion) missing.push(`version=${pkg.version}（应与 ${expectedVersion} 一致）`)

  const kb = (n) => `${(n / 1024).toFixed(1)}KB`
  console.log(
    `${missing.length ? 'FAIL' : 'OK  '} ${pkg.name}@${info.version}  ${files.length} 文件 / tarball ${kb(info.size)} / 解包 ${kb(info.unpackedSize)}` +
      (missing.length ? `  缺: ${missing.join(', ')}` : '')
  )
  if (missing.length) failed += 1
}

process.exit(failed ? 1 : 0)
