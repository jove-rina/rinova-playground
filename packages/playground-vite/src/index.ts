import fs from 'node:fs'
import path from 'node:path'
import { createJiti } from 'jiti'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { buildManifest, syncComponentFile, writeManifest } from './manifest.js'
import type { ManifestEnv, ManifestPage } from './manifest.js'
import { buildModules } from './module-api.js'
import { resolvePluginSpecifier } from './plugin-spec.js'
import { compareScenes, isSection } from './scene-order.js'
import type { SceneSection } from './scene-order.js'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_CONFIG = 'virtual:playground/config'
const VIRTUAL_SCENES = 'virtual:playground/scenes'
const VIRTUAL_API = 'virtual:playground/api'
const VIRTUAL_PLUGINS = 'virtual:playground/plugins'

const RESOLVED_ID: Record<string, string> = {
  [VIRTUAL_CONFIG]: `\0${VIRTUAL_CONFIG}`,
  [VIRTUAL_SCENES]: `\0${VIRTUAL_SCENES}`,
  [VIRTUAL_API]: `\0${VIRTUAL_API}`,
  [VIRTUAL_PLUGINS]: `\0${VIRTUAL_PLUGINS}`,
}

const CONFIG_FILES = [
  'playground.config.ts',
  'playground.config.mts',
  'playground.config.js',
  'playground.config.mjs',
]

const PAGE_META_FILES = ['meta.ts', 'meta.mts', 'meta.js', 'meta.mjs']

const DEFAULT_SCENES_DIR = 'src/scenes'

/**
 * 页内索引的分组顺序，空组不展示。
 * 排序规则（分组 → order → id）在 `scene-order.ts`，插件与 verify 共用一份。
 */
export { SECTION_ORDER, isSection, orderScenes, sceneSectionRank } from './scene-order.js'
export type { SceneSection } from './scene-order.js'

export interface PlaygroundPluginOptions {
  /** 指定配置文件路径，默认在项目根查找 playground.config.{ts,mts,js,mjs} */
  configFile?: string
  /** 覆盖配置里的 scenes 目录 */
  scenes?: string
}

interface SceneMeta {
  title?: string
  order?: number
  tags?: string[]
  description?: string
  hideInNav?: boolean
  files?: string[]
  section?: SceneSection
  api?: string[]
  /** 是否展示源码；覆盖 page 与全局配置 */
  showSource?: boolean
}

interface PageMeta {
  title?: string
  description?: string
  order?: number
  /** 这一页演示哪个组件（用于生成 API 表）；不写则按页目录名自动匹配 */
  component?: string
  /** 这一页展示哪个非组件模块（`config.modules` 里的文件名）；不写则按页目录名匹配 */
  module?: string
  /** API 补充说明，键格式 `events:press` */
  apiNotes?: Record<string, string>
  /** 这一页是否展示源码；不写则跟随全局 sources（Markdown 场景默认不展示） */
  showSource?: boolean
  /** 这一页是文档页：不套演示画布，内容直接铺在页面上（Markdown 场景自动为 true） */
  doc?: boolean
}

interface SceneSource {
  rel: string
  url: string
}

interface SceneEntry {
  /** `group/page/scene` */
  id: string
  /** 场景文件名，页内锚点 */
  name: string
  title: string
  section: SceneSection
  api?: string[]
  /** 分组显示名 */
  group: string
  groupDir: string
  /** `groupDir/pageDir` */
  pageId: string
  /** 页标题 */
  page: string
  /** 相对项目根的 URL，用于动态 import */
  url: string
  /** 绝对文件路径 */
  file: string
  /** 相对项目根的路径，如 `src/scenes/button/button/basic.vue` */
  rel: string
  order: number
  tags?: string[]
  description?: string
  /** sceneMeta.hideInNav：不进侧栏但可直接访问 */
  hidden?: boolean
  /** 源码面板的文件列表（场景自身 + sceneMeta.files） */
  sources: SceneSource[]
  /** 场景文件类型 */
  lang: 'vue' | 'md'
  /** 是否展示源码卡片（场景 > 页 > 全局 合并后的结果） */
  showSource: boolean
  /** 文档场景：不套演示画布 */
  doc: boolean
}

interface PageEntry {
  /** `groupDir/pageDir` */
  id: string
  group: string
  groupDir: string
  /** 分组排序权重：`config.groups` 的键索引，未登记的组为 MAX_SAFE_INTEGER */
  groupOrder: number
  /** 父组件页 id（二级组件才有），如 `card/card` */
  parentId?: string
  /** 1 = 组件页，2 = 子组件页 */
  depth: 1 | 2
  title: string
  description?: string
  /** 组内排序权重（pageMeta.order），缺省 MAX_SAFE_INTEGER */
  order: number
  /** 页绑定的组件名（pageMeta.component） */
  component?: string
  /** 页绑定的模块名（pageMeta.module） */
  module?: string
  /** API 补充说明 */
  apiNotes?: Record<string, string>
  /** 页级源码开关（pageMeta.showSource） */
  showSource?: boolean
  /** 页级文档模式（pageMeta.doc） */
  doc?: boolean
}

interface PlaygroundUserConfig {
  title?: string
  scenes?: string
  base?: string
  port?: number
  /** 契约清单要扫描的组件 glob（如 src/components 下所有 .vue）；不配则不生成 manifest */
  components?: string[]
  /** 非组件模块 glob（如 src/lib/**\/*.ts）—— 抽函数 / hooks / 常量的契约 */
  modules?: unknown
  /** 组件提取用的 tsconfig，默认项目根的 tsconfig.json */
  tsconfig?: string
  /** 分组目录名 → 侧栏显示名 */
  groups?: Record<string, string>
  /** 运行时插件模块路径 */
  plugins?: unknown
  /** 供场景读取的纯常量 */
  globals?: Record<string, unknown>
  /** 本地 IDE 打开：{ preset: 'vscode' | 'cursor' | 'webstorm', custom?: string } */
  editor?: { preset?: string; custom?: string; exposeRoot?: boolean }
  [key: string]: unknown
}

/** `size-large` → `Size Large`；含中文时原样返回 */
const titleize = (name: string): string => {
  if (/[\u3400-\u9fff]/.test(name)) return name
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const toPosix = (value: string): string => value.split(path.sep).join('/')

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** `---` 头：`key: value` / `key: [a, b]`。只用于 Markdown 场景，标题排序标签够用 */
const parseFrontmatter = (source: string): Record<string, string | string[]> => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return {}
  const data: Record<string, string | string[]> = {}
  for (const raw of (match[1] ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf(':')
    if (index < 1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (!key) continue
    data[key] = /^\[.*\]$/.test(value)
      ? value
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      : value.replace(/^['"]|['"]$/g, '')
  }
  return data
}

/**
 * rinova-playground 的 Vite 插件。
 *
 * 目录约定（必须三层）：`scenes/<分组>/<组件页>/<场景>.vue`
 *
 * ```ts
 * import { playground } from '@rinova/playground-vite'
 * export default defineConfig({ plugins: [vue(), playground()] })
 * ```
 */
export const playground = (options: PlaygroundPluginOptions = {}): Plugin => {
  let root = process.cwd()
  let config: PlaygroundUserConfig = {}
  let resolved = false
  let scenesDir = ''
  let scenes: SceneEntry[] = []
  let pages: PageEntry[] = []
  let configFile = ''
  let isBuild = false
  let outDir = 'dist'
  let devServer: ViteDevServer | null = null

  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })

  const findConfigFile = (): string => {
    if (options.configFile) return path.resolve(root, options.configFile)
    for (const name of CONFIG_FILES) {
      const file = path.join(root, name)
      if (fs.existsSync(file)) return file
    }
    return ''
  }

  const listDirs = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
      .map((entry) => entry.name)
      .sort()

  /** 场景文件：`.vue` 手写场景，或 `.md`（Markdown 内容页） */
  const listScenes = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          (entry.name.endsWith('.vue') || entry.name.endsWith('.md')) &&
          !entry.name.startsWith('.')
      )
      .map((entry) => entry.name)
      .sort()

  /** 执行场景 `<script>` 块里的 `export const sceneMeta`，只取可序列化的字段 */
  const readSceneMeta = async (file: string): Promise<SceneMeta> => {
    let source = ''
    try {
      source = fs.readFileSync(file, 'utf8')
    } catch {
      return {}
    }

    // Markdown 场景：标题 / 排序 / 标签写在 `---` 头里
    if (file.endsWith('.md')) {
      const data = parseFrontmatter(source)
      const tags = data.tags
      const api = data.api
      return {
        title: typeof data.title === 'string' ? data.title : undefined,
        order: data.order !== undefined && Number.isFinite(Number(data.order)) ? Number(data.order) : undefined,
        tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((item) => item.trim()).filter(Boolean) : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        hideInNav: data.hideInNav === 'true' ? true : undefined,
        section: isSection(data.section) ? data.section : undefined,
        api: Array.isArray(api) ? api : typeof api === 'string' ? api.split(',').map((item) => item.trim()).filter(Boolean) : undefined,
        showSource: data.showSource === 'false' ? false : data.showSource === 'true' ? true : undefined,
      }
    }

    const { descriptor } = parseSfc(source, { filename: file })
    const block = descriptor.script?.content
    if (!block || !block.includes('sceneMeta')) return {}

    try {
      const mod = (await jiti.evalModule(block, { filename: file, async: true })) as {
        sceneMeta?: SceneMeta
      }
      const meta = mod?.sceneMeta ?? {}
      return {
        title: typeof meta.title === 'string' ? meta.title : undefined,
        order: typeof meta.order === 'number' ? meta.order : undefined,
        tags: Array.isArray(meta.tags) ? meta.tags.map(String) : undefined,
        description: typeof meta.description === 'string' ? meta.description : undefined,
        hideInNav: meta.hideInNav === true ? true : undefined,
        files: Array.isArray(meta.files) ? meta.files.map(String) : undefined,
        section: isSection(meta.section) ? meta.section : undefined,
        api: Array.isArray(meta.api) ? meta.api.map(String).filter(Boolean) : undefined,
        // 场景级源码开关：.md 走 frontmatter，.vue 走 sceneMeta，两边要保持一致
        showSource: typeof meta.showSource === 'boolean' ? meta.showSource : undefined,
      }
    } catch (error) {
      console.warn(
        `[rinova-playground] ${toPosix(path.relative(root, file))} 的 sceneMeta 解析失败，回退文件名：`,
        error instanceof Error ? error.message : error
      )
      return {}
    }
  }

  /**
   * 场景样式约束：`<style>` 必须带 scoped，且不许命中 :root / html / body。
   * 不做沙箱（不引 iframe / Shadow DOM），靠这条把最容易串味的写法挡在门口。
   */
  const checkSceneStyle = (file: string): void => {
    let source = ''
    try {
      source = fs.readFileSync(file, 'utf8')
    } catch {
      return
    }
    const relPath = toPosix(path.relative(root, file))
    const { descriptor } = parseSfc(source, { filename: file })
    for (const block of descriptor.styles) {
      if (!block.scoped) {
        console.warn(`[rinova-playground] ${relPath} 的 <style> 没有 scoped，样式会污染其它场景`)
      }
      if (/(^|[},]\s*)(:root|html|body)\b/.test(block.content)) {
        console.warn(`[rinova-playground] ${relPath} 的样式命中了 :root / html / body，会影响整个页面`)
      }
    }
  }

  /** 页级 meta（可选）：`<页>/meta.ts` 导出 `pageMeta` */
  const readPageMeta = async (dir: string): Promise<PageMeta> => {
    for (const name of PAGE_META_FILES) {
      const file = path.join(dir, name)
      if (!fs.existsSync(file)) continue
      try {
        const mod = (await jiti.import(file)) as { pageMeta?: PageMeta }
        const meta = mod?.pageMeta ?? {}
        return {
          title: typeof meta.title === 'string' ? meta.title : undefined,
          description: typeof meta.description === 'string' ? meta.description : undefined,
          order: typeof meta.order === 'number' ? meta.order : undefined,
          component: typeof meta.component === 'string' ? meta.component : undefined,
          module: typeof meta.module === 'string' ? meta.module : undefined,
          apiNotes:
            meta.apiNotes && typeof meta.apiNotes === 'object'
              ? Object.fromEntries(Object.entries(meta.apiNotes).map(([key, value]) => [key, String(value)]))
              : undefined,
          showSource: typeof meta.showSource === 'boolean' ? meta.showSource : undefined,
          doc: typeof meta.doc === 'boolean' ? meta.doc : undefined,
        }
      } catch (error) {
        console.warn(
          `[rinova-playground] ${toPosix(path.relative(root, file))} 的 pageMeta 解析失败：`,
          error instanceof Error ? error.message : error
        )
      }
    }
    return {}
  }

  const scanScenes = async (): Promise<void> => {
    scenes = []
    pages = []
    if (!fs.existsSync(scenesDir)) return

    const ignored = (file: string, reason: string): void => {
      console.warn(`[rinova-playground] 忽略 ${toPosix(path.relative(root, file))}：${reason}`)
    }

    for (const name of listScenes(scenesDir)) {
      ignored(path.join(scenesDir, name), '场景必须放在 分组/组件页/ 目录下')
    }

    // 分组顺序 = config.groups 的声明顺序；未登记的组排在最后（再按目录名）
    const groupKeys = Object.keys(config.groups ?? {})
    const groupOrderOf = (dir: string): number => {
      const index = groupKeys.indexOf(dir)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }

    const groupDirs = listDirs(scenesDir).sort((a, b) => groupOrderOf(a) - groupOrderOf(b) || a.localeCompare(b))
    for (const groupDir of groupDirs) {
      const groupAbs = path.join(scenesDir, groupDir)
      const groupLabel = config.groups?.[groupDir] ?? titleize(groupDir)

      for (const name of listScenes(groupAbs)) {
        ignored(path.join(groupAbs, name), '分组目录下不能直接放场景，请放进组件页目录')
      }

      /** 扫一个页（一级组件页或二级子组件页）：读页 meta + 收自己的场景 */
      const collectPage = async (
        pageAbs: string,
        pageId: string,
        pageDir: string,
        depth: 1 | 2,
        parentId?: string
      ): Promise<PageEntry> => {
        const meta = await readPageMeta(pageAbs)
        const pageTitle = meta.title ?? titleize(pageDir)
        const page: PageEntry = {
          id: pageId,
          group: groupLabel,
          groupDir,
          groupOrder: groupOrderOf(groupDir),
          depth,
          title: pageTitle,
          description: meta.description,
          order: typeof meta.order === 'number' ? meta.order : Number.MAX_SAFE_INTEGER,
          component: meta.component,
          module: meta.module,
          apiNotes: meta.apiNotes,
          showSource: meta.showSource,
          doc: meta.doc,
        }
        if (parentId) page.parentId = parentId

        const seen = new Set<string>()
        for (const fileName of listScenes(pageAbs)) {
          const isMarkdown = fileName.endsWith('.md')
          const name = fileName.replace(/\.(vue|md)$/, '')
          if (seen.has(name)) {
            ignored(path.join(pageAbs, fileName), `同一页内场景名重复（${name}）`)
            continue
          }
          seen.add(name)

          const abs = path.join(pageAbs, fileName)
          if (!isMarkdown) checkSceneStyle(abs)
          const sceneMeta = await readSceneMeta(abs)
          const relPath = toPosix(path.relative(root, abs))

          scenes.push({
            id: `${pageId}/${name}`,
            name,
            title: sceneMeta.title ?? titleize(name),
            section: sceneMeta.section ?? 'overview',
            api: sceneMeta.api,
            group: groupLabel,
            groupDir,
            pageId,
            page: pageTitle,
            url: `/${relPath}`,
            file: abs,
            rel: relPath,
            order: typeof sceneMeta.order === 'number' ? sceneMeta.order : Number.MAX_SAFE_INTEGER,
            tags: sceneMeta.tags,
            description: sceneMeta.description,
            hidden: sceneMeta.hideInNav,
            lang: isMarkdown ? 'md' : 'vue',
            doc: isMarkdown || meta.doc === true,
            // 优先级：场景 > 页 > 全局；Markdown 场景默认不展示源码
            showSource:
              sceneMeta.showSource ?? meta.showSource ?? (isMarkdown ? false : config.sources !== false),
            sources: [
              { rel: relPath, url: `/${relPath}` },
              ...(sceneMeta.files ?? [])
                .map((file) => {
                  const absExtra = path.resolve(root, file)
                  if (!fs.existsSync(absExtra)) {
                    console.warn(`[rinova-playground] ${relPath} 的 sceneMeta.files 里 ${file} 不存在，已跳过`)
                    return null
                  }
                  const relExtra = toPosix(path.relative(root, absExtra))
                  return { rel: relExtra, url: `/${relExtra}` }
                })
                .filter((entry): entry is SceneSource => entry !== null),
            ],
          })
        }
        return page
      }

      // 一级 = 组件页；组件页下再深一层 = 子组件页
      const groupPages: PageEntry[] = []
      for (const pageDir of listDirs(groupAbs)) {
        const pageAbs = path.join(groupAbs, pageDir)
        const page = await collectPage(pageAbs, `${groupDir}/${pageDir}`, pageDir, 1)
        groupPages.push(page)

        for (const subDir of listDirs(pageAbs)) {
          const subAbs = path.join(pageAbs, subDir)
          groupPages.push(await collectPage(subAbs, `${page.id}/${subDir}`, subDir, 2, page.id))
        }
      }

      // 组内顺序：一级按 order / 目录名，二级紧跟自己的父页（同样按 order / 目录名）
      const byOrder = (a: PageEntry, b: PageEntry): number => a.order - b.order || a.id.localeCompare(b.id)
      const roots = groupPages.filter((item) => item.depth === 1).sort(byOrder)
      for (const root of roots) {
        pages.push(root)
        pages.push(...groupPages.filter((item) => item.parentId === root.id).sort(byOrder))
      }
    }

    // 内容区与右侧索引必须同序：分组（概要 → Props → Events → Exposes → Slots）→ order → id
    scenes.sort(compareScenes)
    // pages 已在扫描时按「组声明序 → 组内顺序 → 子组件紧跟父页」排好，这里不再全局重排（否则父子会被打散）
  }

  /** 生成契约清单（.playground/manifest.json + llms.txt + coverage.md） */
  const generateManifest = (): void => {
    const patterns = Array.isArray(config.components) ? config.components : []
    const modulePatterns = Array.isArray(config.modules)
      ? config.modules.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : []
    if ((!patterns.length && !modulePatterns.length) || !scenes.length) return
    const startedAt = Date.now()
    try {
      const tsconfig = typeof config.tsconfig === 'string' ? config.tsconfig : 'tsconfig.json'
      // 非组件模块：函数 / hooks / 常量的契约（只有配了 modules 才会建 Program）
      const modules = modulePatterns.length
        ? buildModules({ root, patterns: modulePatterns, tsconfig, scenes })
        : []

      /** 演示环境：globals / 插件 / 分组 / 页面清单（MCP 与 llms.txt 的数据源） */
      const buildEnv = (): ManifestEnv => {
        const scenesOfPage = new Map<string, string[]>()
        for (const scene of scenes) {
          const list = scenesOfPage.get(scene.pageId) ?? []
          list.push(scene.id)
          scenesOfPage.set(scene.pageId, list)
        }
        const envPages: ManifestPage[] = pages.map((page) => ({
          id: page.id,
          group: page.group,
          groupDir: page.groupDir,
          title: page.title,
          order: page.order,
          depth: page.depth,
          ...(page.parentId ? { parentId: page.parentId } : {}),
          ...(page.component ? { component: page.component } : {}),
          ...(page.module ? { module: page.module } : {}),
          ...(page.doc ? { doc: true } : {}),
          ...(page.showSource !== undefined ? { showSource: page.showSource } : {}),
          dir: `${toPosix(path.relative(root, scenesDir))}/${page.id}`,
          scenes: scenesOfPage.get(page.id) ?? [],
        }))
        const groupLabels = new Map<string, string>()
        for (const page of pages) groupLabels.set(page.groupDir, page.group)
        const theme = (config.theme ?? {}) as { ui?: string; stage?: string }
        const plugins = Array.isArray(config.plugins)
          ? config.plugins.filter((item): item is string => typeof item === 'string')
          : []
        const routeBase =
          typeof config.routeBase === 'string' ? config.routeBase : typeof config.base === 'string' ? config.base : '/'
        return {
          title: typeof config.title === 'string' ? config.title : 'rinova-playground',
          sceneRoot: toPosix(path.relative(root, scenesDir)),
          routeBase,
          groups: [...groupLabels].map(([dir, label]) => ({ dir, label })),
          globals: (config.globals ?? {}) as Record<string, unknown>,
          plugins,
          theme: { ui: theme.ui ?? 'auto', stage: theme.stage ?? 'light' },
          sources: config.sources !== false,
          components: { configured: patterns.length > 0, count: 0 },
          modules: { configured: modulePatterns.length > 0, count: 0 },
          pages: envPages,
        }
      }

      const manifest = buildManifest({
        root,
        patterns,
        tsconfig,
        scenes,
        modules,
        env: buildEnv(),
      })
      // 数量以实际提取结果为准（glob 命中了多少组件 / 模块）
      manifest.env.components.count = manifest.components.length
      manifest.env.modules.count = manifest.modules.length
      writeManifest(path.join(root, '.playground'), manifest)
      // 契约变了要让 API 模块失效：下次请求重新注入
      const apiMod = devServer?.moduleGraph.getModuleById(RESOLVED_ID[VIRTUAL_API] as string)
      if (apiMod && devServer) devServer.moduleGraph.invalidateModule(apiMod)
      const props = manifest.components.reduce((sum, item) => sum + item.props.length, 0)
      const uncovered = manifest.components.reduce((sum, item) => sum + item.uncoveredProps.length, 0)
      const functions = manifest.modules.reduce((sum, item) => sum + item.functions.length, 0)
      console.log(
        `[rinova-playground] 契约清单：${manifest.components.length} 个组件 / ${props} props / 未覆盖 ${uncovered} → .playground/（${Date.now() - startedAt}ms）` +
          (manifest.modules.length ? `；模块 ${manifest.modules.length} 个 / ${functions} 个函数` : '')
      )
    } catch (error) {
      console.warn(
        '[rinova-playground] 契约清单生成失败（不影响 dev/build）：',
        error instanceof Error ? error.message : error
      )
    }
  }

  const ensureReady = async (): Promise<void> => {
    if (resolved) return
    configFile = findConfigFile()
    if (configFile) {
      const mod = (await jiti.import(configFile)) as { default?: PlaygroundUserConfig }
      config = mod.default ?? {}
    } else {
      config = {}
    }
    scenesDir = path.resolve(root, options.scenes ?? config.scenes ?? DEFAULT_SCENES_DIR)
    await scanScenes()
    resolved = true
  }

  const invalidateScenes = (server: ViteDevServer): void => {
    resolved = false
    for (const id of [RESOLVED_ID[VIRTUAL_SCENES], RESOLVED_ID[VIRTUAL_CONFIG]]) {
      const mod = id ? server.moduleGraph.getModuleById(id) : undefined
      if (mod) server.moduleGraph.invalidateModule(mod)
    }
  }

  const configModuleCode = (): string => {
    const payload = {
      ...config,
      /** 供「在本地 IDE 打开」拼绝对路径；exposeRoot: false 时清空 */
      root: config.editor?.exposeRoot === false ? '' : root,
      sceneCount: scenes.length,
      pageCount: pages.length,
    }
    return `export default ${JSON.stringify(payload)}`
  }

  /**
   * API 文档模块：只注入「被页面引用到的组件」的契约，
   * 运行时零请求；页面 → 组件的绑定优先取 pageMeta.component，否则按目录名同名匹配。
   */
  const apiModuleCode = (): string => {
    const manifestPath = path.join(root, '.playground/manifest.json')
    const hasComponents = Array.isArray(config.components) && config.components.length > 0
    const hasModules = Array.isArray(config.modules) && config.modules.length > 0
    const empty = 'export const api = {}\nexport const pageComponents = {}\nexport const modules = {}\nexport const pageModules = {}\n'
    // 首次请求时清单可能还没生成（dev 下 buildStart 与首个请求的先后不保证）
    if (!fs.existsSync(manifestPath) && (hasComponents || hasModules)) generateManifest()
    if (!fs.existsSync(manifestPath)) return empty

    let manifest: { components?: Array<{ name: string }>; modules?: Array<{ name: string }> } | null = null
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        components?: Array<{ name: string }>
        modules?: Array<{ name: string }>
      }
    } catch {
      return empty
    }
    const components = manifest?.components ?? []
    const modules = manifest?.modules ?? []
    if (!components.length && !modules.length) return empty

    const byName = new Map(components.map((item) => [item.name.toLowerCase(), item]))
    const pageComponents: Record<string, string> = {}
    const used = new Map<string, unknown>()

    for (const page of pages) {
      const candidates = [
        page.component,
        page.id.split('/').slice(-1)[0],
        page.title.replace(/\s+/g, ''),
      ].filter(Boolean) as string[]

      const hit = candidates
        .map((candidate) => byName.get(candidate.toLowerCase()))
        .find((item) => Boolean(item))
      if (!hit) continue
      pageComponents[page.id] = hit.name
      used.set(hit.name, hit)
    }

    // 非组件模块：pageMeta.module 优先，其次按页目录名同名匹配
    const moduleByName = new Map(modules.map((item) => [item.name.toLowerCase(), item]))
    const pageModules: Record<string, string> = {}
    const usedModules = new Map<string, unknown>()

    for (const page of pages) {
      const candidates = [
        page.module,
        page.id.split('/').slice(-1)[0],
        page.title.replace(/\s+/g, ''),
      ].filter(Boolean) as string[]

      const hit = candidates
        .map((candidate) => moduleByName.get(candidate.toLowerCase()))
        .find((item) => Boolean(item))
      if (!hit) continue
      pageModules[page.id] = hit.name
      usedModules.set(hit.name, hit)
    }

    return `export const api = ${JSON.stringify(Object.fromEntries(used))}
export const pageComponents = ${JSON.stringify(pageComponents)}
export const modules = ${JSON.stringify(Object.fromEntries(usedModules))}
export const pageModules = ${JSON.stringify(pageModules)}
`
  }

  const scenesModuleCode = (): string => {
    const hasMarkdown = scenes.some((scene) => scene.lang === 'md')
    const sceneCode = scenes
      .map((scene) => {
        const sources = `[${scene.sources
          .map(
            (source) => `{ rel: ${JSON.stringify(source.rel)}, raw: () => import(${JSON.stringify(
              `${source.url}?raw`
            )}).then((mod) => mod.default) }`
          )
          .join(', ')}]`

        // `.md` 场景：读原文 → 交给 defineMarkdownScene 包装成组件
        const loader =
          scene.lang === 'md'
            ? `() => import(${JSON.stringify(`${scene.url}?raw`)}).then((mod) => ({ default: defineMarkdownScene(mod.default) }))`
            : `() => import(${JSON.stringify(scene.url)})`

        return `  {
    id: ${JSON.stringify(scene.id)},
    name: ${JSON.stringify(scene.name)},
    title: ${JSON.stringify(scene.title)},
    section: ${JSON.stringify(scene.section)},
    api: ${JSON.stringify(scene.api ?? null)},
    group: ${JSON.stringify(scene.group)},
    groupDir: ${JSON.stringify(scene.groupDir)},
    pageId: ${JSON.stringify(scene.pageId)},
    page: ${JSON.stringify(scene.page)},
    path: ${JSON.stringify(scene.url)},
    file: ${JSON.stringify(scene.file)},
    rel: ${JSON.stringify(scene.rel)},
    lang: ${JSON.stringify(scene.lang)},
    order: ${JSON.stringify(scene.order)},
    tags: ${JSON.stringify(scene.tags ?? null)},
    description: ${JSON.stringify(scene.description ?? null)},
    hidden: ${JSON.stringify(scene.hidden === true)},
    showSource: ${JSON.stringify(scene.showSource)},
    doc: ${JSON.stringify(scene.doc)},
    sources: ${sources},
    load: ${loader},
    raw: () => import(${JSON.stringify(`${scene.url}?raw`)}).then((mod) => mod.default)
  }`
      })
      .join(',\n')

    const pageCode = pages
      .map(
        (page) => `  {
    id: ${JSON.stringify(page.id)},
    group: ${JSON.stringify(page.group)},
    groupDir: ${JSON.stringify(page.groupDir)},
    groupOrder: ${JSON.stringify(page.groupOrder)},
    depth: ${JSON.stringify(page.depth)},
    parentId: ${JSON.stringify(page.parentId ?? null)},
    title: ${JSON.stringify(page.title)},
    description: ${JSON.stringify(page.description ?? null)},
    order: ${JSON.stringify(page.order)},
    component: ${JSON.stringify(page.component ?? null)},
    module: ${JSON.stringify(page.module ?? null)},
    apiNotes: ${JSON.stringify(page.apiNotes ?? null)},
    showSource: ${JSON.stringify(page.showSource ?? null)},
    doc: ${JSON.stringify(page.doc ?? null)}
  }`
      )
      .join(',\n')

    return `${hasMarkdown ? "import { defineMarkdownScene } from '@rinova/playground'\n" : ''}export const scenes = [
${sceneCode}
]

export const pages = [
${pageCode}
]
`
  }

  /**
   * 插件虚拟模块：把 config.plugins 变成懒加载入口。
   * 走动态 import，dev 与 build 完全同一条路径 —— 不存在「只有 dev 可用」的分支。
   */
  const pluginsModuleCode = (): string => {
    const entries = Array.isArray(config.plugins) ? config.plugins : []
    const specs: string[] = []
    for (const item of entries) {
      if (typeof item !== 'string' || !item.trim()) {
        console.warn('[rinova-playground] plugins 的每一项都必须是字符串路径，已跳过：', item)
        continue
      }
      try {
        const spec = resolvePluginSpecifier(root, item)
        if (spec.startsWith('/') && !fs.existsSync(path.join(root, spec))) {
          const message = `插件文件不存在：${item}`
          if (isBuild) throw new Error(message)
          console.warn(`[rinova-playground] ${message}`)
        }
        specs.push(spec)
      } catch (error) {
        console.warn(`[rinova-playground] ${messageOf(error)}，已跳过`)
      }
    }
    if (!specs.length) return 'export const pluginModules = []\n'
    return `export const pluginModules = [\n${specs
      .map((spec) => `  () => import(${JSON.stringify(spec)}),`)
      .join('\n')}\n]\n`
  }

  return {
    name: 'rinova-playground',
    enforce: 'pre',

    config: async (viteConfig) => {
      root = viteConfig.root ? path.resolve(viteConfig.root) : process.cwd()
      await ensureReady()
      return {
        ...(typeof config.base === 'string' ? { base: config.base } : {}),
        ...(typeof config.port === 'number' ? { server: { port: config.port } } : {}),
      }
    },

    configResolved: (viteConfig) => {
      root = viteConfig.root
      isBuild = viteConfig.command === 'build'
      outDir = viteConfig.build.outDir
    },

    /** 契约清单：组件 props/emits/slots → .playground/manifest.json + llms.txt + coverage.md */
    buildStart: async () => {
      await ensureReady()
      generateManifest()
    },

    /** 构建时把清单一起放进产物 */
    closeBundle: () => {
      if (!isBuild) return
      const source = path.join(root, '.playground')
      const target = path.resolve(root, outDir)
      if (!fs.existsSync(source)) return
      for (const name of ['manifest.json', 'llms.txt', 'llms-components.txt', 'llms-todo.txt', 'coverage.md']) {
        const from = path.join(source, name)
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(target, name))
      }
    },

    resolveId: (id) => RESOLVED_ID[id] ?? null,

    load: async (id) => {
      if (id === RESOLVED_ID[VIRTUAL_API]) {
        await ensureReady()
        return apiModuleCode()
      }
      if (id === RESOLVED_ID[VIRTUAL_PLUGINS]) {
        await ensureReady()
        return pluginsModuleCode()
      }
      if (id !== RESOLVED_ID[VIRTUAL_CONFIG] && id !== RESOLVED_ID[VIRTUAL_SCENES]) return null
      await ensureReady()
      return id === RESOLVED_ID[VIRTUAL_CONFIG] ? configModuleCode() : scenesModuleCode()
    },

    configureServer: async (server) => {
      devServer = server
      await ensureReady()
      server.watcher.add(scenesDir)

      const refresh = (file?: string): void => {
        const target = file ?? ''
        const isScene = target.startsWith(scenesDir) && /\.(vue|ts|md)$/.test(target)
        if (!isScene) return
        invalidateScenes(server)
        // 场景增删改都会影响 env.pages / scenes 清单（MCP 与 llms.txt 读它），防抖后重算
        scheduleManifest(400)
        server.ws.send({ type: 'full-reload' })
      }

      // 组件改动时重算契约清单（防抖，避免每次保存都跑一遍 TS 程序）
      let manifestTimer: NodeJS.Timeout | null = null
      const scheduleManifest = (delay = 800): void => {
        if (manifestTimer) clearTimeout(manifestTimer)
        manifestTimer = setTimeout(() => {
          // 场景新增 / 删除会 invalidate 扫描结果，清单要用新的 scenes / pages 重算
          void ensureReady().then(() => generateManifest())
        }, delay)
      }

      // components 变了要重挂监听：配置里新增的目录原来根本没被 watch。
      // 注意这里只增不减 —— chokidar 的 unwatch 是异步的，紧跟着 add 会让这批路径进入坏状态
      // （实测：unwatch 后再 add，新旧目录都不再触发事件）。多留几个失效目录无害，
      // 最多多跑一次清单重算。
      const componentRoots = new Set<string>()
      const watchComponents = (): void => {
        for (const pattern of Array.isArray(config.components) ? config.components : []) {
          const dir = path.resolve(root, pattern.split('*')[0] || '.')
          if (componentRoots.has(dir)) continue
          componentRoots.add(dir)
          server.watcher.add(dir)
        }
      }

      const onComponentChange = (file: string): void => {
        if (process.env.RINOVA_DEBUG_WATCH) console.log('[rp-debug] event:', file)
        if (!file.endsWith('.vue')) return
        const hit = [...componentRoots].some((dir) => file.startsWith(dir))
        if (process.env.RINOVA_DEBUG_WATCH) console.log('[rp-debug]   vue=', true, 'hit=', hit)
        if (!hit) return
        // 先把最新文本推给 checker，否则语言服务还在用旧快照（改 props 后清单不更新）
        syncComponentFile(path.resolve(file))
        scheduleManifest()
      }

      // 插件文件改动 → 整页重载（插件状态会重置，这是期望行为：登录态得重新拿）
      const pluginFiles = new Set<string>()
      const watchPlugins = (): void => {
        for (const item of Array.isArray(config.plugins) ? config.plugins : []) {
          if (typeof item !== 'string' || !item.trim()) continue
          let spec = ''
          try {
            spec = resolvePluginSpecifier(root, item)
          } catch {
            continue
          }
          if (!spec.startsWith('/')) continue
          const abs = path.join(root, spec)
          if (pluginFiles.has(abs) || !fs.existsSync(abs)) continue
          pluginFiles.add(abs)
          server.watcher.add(abs)
        }
      }
      watchPlugins()
      server.watcher.on('change', (file) => {
        if (!pluginFiles.has(path.resolve(file))) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID[VIRTUAL_PLUGINS] as string)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })

      watchComponents()
      server.watcher.on('change', onComponentChange)
      server.watcher.on('add', onComponentChange)
      server.watcher.on('unlink', onComponentChange)

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      // 改已有场景（尤其是 sceneMeta 的 title/section/api）也要重扫，否则虚拟模块还是旧的
      server.watcher.on('change', (file) => refresh(file))
      server.watcher.on('change', async (file) => {
        if (!configFile || path.resolve(file) !== path.resolve(configFile)) return
        // 配置文件变了：重读配置 → 重扫场景 → 按新的 components 重挂监听 → 重算契约清单
        invalidateScenes(server)
        await ensureReady()
        watchComponents()
        watchPlugins()
        const pluginMod = server.moduleGraph.getModuleById(RESOLVED_ID[VIRTUAL_PLUGINS] as string)
        if (pluginMod) server.moduleGraph.invalidateModule(pluginMod)
        scheduleManifest(0)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

export default playground