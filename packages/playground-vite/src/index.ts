import fs from 'node:fs'
import path from 'node:path'
import { createJiti } from 'jiti'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_CONFIG = 'virtual:playground/config'
const VIRTUAL_SCENES = 'virtual:playground/scenes'

const RESOLVED_ID: Record<string, string> = {
  [VIRTUAL_CONFIG]: `\0${VIRTUAL_CONFIG}`,
  [VIRTUAL_SCENES]: `\0${VIRTUAL_SCENES}`,
}

const CONFIG_FILES = [
  'playground.config.ts',
  'playground.config.mts',
  'playground.config.js',
  'playground.config.mjs',
]

const DEFAULT_SCENES_DIR = 'src/scenes'

export interface PlaygroundPluginOptions {
  /** 指定配置文件路径，默认在项目根查找 playground.config.{ts,mts,js,mjs} */
  configFile?: string
  /** 覆盖配置里的 scenes 目录 */
  scenes?: string
}

interface ScannedFile {
  abs: string
  rel: string
}

interface SceneEntry {
  id: string
  title: string
  group: string
  /** 相对项目根的 URL，用于动态 import */
  url: string
  /** 绝对文件路径 */
  file: string
  /** 相对项目根的路径，如 `src/scenes/button/basic.vue` */
  rel: string
  order: string
}

interface PlaygroundUserConfig {
  title?: string
  scenes?: string
  base?: string
  port?: number
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

const walkScenes = (dir: string, prefix = ''): ScannedFile[] => {
  const out: ScannedFile[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const abs = path.join(dir, entry.name)
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...walkScenes(abs, rel))
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      out.push({ abs, rel })
    }
  }
  return out
}

/**
 * rinova-playground 的 Vite 插件。
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
  let configFile = ''

  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })

  const findConfigFile = (): string => {
    if (options.configFile) return path.resolve(root, options.configFile)
    for (const name of CONFIG_FILES) {
      const file = path.join(root, name)
      if (fs.existsSync(file)) return file
    }
    return ''
  }

  const scanScenes = (): SceneEntry[] => {
    if (!fs.existsSync(scenesDir)) return []

    return walkScenes(scenesDir)
      .map(({ abs, rel }) => {
        const id = rel.replace(/\.vue$/, '')
        const segments = id.split('/')
        const groupRaw = segments.length > 1 ? (segments[0] as string) : ''
        const nameRaw = segments.at(-1) as string

        return {
          id,
          title: titleize(nameRaw),
          group: groupRaw ? titleize(groupRaw) : 'Scenes',
          url: `/${toPosix(path.relative(root, abs))}`,
          file: abs,
          rel: toPosix(path.relative(root, abs)),
          order: id,
        }
      })
      .sort((a, b) => a.order.localeCompare(b.order))
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
    scenes = scanScenes()
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
    const payload = { ...config, sceneCount: scenes.length }
    return `export default ${JSON.stringify(payload)}`
  }

  const scenesModuleCode = (): string => {
    const entries = scenes
      .map(
        (scene) => `  {
    id: ${JSON.stringify(scene.id)},
    title: ${JSON.stringify(scene.title)},
    group: ${JSON.stringify(scene.group)},
    path: ${JSON.stringify(scene.url)},
    file: ${JSON.stringify(scene.file)},
    rel: ${JSON.stringify(scene.rel)},
    lang: 'vue',
    load: () => import(${JSON.stringify(scene.url)}),
    raw: () => import(${JSON.stringify(`${scene.url}?raw`)}).then((mod) => mod.default)
  }`
      )
      .join(',\n')

    return `export const scenes = [
${entries}
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
    },

    resolveId: (id) => (id === VIRTUAL_CONFIG || id === VIRTUAL_SCENES ? RESOLVED_ID[id] : null),

    load: async (id) => {
      if (id !== RESOLVED_ID[VIRTUAL_CONFIG] && id !== RESOLVED_ID[VIRTUAL_SCENES]) return null
      await ensureReady()
      return id === RESOLVED_ID[VIRTUAL_CONFIG] ? configModuleCode() : scenesModuleCode()
    },

    configureServer: async (server) => {
      await ensureReady()
      server.watcher.add(scenesDir)

      const refresh = (file?: string): void => {
        const target = file ?? ''
        const isScene = target.startsWith(scenesDir) && target.endsWith('.vue')
        const isConfig = Boolean(configFile) && path.resolve(target) === path.resolve(configFile)
        if (!isScene && !isConfig) return
        invalidateScenes(server)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', (file) => {
        if (configFile && path.resolve(file) === path.resolve(configFile)) refresh(file)
      })
    },
  }
}

export default playground
