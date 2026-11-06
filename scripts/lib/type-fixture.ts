/**
 * 类型提取夹具（verify 与 verify:types 共用）。
 *
 * 夹具在 examples/minimal-lib/fixtures/types：必须是能解析到 `vue` 的项目，
 * 放在 scripts/ 下会因解析不到 vue 而拿到 0 props（踩过）。
 */
import * as path from 'node:path'
import { buildManifest } from '../../packages/playground-vite/dist/manifest.js'
import type { ManifestComponent, ManifestEnv } from '../../packages/playground-vite/dist/manifest.js'

export interface TypeFixtureCheck {
  name: string
  ok: boolean
  detail: string
}

const FIXTURE = 'examples/minimal-lib/fixtures/types'

/** 契约提取只需要 env 透传，不影响 types；给一份最小的合法值 */
const fixtureEnv: ManifestEnv = {
  title: 'types-fixture',
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

export const runTypeFixtureChecks = (cwd = process.cwd()): TypeFixtureCheck[] => {
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
  const types = component?.types ?? []
  const typeNames = types.map((item) => item.name)
  const kindOf = (name: string): string => types.find((item) => item.name === name)?.kind ?? ''
  const valuesOf = (name: string): string[] =>
    component?.props.find((prop) => prop.name === name)?.values ?? []
  const codeOf = (name: string): string => types.find((item) => item.name === name)?.code ?? ''

  const results: TypeFixtureCheck[] = []
  const check = (name: string, ok: boolean, detail = ''): void => {
    results.push({ name, ok, detail })
  }

  check(
    '组件被扫描到',
    manifest.components.length === 1 && component?.name === 'TagList',
    `${manifest.components.length} 个`
  )

  check(
    '字面量联合别名进 types（kind=type）',
    typeNames.includes('TagTone') && kindOf('TagTone') === 'type' && codeOf('TagTone').includes("'neutral'"),
    typeNames.join('、')
  )

  check(
    'enum 进 types（kind=enum，原文含成员）',
    typeNames.includes('TagSize') && kindOf('TagSize') === 'enum' && codeOf('TagSize').includes('Sm'),
    kindOf('TagSize')
  )

  check(
    '接口与交叉类型里的具名类型都收集到',
    typeNames.includes('TagItem') && typeNames.includes('TagExtra') && kindOf('TagItem') === 'interface',
    typeNames.join('、')
  )

  check(
    '外部包类型不进 types（Event）',
    !typeNames.includes('Event') && !typeNames.includes('TagExtraEvent'),
    typeNames.join('、')
  )

  check(
    '字面量联合别名 → values',
    JSON.stringify(valuesOf('tone')) === JSON.stringify(['neutral', 'success', 'danger']),
    JSON.stringify(valuesOf('tone'))
  )

  check(
    'enum → values（成员名）',
    JSON.stringify(valuesOf('size')) === JSON.stringify(['Sm', 'Md']),
    JSON.stringify(valuesOf('size'))
  )

  check(
    '内联字面量联合 → values（不造 types 条目）',
    JSON.stringify(valuesOf('align')) === JSON.stringify(['left', 'right']),
    JSON.stringify(valuesOf('align'))
  )

  check('对象数组 prop 不出 values（items）', valuesOf('items').length === 0, JSON.stringify(valuesOf('items')))

  check(
    '事件参数里的具名类型被收集（select → TagItem）',
    (component?.events ?? []).some(
      (event) => event.name === 'select' && (event.fields ?? []).some((field) => field.name === 'label')
    ),
    JSON.stringify((component?.events ?? []).map((event) => event.name))
  )

  check(
    '每个类型的来源文件都在项目内',
    types.every((item) => item.file.startsWith('components/') && !item.file.includes('node_modules')),
    types.map((item) => item.file).join('、')
  )

  return results
}
