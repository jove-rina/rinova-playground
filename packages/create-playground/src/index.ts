#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.resolve(HERE, '../template')

interface CliOptions {
  targetDir: string
  projectName: string
  install: boolean
  force: boolean
  packagesDir: string
}

const HELP = `
用法：pnpm create rinova-playground [项目名] [选项]

选项
  --no-install        只生成文件，不安装依赖
  --force             目标目录非空时仍然写入
  --packages <dir>    把 @rinova/* 依赖指向本地 packages 目录（开发框架时用）
  -h, --help          显示帮助

例子
  pnpm create rinova-playground my-lib
  pnpm create rinova-playground my-lib --no-install
`

const parseArgs = (argv: string[]): CliOptions | 'help' => {
  const args = argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) return 'help'

  const packagesIndex = args.indexOf('--packages')
  const packagesDir = packagesIndex > -1 ? (args[packagesIndex + 1] ?? '') : ''
  const rest = packagesIndex > -1 ? args.filter((_, index) => index !== packagesIndex && index !== packagesIndex + 1) : args

  const positional = rest.filter((arg) => !arg.startsWith('-'))
  const projectName = positional[0] ?? ''
  const safeName = projectName.replace(/[^\w.-]/g, '-').toLowerCase()

  return {
    targetDir: path.resolve(process.cwd(), projectName || safeName || 'rinova-playground-app'),
    projectName: projectName || safeName || 'rinova-playground-app',
    install: !args.includes('--no-install'),
    force: args.includes('--force'),
    packagesDir: packagesDir ? path.resolve(packagesDir) : '',
  }
}

const toPosix = (value: string): string => value.split(path.sep).join('/')

const copyTemplate = async (from: string, to: string, projectName: string, packagesDir: string): Promise<string[]> => {
  const written: string[] = []
  const entries = await fsp.readdir(from, { withFileTypes: true })

  for (const entry of entries) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await fsp.mkdir(target, { recursive: true })
      written.push(...(await copyTemplate(source, target, projectName, packagesDir)))
      continue
    }

    let content = await fsp.readFile(source, 'utf8')
    content = content.replaceAll('{{projectName}}', projectName)

    if (packagesDir && entry.name === 'package.json') {
      content = content
        .replaceAll('"@rinova/playground": "latest"', `"@rinova/playground": "file:${toPosix(path.join(packagesDir, 'playground'))}"`)
        .replaceAll(
          '"@rinova/playground-vite": "latest"',
          `"@rinova/playground-vite": "file:${toPosix(path.join(packagesDir, 'playground-vite'))}"`
        )
    }

    const outputName = entry.name === '_gitignore' ? '.gitignore' : entry.name
    await fsp.writeFile(path.join(to, outputName), content, 'utf8')
    written.push(toPosix(path.relative(process.cwd(), path.join(to, outputName))))
  }

  return written
}

const runInstall = (cwd: string): Promise<number> =>
  new Promise((resolve) => {
    const child = spawn('pnpm', ['install'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })

const isEmptyDir = async (dir: string): Promise<boolean> => {
  if (!fs.existsSync(dir)) return true
  const entries = await fsp.readdir(dir)
  return entries.every((name) => name.startsWith('.') || name === 'node_modules')
}

const main = async (): Promise<void> => {
  const parsed = parseArgs(process.argv)
  if (parsed === 'help') {
    console.log(HELP.trim())
    return
  }

  let { projectName } = parsed
  if (!projectName) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    projectName = (await rl.question('项目名：')).trim() || 'rinova-playground-app'
    rl.close()
    parsed.projectName = projectName
    parsed.targetDir = path.resolve(process.cwd(), projectName)
  }

  const targetDir = parsed.targetDir
  if (!parsed.force && !(await isEmptyDir(targetDir))) {
    console.error(`\n目标目录非空：${targetDir}\n加 --force 覆盖，或换一个目录。`)
    process.exitCode = 1
    return
  }

  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`\n找不到模板目录：${TEMPLATE_DIR}\n请先执行 pnpm build:create 重新构建脚手架。`)
    process.exitCode = 1
    return
  }

  await fsp.mkdir(targetDir, { recursive: true })
  const written = await copyTemplate(TEMPLATE_DIR, targetDir, parsed.projectName, parsed.packagesDir)

  console.log(`\n已创建 ${written.length} 个文件：${targetDir}\n`)
  for (const file of written.slice(0, 8)) console.log(`  ${file}`)
  if (written.length > 8) console.log(`  … 另外 ${written.length - 8} 个`)

  if (parsed.install) {
    console.log('\n安装依赖（pnpm install）…\n')
    const code = await runInstall(targetDir)
    if (code !== 0) {
      console.error('\n依赖安装失败，请进入目录手动执行 pnpm install。')
      process.exitCode = code
      return
    }
  }

  console.log(`
下一步：

  cd ${path.relative(process.cwd(), targetDir) || '.'}
  ${parsed.install ? '' : 'pnpm install\n  '}pnpm dev

然后在浏览器打开 http://localhost:5273
`)
}

await main()
