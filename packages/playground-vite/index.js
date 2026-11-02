import fs from 'node:fs'
import path from 'node:path'
import { createJiti } from 'jiti'

const VIRTUAL_CONFIG = 'virtual:playground/config'
const VIRTUAL_SCENES = 'virtual:playground/scenes'
const RESOLVED_ID = {
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

/** `size-large` → `Size Large`；含中文时原样返回 */
function titleize(name) {
  if (/[\u3400-\u9fff]/.test(name)) return name
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function walkScenes(dir, prefix = '') {
  /** @type {{ abs: string, rel: string }[]} */
  const out = []
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
 * @param {{ configFile?: string, scenes?: string }} [options]
 */
export function playground(options = {}) {
  let root = process.cwd()
  let config = {}
  let resolved = false
  let scenesDir = ''
  let scenes = []
  let configFile = ''

  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })

  function findConfigFile() {
    if (options.configFile) return path.resolve(root, options.configFile)
    for (const name of CONFIG_FILES) {
      const file = path.join(root, name)
      if (fs.existsSync(file)) return file
    }
    return ''
  }

  function scanScenes() {
    if (!fs.existsSync(scenesDir)) return []

    return walkScenes(scenesDir)
      .map(({ abs, rel }) => {
        const id = rel.replace(/\.vue$/, '')
        const segments = id.split('/')
        const groupRaw = segments.length > 1 ? segments[0] : ''
        const nameRaw = segments[segments.length - 1]

        return {
          id,
          title: titleize(nameRaw),
          group: groupRaw ? titleize(groupRaw) : 'Scenes',
          path: `/${toPosix(path.relative(root, abs))}`,
          file: abs,
          rel: toPosix(path.relative(root, abs)),
          lang: 'vue',
          order: id,
        }
      })
      .sort((a, b) => a.order.localeCompare(b.order))
  }

  async function ensureReady() {
    if (resolved) return
    configFile = findConfigFile()
    config = configFile ? ((await jiti.import(configFile)).default ?? {}) : {}
    scenesDir = path.resolve(root, options.scenes ?? config.scenes ?? DEFAULT_SCENES_DIR)
    scenes = scanScenes()
    resolved = true
  }

  function invalidateScenes(server) {
    resolved = false
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID[VIRTUAL_SCENES])
    if (mod) server.moduleGraph.invalidateModule(mod)
    const configMod = server.moduleGraph.getModuleById(RESOLVED_ID[VIRTUAL_CONFIG])
    if (configMod) server.moduleGraph.invalidateModule(configMod)
  }

  function configModuleCode() {
    const payload = { ...config, sceneCount: scenes.length }
    return `export default ${JSON.stringify(payload)}`
  }

  function scenesModuleCode() {
    const entries = scenes
      .map(
        (scene) => `  {
    id: ${JSON.stringify(scene.id)},
    title: ${JSON.stringify(scene.title)},
    group: ${JSON.stringify(scene.group)},
    path: ${JSON.stringify(scene.path)},
    file: ${JSON.stringify(scene.file)},
    rel: ${JSON.stringify(scene.rel)},
    lang: 'vue',
    load: () => import(${JSON.stringify(scene.path)}),
    raw: () => import(${JSON.stringify(`${scene.path}?raw`)}).then((mod) => mod.default)
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

    configResolved(viteConfig) {
      root = viteConfig.root
    },

    resolveId(id) {
      if (id === VIRTUAL_CONFIG || id === VIRTUAL_SCENES) return RESOLVED_ID[id]
      return null
    },

    async load(id) {
      if (id !== RESOLVED_ID[VIRTUAL_CONFIG] && id !== RESOLVED_ID[VIRTUAL_SCENES]) return null
      await ensureReady()
      return id === RESOLVED_ID[VIRTUAL_CONFIG] ? configModuleCode() : scenesModuleCode()
    },

    async configureServer(server) {
      await ensureReady()
      server.watcher.add(scenesDir)

      const refresh = (file) => {
        const target = file ?? ''
        const isScene = target.startsWith(scenesDir) && target.endsWith('.vue')
        const isConfig = configFile && path.resolve(target) === path.resolve(configFile)
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
