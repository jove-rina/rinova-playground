/**
 * MCP server 冒烟测试：走真实 stdio JSON-RPC，验证四个工具都能回数据。
 * 用法：node --experimental-strip-types scripts/probe-mcp.ts [项目目录]
 */
import { spawn } from 'node:child_process'
import * as path from 'node:path'

interface JsonRpcResult {
  [key: string]: unknown
}

const project = path.resolve(process.argv[2] ?? 'examples/minimal-lib')
const bin = path.resolve('packages/playground-mcp/dist/index.js')

const child = spawn('node', [bin, '--project', project], { stdio: ['pipe', 'pipe', 'pipe'] })

let buffer = ''
let nextId = 0
const pending = new Map<number, { resolve: (value: JsonRpcResult) => void; reject: (error: Error) => void }>()

const request = (method: string, params: unknown): Promise<JsonRpcResult> => {
  const id = ++nextId
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  return new Promise<JsonRpcResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => reject(new Error(`超时：${method}`)), 15000)
  })
}

const notify = (method: string, params: unknown): void => {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
}

child.stdout.on('data', (chunk: Buffer) => {
  buffer += chunk.toString()
  let index: number
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim()
    buffer = buffer.slice(index + 1)
    if (!line) continue
    const message = JSON.parse(line) as { id?: number; result?: JsonRpcResult; error?: unknown }
    const waiter = message.id ? pending.get(message.id) : undefined
    if (waiter && message.id) {
      pending.delete(message.id)
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)))
      else waiter.resolve(message.result ?? {})
    }
  }
})

const textOf = (result: JsonRpcResult): string => {
  const content = (result.content ?? []) as { text?: string }[]
  return content.map((item) => item.text ?? '').join('\n')
}

const call = async (name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean }> => {
  const result = await request('tools/call', { name, arguments: args })
  return { text: textOf(result), isError: Boolean(result.isError) }
}

const checks: { name: string; pass: boolean; detail: string }[] = []
const check = (name: string, pass: boolean, detail: string): void => {
  checks.push({ name, pass, detail })
}

const run = async (): Promise<void> => {
  const init = await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'probe', version: '0.0.0' },
  })
  notify('notifications/initialized', {})
  check('initialize 握手', Boolean((init.serverInfo as { name?: string } | undefined)?.name), JSON.stringify(init.serverInfo))

  const tools = await request('tools/list', {})
  const names = ((tools.tools ?? []) as { name: string }[]).map((tool) => tool.name)
  check(
    'tools/list 暴露四个工具',
    ['capability_search', 'capability_get', 'scenario_list', 'coverage_report'].every((name) => names.includes(name)),
    names.join(', ')
  )

  const search = await call('capability_search', { query: 'button' })
  check('capability_search 命中组件', search.text.includes('MyButton'), search.text.split('\n')[0] ?? '')

  const get = await call('capability_get', { component: 'MyButton' })
  check(
    'capability_get 含 props 与行号锚点',
    get.text.includes('size') && /MyButton\.vue:\d+/.test(get.text),
    (get.text.match(/MyButton\.vue:\d+/) ?? [''])[0]
  )

  const input = await call('capability_get', { component: 'MyInput' })
  check(
    'capability_get 输出事件参数与说明',
    input.text.includes('## Events') && input.text.includes('FocusEvent') && input.text.includes('## Slots'),
    (input.text.match(/## Events[\s\S]{0,60}/) ?? [''])[0].replace(/\n/g, ' ')
  )

  const scenes = await call('scenario_list', { component: 'MyButton' })
  check('scenario_list 返回场景', scenes.text.includes('src/scenes/'), scenes.text.split('\n').length + ' 行')

  const table = await call('capability_get', { component: 'MyTable' })
  check(
    'capability_get 输出具名类型定义',
    table.text.includes('## Types') && table.text.includes('interface TableColumn') && table.text.includes('TableConfig'),
    (table.text.match(/## Types[\s\S]{0,60}/) ?? [''])[0].replace(/\n/g, ' ')
  )

  const coverage = await call('coverage_report', {})
  check('coverage_report 指出未覆盖 prop', /覆盖 \d+\/\d+/.test(coverage.text), coverage.text.split('\n')[0] ?? '')

  const missing = await call('capability_get', { component: 'NotExist' })
  check('未知组件返回 isError', missing.isError, missing.text.split('\n')[0] ?? '')

  child.kill()

  for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name} — ${item.detail}`)
  const failed = checks.filter((item) => !item.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} 通过`)
  if (failed) process.exitCode = 1
}

run().catch((error: Error) => {
  console.error('FAILED:', error.message)
  child.kill()
  process.exitCode = 1
})
