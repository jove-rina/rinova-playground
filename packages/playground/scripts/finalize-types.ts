import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const typesDir = path.join(root, 'dist/types')

fs.copyFileSync(path.join(root, 'src/shims.d.ts'), path.join(typesDir, 'shims.d.ts'))

const indexPath = path.join(typesDir, 'index.d.ts')
const content = fs.readFileSync(indexPath, 'utf8')
if (!content.includes('shims.d.ts')) {
  fs.writeFileSync(indexPath, `/// <reference path="./shims.d.ts" />\n${content}`, 'utf8')
}

console.log('[playground] 类型声明收尾完成：dist/types/shims.d.ts + index.d.ts reference')
