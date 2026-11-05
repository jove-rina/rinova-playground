/** 0.7.1 边界行为测试：找不到清单 / --project / --manifest / 清单写坏 */
import { spawn, spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const root = process.cwd()
const bin = path.resolve('packages/playground-mcp/dist/index.js')
const project = path.resolve('examples/minimal-lib')
const manifestFile = path.join(project, '.playground/manifest.json')

const checks: { name: string; pass: boolean; detail: string }[] = []
const check = (name: string, pass: boolean, detail: string): void => {
  checks.push({ name, pass, detail })
}

/* 1. 找不到清单：清晰报错 + 退出码 1 */
const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rp-empty-'))
const noManifest = spawnSync('node', [bin], { cwd: emptyDir, encoding: 'utf8', timeout: 20000 })
check(
  '找不到清单时退出码 1 并给出生成方式',
  noManifest.status === 1 && /找不到契约清单/.test(noManifest.stderr) && /pnpm dev/.test(noManifest.stderr),
  (noManifest.stderr.split('\n')[0] ?? '').slice(0, 80)
)

/* 2. --project 显式指定（在仓库根跑，根目录没有清单） */
const withProject = spawnSync('node', [bin, '--project', project], { cwd: root, encoding: 'utf8', timeout: 20000 })
check(
  '--project 显式指定可用',
  /已启动/.test(withProject.stderr) && withProject.status === 0,
  (withProject.stderr.split('\n').filter(Boolean).slice(-1)[0] ?? '').slice(0, 90)
)

/* 3. --manifest 直接指定清单文件（在无关目录跑） */
const withManifest = spawnSync('node', [bin, '--manifest', manifestFile], { cwd: emptyDir, encoding: 'utf8', timeout: 20000 })
check(
  '--manifest 直接指定可用',
  /已启动/.test(withManifest.stderr) && withManifest.status === 0,
  (withManifest.stderr.split('\n').filter(Boolean).slice(-1)[0] ?? '').slice(0, 90)
)

/* 4. --help 不启动服务、打印用法 */
const help = spawnSync('node', [bin, '--help'], { encoding: 'utf8', timeout: 20000 })
check(
  '--help 打印用法并退出 0',
  help.status === 0 && /用法：/.test(help.stdout) && /--project/.test(help.stdout),
  (help.stdout.split('\n')[0] ?? '').slice(0, 60)
)

/* 5. 清单被写坏（半截 JSON）时，工具调用沿用上一次的数据、不崩 */
const original = fs.readFileSync(manifestFile, 'utf8')
const server = spawn('node', [bin], { cwd: project, stdio: ['pipe', 'pipe', 'pipe'] })
let buffer = ''
let nextId = 0
const pending = new Map<number, (value: any) => void>()
server.stdout.on('data', (chunk: Buffer) => {
  buffer += chunk.toString()
  let index: number
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim()
    buffer = buffer.slice(index + 1)
    if (!line) continue
    const message = JSON.parse(line) as { id?: number; result?: unknown }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)?.(message.result)
      pending.delete(message.id)
    }
  }
})
const request = (method: string, params: unknown): Promise<any> =>
  new Promise((resolve) => {
    const id = ++nextId
    pending.set(id, resolve)
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

const listScenes = async (): Promise<string> => {
  const result = await request('tools/call', { name: 'scenario_list', arguments: {} })
  return ((result.content ?? []) as { text: string }[]).map((item) => item.text).join('\n')
}

const run = async (): Promise<void> => {
  await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'edge', version: '0' } })
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`)
  const before = await listScenes()

  fs.writeFileSync(manifestFile, '{"generatedAt": "broken"')
  await new Promise((resolve) => setTimeout(resolve, 250))
  const during = await listScenes().catch((error: Error) => `ERROR: ${error.message}`)
  fs.writeFileSync(manifestFile, original)
  await new Promise((resolve) => setTimeout(resolve, 250))
  const after = await listScenes()

  check(
    '清单写坏时沿用上一次数据、不崩溃',
    during.split('\n').length === before.split('\n').length,
    `${before.split('\n').length} → ${during.split('\n').length} → ${after.split('\n').length} 行`
  )
  server.kill()
  fs.rmSync(emptyDir, { recursive: true, force: true })

  for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name} — ${item.detail}`)
  const failed = checks.filter((item) => !item.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} 通过`)
  if (failed) process.exitCode = 1
}

run().catch((error: Error) => {
  fs.writeFileSync(manifestFile, original)
  server.kill()
  console.error('FAILED:', error.message)
  process.exit(1)
})
