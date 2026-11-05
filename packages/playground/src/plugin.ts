import {
  computed,
  inject,
  provide,
  shallowRef,
  type App,
  type Component,
  type ComputedRef,
  type InjectionKey,
} from 'vue'
import type { PlaygroundConfig } from './config'
import type { SceneDescriptor } from './types'

/** 运行时手里的配置：比配置文件多出插件注入的字段 */
export type PlaygroundResolvedConfig = PlaygroundConfig & {
  root?: string
  sceneCount?: number
  pageCount?: number
}

/** 一个 UI 缝位里的一项 */
export interface PlaygroundPluginUiEntry {
  /** 插件名 + 序号，跨插件唯一 */
  key: string
  /** 注册它的插件名，用于错误卡片归属 */
  plugin: string
  component: Component
  props?: Record<string, unknown>
  order: number
}

/** 右侧抽屉里的一页 */
export interface PlaygroundPanelEntry extends PlaygroundPluginUiEntry {
  id: string
  title: string
}

export interface PlaygroundPanelHandle {
  readonly id: string
  open: () => void
  close: () => void
  toggle: () => void
}

export interface PlaygroundUiOptions {
  component: Component
  props?: Record<string, unknown>
  /** 同一缝位内的排序权重，小在前（同值按注册顺序） */
  order?: number
}

export interface PlaygroundPanelOptions extends PlaygroundUiOptions {
  id: string
  title: string
}

export interface PlaygroundUiApi {
  /** 页头右侧（预览宽度控件之前） */
  header: (options: PlaygroundUiOptions) => void
  /** 侧栏底部（「N 个页面 · M 个场景」上方） */
  sidebarFooter: (options: PlaygroundUiOptions) => void
  /** 右侧抽屉；同一时刻只开一个 */
  panel: (options: PlaygroundPanelOptions) => PlaygroundPanelHandle
}

export interface PlaygroundPluginContext {
  /** 真实的 App 实例：`app.use` / `app.provide` / `app.component` 都能用 */
  app: App
  config: PlaygroundResolvedConfig
  /** `config.globals` 的浅拷贝 */
  globals: Record<string, unknown>
  scenes: SceneDescriptor[]
  /** 读已初始化插件的返回值（只拿得到排在前面的插件） */
  get: <T = unknown>(name: string) => T | undefined
  /** 在演示画布内包裹场景，用于 config-provider / router 这类必须包住 demo 的 provider */
  wrap: (component: Component, props?: Record<string, unknown>) => void
  ui: PlaygroundUiApi
}

export interface PlaygroundPlugin {
  /** 唯一名，用于 `usePlaygroundPlugin(name)` 与错误定位 */
  name: string
  /** 失败时是否跳过；默认整页报错 */
  optional?: boolean
  /** 串行执行，可 async；返回值供场景读取 */
  setup?: (ctx: PlaygroundPluginContext) => unknown | Promise<unknown>
}

/**
 * 声明一个 playground 插件（只做类型收窄，没有运行时逻辑）。
 *
 * ```ts
 * export default [
 *   definePlaygroundPlugin({ name: 'auth', async setup(ctx) { return { user } } }),
 * ]
 * ```
 */
export const definePlaygroundPlugin = <T extends PlaygroundPlugin>(plugin: T): T => plugin

/* ---------------- 运行时状态（由 PlaygroundRoot 初始化，App 子树消费） ---------------- */

const headerSlots = shallowRef<PlaygroundPluginUiEntry[]>([])
const footerSlots = shallowRef<PlaygroundPluginUiEntry[]>([])
const wrapperEntries = shallowRef<PlaygroundPluginUiEntry[]>([])
const panelEntries = shallowRef<PlaygroundPanelEntry[]>([])
const openPanelId = shallowRef('')
const envValues = shallowRef<Record<string, unknown>>({})

/** 插件 setup 的返回值，按插件名存 */
const apis = new Map<string, unknown>()

export const pluginHeaderSlots = headerSlots
export const pluginFooterSlots = footerSlots
export const pluginWrapperEntries = wrapperEntries
export const pluginPanelEntries = panelEntries
export const pluginOpenPanelId = openPanelId

const sortEntries = (list: PlaygroundPluginUiEntry[]): PlaygroundPluginUiEntry[] =>
  [...list].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))

export const closePlaygroundPanel = (): void => {
  openPanelId.value = ''
}

export const openPlaygroundPanel = (id: string): void => {
  openPanelId.value = id
}

export const togglePlaygroundPanel = (id: string): void => {
  openPanelId.value = openPanelId.value === id ? '' : id
}

/** 供插件自己的 UI 组件使用（也可以在 ctx.ui 里拿到句柄） */
export const usePlaygroundUi = (): {
  openPanel: (id: string) => void
  closePanel: () => void
  togglePanel: (id: string) => void
} => ({
  openPanel: openPlaygroundPanel,
  closePanel: closePlaygroundPanel,
  togglePanel: togglePlaygroundPanel,
})

/** 场景里读全局变量 + 插件返回值（`globals` 打底，插件按声明顺序覆盖） */
export const usePlaygroundEnv = <T extends Record<string, unknown> = Record<string, unknown>>(): T =>
  envValues.value as T

/** 场景里读单个插件的返回值；插件不存在直接抛错，避免静默 undefined */
export const usePlaygroundPlugin = <T = unknown>(name: string): T => {
  if (!apis.has(name)) {
    throw new Error(
      `[rinova-playground] 插件「${name}」未注册或初始化失败。检查 playground.config.ts 的 plugins 与该插件的 name。`
    )
  }
  return apis.get(name) as T
}

/* ---------------- 主题（插件 UI 自己跟随明暗） ---------------- */

const themeKey: InjectionKey<ComputedRef<'light' | 'dark'>> = Symbol('rinova-playground:theme')

export const providePlaygroundTheme = (theme: ComputedRef<'light' | 'dark'>): void => {
  provide(themeKey, theme)
}

/**
 * 插件 UI 跟随外壳主题。框架不替第三方库切 `dark` class，
 * 这里只给当前值，怎么用由插件决定。
 */
export const usePlaygroundTheme = (): ComputedRef<'light' | 'dark'> => {
  const injected = inject(themeKey, null)
  if (injected) return injected
  return computed(() => (document.documentElement.dataset.pwTheme === 'dark' ? 'dark' : 'light'))
}

/* ---------------- 初始化 ---------------- */

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const pluginError = (plugin: string, error: unknown): Error => {
  const next = new Error(`[rinova-playground] 插件「${plugin}」初始化失败：${describeError(error)}`)
  next.name = 'PlaygroundPluginError'
  if (error instanceof Error && error.stack) next.stack = `${next.message}\n${error.stack}`
  return next
}

export interface RunPluginsOptions {
  app: App
  config: PlaygroundResolvedConfig
  scenes: SceneDescriptor[]
  /** `virtual:playground/plugins` 里的懒加载入口 */
  modules: Array<() => Promise<PlaygroundPlugin | PlaygroundPlugin[] | { default: PlaygroundPlugin | PlaygroundPlugin[] }>>
}

/**
 * 依次加载插件模块并串行执行 setup。
 *
 * 串行而不是并行：后一个插件经常要读前一个的结果（请求层依赖登录态）。
 * 全部完成前 `PlaygroundRoot` 不渲染 App，所以场景挂载时环境一定就绪。
 */
export const runPlugins = async (options: RunPluginsOptions): Promise<void> => {
  const { app, config, scenes, modules } = options
  if (!modules.length) return

  const globals = { ...(config.globals ?? {}) }
  const merged: Record<string, unknown> = { ...globals }
  const queue: PlaygroundPlugin[] = []

  for (const load of modules) {
    let loaded: unknown
    try {
      loaded = await load()
    } catch (error) {
      throw pluginError('(模块加载)', error)
    }
    // `export default [...]` 会以 { default: [...] } 的形式被 .then 拿到
    const value =
      loaded && typeof loaded === 'object' && 'default' in (loaded as Record<string, unknown>)
        ? (loaded as { default: unknown }).default
        : loaded
    for (const item of Array.isArray(value) ? value : [value]) {
      const plugin = item as PlaygroundPlugin | undefined
      if (!plugin || typeof plugin !== 'object' || typeof plugin.name !== 'string' || !plugin.name) {
        throw new Error(
          '[rinova-playground] 插件模块必须默认导出 definePlaygroundPlugin(...) 或它的数组，且每项都要有 name'
        )
      }
      queue.push(plugin)
    }
  }

  const seen = new Set<string>()
  for (const plugin of queue) {
    if (seen.has(plugin.name)) {
      throw new Error(`[rinova-playground] 插件名重复：「${plugin.name}」`)
    }
    seen.add(plugin.name)
  }

  const createContext = (plugin: PlaygroundPlugin): PlaygroundPluginContext => {
    const uiEntry = (options_: PlaygroundUiOptions, slot: 'header' | 'footer'): void => {
      const entry: PlaygroundPluginUiEntry = {
        key: `${plugin.name}:${slot}:${nextSeq()}`,
        plugin: plugin.name,
        component: options_.component,
        props: options_.props,
        order: options_.order ?? Number.MAX_SAFE_INTEGER,
      }
      if (slot === 'header') headerSlots.value = sortEntries([...headerSlots.value, entry])
      else footerSlots.value = sortEntries([...footerSlots.value, entry])
    }

    return {
      app,
      config,
      globals,
      scenes,
      get: <T = unknown>(name: string): T | undefined => apis.get(name) as T | undefined,
      wrap: (component: Component, props?: Record<string, unknown>) => {
        wrapperEntries.value = [
          ...wrapperEntries.value,
          {
            key: `${plugin.name}:wrap:${nextSeq()}`,
            plugin: plugin.name,
            component,
            props,
            order: wrapperEntries.value.length,
          },
        ]
      },
      ui: {
        header: (entry) => uiEntry(entry, 'header'),
        sidebarFooter: (entry) => uiEntry(entry, 'footer'),
        panel: (entry) => {
          const panel: PlaygroundPanelEntry = {
            key: `${plugin.name}:panel:${entry.id}`,
            plugin: plugin.name,
            id: entry.id,
            title: entry.title,
            component: entry.component,
            props: entry.props,
            order: entry.order ?? Number.MAX_SAFE_INTEGER,
          }
          panelEntries.value = sortEntries([...panelEntries.value, panel]) as PlaygroundPanelEntry[]
          return {
            id: entry.id,
            open: () => openPlaygroundPanel(entry.id),
            close: () => closePlaygroundPanel(),
            toggle: () => togglePlaygroundPanel(entry.id),
          }
        },
      },
    }
  }

  for (const plugin of queue) {
    try {
      const result = await plugin.setup?.(createContext(plugin))
      if (result !== undefined) {
        apis.set(plugin.name, result)
        if (result && typeof result === 'object') Object.assign(merged, result as Record<string, unknown>)
      }
    } catch (error) {
      if (plugin.optional) {
        console.warn(`[rinova-playground] 可选插件「${plugin.name}」初始化失败，已跳过：`, describeError(error))
        continue
      }
      throw pluginError(plugin.name, error)
    }
  }

  envValues.value = merged
}

/** 注册序号：同一插件注册多个缝位时保证排序稳定 */
let seq = 0
const nextSeq = (): number => {
  seq += 1
  return seq
}
