#!/usr/bin/env node
// 把四个包与脚手架模板依赖统一到目标版本
import fs from 'node:fs'

const target = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(target ?? '')) {
  console.error('用法: node scripts/bump-version.mjs <x.y.z>')
  process.exit(1)
}

const files = [
  'packages/playground/package.json',
  'packages/playground-vite/package.json',
  'packages/playground-mcp/package.json',
  'packages/create-playground/package.json',
  'packages/create-playground/template/package.json',
]

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  const before = json.version ?? '-'
  const ranges = []
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, value] of Object.entries(json[field] ?? {})) {
      if (!name.startsWith('@rinova/playground')) continue
      ranges.push(`${field}.${name}: ${value}`)
      json[field][name] = `^${target}`
    }
  }
  if (json.version) json.version = target
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
  console.log(`${file}  version ${before} → ${json.version ?? '(无 version)'}${ranges.length ? `  ranges ${ranges.join(', ')}` : ''}`)
}
