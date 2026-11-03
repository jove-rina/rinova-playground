import fs from 'node:fs'
import path from 'node:path'
import { createJiti } from 'jiti'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { buildManifest, writeManifest } from './manifest.js'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_CONFIG = 'virtual:playground/config'
const VIRTUAL_SCENES = 'virtual:playground/scenes'
const VIRTUAL_EDITOR_CSS = 'virtual:playground/editor-css'

const RESOLVED_ID: Record<string, string> = {
  [VIRTUAL_CONFIG]: `\0${VIRTUAL_CONFIG}`,
  [VIRTUAL_SCENES]: `\0${VIRTUAL_SCENES}`,
  [VIRTUAL_EDITOR_CSS]: `\0${VIRTUAL_EDITOR_CSS}`,
}

const CONFIG_FILES = [
  'playground.config.ts',
  'playground.config.mts',
  'playground.config.js',
  'playground.config.mjs',
]

const PAGE_META_FILES = ['meta.ts', 'meta.mts', 'meta.js', 'meta.mjs']

const DEFAULT_SCENES_DIR = 'src/scenes'

/** 页内索引的分组顺序，空组不展示 */
export const SECTION_ORDER = ['overview', 'props', 'events', 'exposes', 'slots'] as const
export type SceneSection = (typeof SECTION_ORDER)[number]

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
}

interface PageMeta {
  title?: string
  description?: string
  order?: number
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
}

interface PageEntry {
  /** `groupDir/pageDir` */
  id: string
  group: string
  groupDir: string
  title: string
  description?: string
  order: number
}

interface PlaygroundUserConfig {
  title?: string
  scenes?: string
  base?: string
  port?: number
  /** 契约清单要扫描的组件 glob（如 src/components 下所有 .vue）；不配则不生成 manifest */
  components?: string[]
  /** 组件提取用的 tsconfig，默认项目根的 tsconfig.json */
  tsconfig?: string
  /** 分组目录名 → 侧栏显示名 */
  groups?: Record<string, string>
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

const isSection = (value: unknown): value is SceneSection =>
  typeof value === 'string' && (SECTION_ORDER as readonly string[]).includes(value)

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

  const listVue = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.vue') && !entry.name.startsWith('.'))
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

    for (const name of listVue(scenesDir)) {
      ignored(path.join(scenesDir, name), '场景必须放在 分组/组件页/ 目录下')
    }

    for (const groupDir of listDirs(scenesDir)) {
      const groupAbs = path.join(scenesDir, groupDir)
      const groupLabel = config.groups?.[groupDir] ?? titleize(groupDir)

      for (const name of listVue(groupAbs)) {
        ignored(path.join(groupAbs, name), '分组目录下不能直接放场景，请放进组件页目录')
      }

      for (const pageDir of listDirs(groupAbs)) {
        const pageAbs = path.join(groupAbs, pageDir)
        const pageId = `${groupDir}/${pageDir}`
        const meta = await readPageMeta(pageAbs)
        const pageTitle = meta.title ?? titleize(pageDir)

        pages.push({
          id: pageId,
          group: groupLabel,
          groupDir,
          title: pageTitle,
          description: meta.description,
          order: typeof meta.order === 'number' ? meta.order : Number.MAX_SAFE_INTEGER,
        })

        const seen = new Set<string>()
        for (const fileName of listVue(pageAbs)) {
          const name = fileName.replace(/\.vue$/, '')
          if (seen.has(name)) {
            ignored(path.join(pageAbs, fileName), `同一页内场景名重复（${name}）`)
            continue
          }
          seen.add(name)

          const abs = path.join(pageAbs, fileName)
          checkSceneStyle(abs)
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
      }
    }

    scenes.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    pages.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  }

  /** 生成契约清单（.playground/manifest.json + llms.txt + coverage.md） */
  const generateManifest = (): void => {
    const patterns = config.components
    if (!Array.isArray(patterns) || !patterns.length || !scenes.length) return
    const startedAt = Date.now()
    try {
      const manifest = buildManifest({
        root,
        patterns,
        tsconfig: typeof config.tsconfig === 'string' ? config.tsconfig : 'tsconfig.json',
        scenes,
      })
      writeManifest(path.join(root, '.playground'), manifest)
      const props = manifest.components.reduce((sum, item) => sum + item.props.length, 0)
      const uncovered = manifest.components.reduce((sum, item) => sum + item.uncoveredProps.length, 0)
      console.log(
        `[rinova-playground] 契约清单：${manifest.components.length} 个组件 / ${props} props / 未覆盖 ${uncovered} → .playground/（${Date.now() - startedAt}ms）`
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

  const scenesModuleCode = (): string => {
    const sceneCode = scenes
      .map((scene) => {
        const sources = `[${scene.sources
          .map(
            (source) => `{ rel: ${JSON.stringify(source.rel)}, raw: () => import(${JSON.stringify(
              `${source.url}?raw`
            )}).then((mod) => mod.default) }`
          )
          .join(', ')}]`

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
    lang: 'vue',
    order: ${JSON.stringify(scene.order)},
    tags: ${JSON.stringify(scene.tags ?? null)},
    description: ${JSON.stringify(scene.description ?? null)},
    hidden: ${JSON.stringify(scene.hidden === true)},
    sources: ${sources},
    load: () => import(${JSON.stringify(scene.url)}),
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
    title: ${JSON.stringify(page.title)},
    description: ${JSON.stringify(page.description ?? null)},
    order: ${JSON.stringify(page.order)}
  }`
      )
      .join(',\n')

    return `export const scenes = [
${sceneCode}
]

export const pages = [
${pageCode}
]
`
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
      for (const name of ['manifest.json', 'llms.txt', 'coverage.md']) {
        const from = path.join(source, name)
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(target, name))
      }
    },

    resolveId: (id) => RESOLVED_ID[id] ?? null,

    load: async (id) => {
      if (id === RESOLVED_ID[VIRTUAL_EDITOR_CSS]) {
        // 转发给使用方的解析器：编辑器样式只在打开代码面板时才拉
        return "import '@rinova/playground/editor.css'"
      }
      if (id !== RESOLVED_ID[VIRTUAL_CONFIG] && id !== RESOLVED_ID[VIRTUAL_SCENES]) return null
      await ensureReady()
      return id === RESOLVED_ID[VIRTUAL_CONFIG] ? configModuleCode() : scenesModuleCode()
    },

    configureServer: async (server) => {
      await ensureReady()
      server.watcher.add(scenesDir)

      const refresh = (file?: string): void => {
        const target = file ?? ''
        const isScene = target.startsWith(scenesDir) && /\.(vue|ts)$/.test(target)
        if (!isScene) return
        invalidateScenes(server)
        server.ws.send({ type: 'full-reload' })
      }

      // 组件改动时重算契约清单（防抖，避免每次保存都跑一遍 TS 程序）
      let manifestTimer: NodeJS.Timeout | null = null
      const scheduleManifest = (delay = 800): void => {
        if (manifestTimer) clearTimeout(manifestTimer)
        manifestTimer = setTimeout(() => generateManifest(), delay)
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
        scheduleManifest()
      }

      watchComponents()
      server.watcher.on('change', onComponentChange)
      server.watcher.on('add', onComponentChange)
      server.watcher.on('unlink', onComponentChange)

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', async (file) => {
        if (!configFile || path.resolve(file) !== path.resolve(configFile)) return
        // 配置文件变了：重读配置 → 重扫场景 → 按新的 components 重挂监听 → 重算契约清单
        invalidateScenes(server)
        await ensureReady()
        watchComponents()
        scheduleManifest(0)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

export default playground
