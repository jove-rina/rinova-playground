/**
 * AI 写作闭环验收（0.7）：写一个场景 → 清单热更新认到 → 校验通过 → 写坏场景 → 被规则拦下 → 清理。
 *
 *   pnpm verify:loop        # 需要 examples/minimal-lib 的 dev server 在 5273 跑着
 *
 * 这个脚本会真的往测试床写文件再删掉，只在本地/CI 跑测试时用。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { validateScenes } from '../packages/playground-mcp/src/validate.ts'
import type { ValidateManifest } from '../packages/playground-mcp/src/validate.ts'

const project = path.resolve('examples/minimal-lib')
const manifestFile = path.join(project, '.playground/manifest.json')
const goodFile = 'src/scenes/button/button/__loop_check.vue'
const badFile = 'src/scenes/button/button/__loop_bad.vue'

type ManifestShape = ValidateManifest & { scenes: Array<{ id: string; title: string; rel: string }> }

const readManifest = (): ManifestShape => JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as ManifestShape
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const waitForScene = async (id: string, timeout = 8000): Promise<{ hit: boolean; took: number }> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (readManifest().scenes.some((scene) => scene.id === id)) return { hit: true, took: Date.now() - startedAt }
    await wait(200)
  }
  return { hit: false, took: Date.now() - startedAt }
}

const goodScene = [
  '<script setup lang="ts">',
  "import { useSceneArgs } from '@rinova/playground'",
  "import MyButton from '../../../lib/MyButton.vue'",
  '',
  "const args = useSceneArgs({ size: 'sm' as 'md' | 'sm' | 'lg' })",
  '</script>',
  '',
  '<script lang="ts">',
  'export const sceneMeta = {',
  "  title: '闭环检查',",
  "  section: 'props',",
  "  api: ['size'],",
  '}',
  '</script>',
  '',
  '<template>',
  '  <div class="demo">',
  '    <MyButton :size="args.size">闭环</MyButton>',
  '  </div>',
  '</template>',
  '',
  '<style scoped lang="less">',
  '.demo {',
  '  display: flex;',
  '  gap: 8px;',
  '}',
  '</style>',
  '',
].join('\n')

const badScene = [
  '<script setup lang="ts">',
  'const payload = useScenePayload({})',
  '</script>',
  '',
  '<script lang="ts">',
  'export const sceneMeta = { title: \'坏场景\', tittle: \'拼错\', payload }',
  '</script>',
  '',
  '<template><div /></template>',
  '',
  '<style>',
  'html { color: red; }',
  '</style>',
  '',
].join('\n')

const checks: { name: string; pass: boolean; detail: string }[] = []
const check = (name: string, pass: boolean, detail: string): void => {
  checks.push({ name, pass, detail })
}

const run = async (): Promise<void> => {
  if (!fs.existsSync(manifestFile)) {
    console.error('找不到 .playground/manifest.json：先把 examples/minimal-lib 的 dev server 跑起来')
    process.exitCode = 1
    return
  }

  const before = readManifest().scenes.length

  fs.writeFileSync(path.join(project, goodFile), goodScene)
  const added = await waitForScene('button/button/__loop_check')
  const after = readManifest()
  check(
    '写入场景后清单自动刷新',
    added.hit && after.scenes.length === before + 1,
    `${before} → ${after.scenes.length} 个场景，耗时 ${added.took}ms`
  )

  const goodIssues = validateScenes(project, after, goodFile)
  check(
    '新场景校验通过',
    goodIssues.length === 0,
    goodIssues.length ? goodIssues.map((issue) => `${issue.rule}:${issue.message}`).join('；') : '0 个问题'
  )

  fs.writeFileSync(path.join(project, badFile), badScene)
  await waitForScene('button/button/__loop_bad')
  const withBad = readManifest()
  const badIssues = validateScenes(project, withBad, badFile)
  const badRules = new Set(badIssues.map((issue) => issue.rule))
  const expectedRules = ['style-scoped', 'style-global', 'deprecated-api', 'scene-meta-field']
  check(
    '坏场景被规则拦下',
    expectedRules.every((rule) => badRules.has(rule)),
    [...badRules].join(', ')
  )

  fs.unlinkSync(path.join(project, badFile))
  fs.unlinkSync(path.join(project, goodFile))
  await wait(1200)
  const restored = readManifest().scenes.length
  check('删除后清单回到原状', restored === before, `${restored} 个场景`)

  for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name} — ${item.detail}`)
  const failed = checks.filter((item) => !item.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} 通过`)
  if (failed) process.exitCode = 1
}

await run()
