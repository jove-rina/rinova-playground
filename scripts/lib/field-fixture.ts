/**
 * 字段展开规则夹具（verify 与 verify:fields 共用）。
 *
 * 夹具在 examples/minimal-lib/fixtures/fields：一个本项目声明的 40 字段对象、
 * 一个外部包类型（vue → csstype 的 CSSProperties）、一个标量。
 *
 * 三条规则各自对应一条断言：
 *   1. 外部包声明的字段不展开（否则一份清单能被撑到几 MB）
 *   2. 本项目声明最多 32 个字段，超出标 fieldsTruncated + 真实 fieldCount
 *   3. 字段说明剥掉浏览器支持表格 / Baseline 段落，并截到 160 字
 */
import * as path from 'node:path'
import { buildManifest } from '../../packages/playground-vite/dist/manifest.js'
import type { ManifestComponent, ManifestEnv } from '../../packages/playground-vite/dist/manifest.js'

export interface FieldFixtureCheck {
  name: string
  ok: boolean
  detail: string
}

const FIXTURE = 'examples/minimal-lib/fixtures/fields'
const MAX_FIELDS = 32
const MAX_DESCRIPTION = 160

const fixtureEnv: ManifestEnv = {
  title: 'fields-fixture',
  sceneRoot: 'components',
  routeBase: '/',
  groups: [],
  globals: {},
  plugins: [],
  theme: { ui: 'auto', stage: 'light' },
  sources: true,
  components: { configured: true, count: 1 },
  modules: { configured: false, count: 0 },
  pages: []
}

export const runFieldFixtureChecks = (cwd = process.cwd()): FieldFixtureCheck[] => {
  const root = path.join(cwd, FIXTURE)
  const manifest = buildManifest({
    root,
    patterns: ['components/**/*.vue'],
    tsconfig: 'tsconfig.json',
    modules: [],
    env: fixtureEnv,
    scenes: []
  })

  const component = manifest.components[0] as ManifestComponent | undefined
  const propOf = (name: string) => component?.props.find((prop) => prop.name === name)
  const results: FieldFixtureCheck[] = []
  const check = (name: string, ok: boolean, detail = ''): void => {
    results.push({ name, ok, detail })
  }

  check('夹具组件被扫描到', component?.name === 'FieldCard', `${manifest.components.length} 个组件`)

  const layout = propOf('layout')
  check(
    '本项目声明的对象：字段按 32 截断，并标出真实数量',
    (layout?.fields?.length ?? 0) === MAX_FIELDS &&
      layout?.fieldCount === 40 &&
      layout?.fieldsTruncated === true,
    `fields=${layout?.fields?.length ?? 0} / fieldCount=${layout?.fieldCount ?? 0} / truncated=${layout?.fieldsTruncated ?? false}`
  )

  const customStyle = propOf('customStyle')
  check(
    '外部包类型（vue → csstype）：字段不展开，类型名保留',
    !customStyle?.fields?.length && String(customStyle?.type ?? '').includes('CSSProperties'),
    `fields=${customStyle?.fields?.length ?? 0} / type=${customStyle?.type ?? '缺失'}`
  )

  check('标量 prop 不产生字段', !propOf('label')?.fields?.length, `fields=${propOf('label')?.fields?.length ?? 0}`)

  const width = layout?.fields?.[0]
  const description = width?.description ?? ''
  check(
    '字段说明剥掉浏览器支持表格 / Baseline 段落并截断到 160 字',
    Boolean(width) &&
      !description.includes('|') &&
      !/Baseline/i.test(description) &&
      description.length <= MAX_DESCRIPTION + 1 &&
      description.endsWith('…'),
    `${description.length} 字：${description.slice(0, 24)}…`
  )

  const longest = (layout?.fields ?? []).reduce((max, field) => Math.max(max, field.description.length), 0)
  check('所有字段说明都不超过 160 字', longest <= MAX_DESCRIPTION + 1, `最长 ${longest} 字`)

  return results
}
