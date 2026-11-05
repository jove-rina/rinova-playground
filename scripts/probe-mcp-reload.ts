/**
 * MCP 清单热重读验收：清单被重写（dev server 重算）后，正在跑的 MCP 会话应该在下一次工具调用时读到新内容。
 *
 *   pnpm verify:mcp:reload     # 需要 examples/minimal-lib/.playground/manifest.json
 *
 * 做法：往清单里临时注入一条场景 → 调 scenario_list 断言出现 → 恢复清单 → 断言消失。
 * 只动 `.playground/manifest.json`（构建产物），不碰源码。
 */
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const project = path.resolve('examples/minimal-lib')
const manifestFile = path.join(project, '.playground/manifest.json')
const injectedId = 'loop/inject/reloaded'

if (!fs.existsSync(manifestFile)) {
  console.error('找不到 .playground/manifest.json：先跑一次 examples/minimal-lib 的 pnpm dev / build')
  process.exit(1)
}

const original = fs.readFileSync(manifestFile, 'utf8')
const child = spawn('node', [path.resolve('packages/playground-mcp/dist/index.js')], {
  cwd: project,
  stdio: ['pipe', 'pipe', 'pipe'],
})

let buffer = ''
let nextId = 0
const pending = new Map<number, (value: any) => void>()
child.stdout.on('data', (chunk: Buffer) => {
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
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

const listScenes = async (): Promise<string> => {
  const result = await request('tools/call', { name: 'scenario_list', arguments: {} })
  return ((result.content ?? []) as { text: string }[]).map((item) => item.text).join('\n')
}

const writeInjected = (): void => {
  const data = JSON.parse(original)
  data.scenes.push({
    id: injectedId,
    title: '注入的场景',
    group: 'Loop',
    lang: 'vue',
    rel: 'src/scenes/loop/inject/reloaded.vue',
    sources: [],
  })
  fs.writeFileSync(manifestFile, `${JSON.stringify(data, null, 2)}\n`)
}

const checks: { name: string; pass: boolean; detail: string }[] = []
const check = (name: string, pass: boolean, detail: string): void => {
  checks.push({ name, pass, detail })
}

const run = async (): Promise<void> => {
  await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'reload', version: '0' } })
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`)

  const before = await listScenes()
  check('启动时读到原始清单', !before.includes(injectedId), `${before.split('\n').length} 行`)

  try {
    writeInjected()
    await new Promise((resolve) => setTimeout(resolve, 250))
    const after = await listScenes()
    check('清单重写后下一次调用就能读到', after.includes(injectedId), `${before.split('\n').length} → ${after.split('\n').length} 行`)

    const again = await listScenes()
    check('清单没再变时结果稳定', again.split('\n').length === after.split('\n').length, `${again.split('\n').length} 行`)
  } finally {
    fs.writeFileSync(manifestFile, original)
  }

  await new Promise((resolve) => setTimeout(resolve, 250))
  const restored = await listScenes()
  check('恢复清单后不再出现注入项', !restored.includes(injectedId), `${restored.split('\n').length} 行`)

  child.kill()
  for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name} — ${item.detail}`)
  const failed = checks.filter((item) => !item.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} 通过`)
  if (failed) process.exitCode = 1
}

run().catch((error: Error) => {
  fs.writeFileSync(manifestFile, original)
  child.kill()
  console.error('FAILED:', error.message)
  process.exit(1)
})
