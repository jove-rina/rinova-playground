import { ref } from 'vue'
import config from 'virtual:playground/config'
import { toast } from '../components/toast'
import { copyText } from './clipboard'

interface EditorConfig {
  preset?: string
  custom?: string
  exposeRoot?: boolean
  /** 是否允许访问者在按钮里自己切换编辑器，默认 true */
  allowChoice?: boolean
  /** 可选编辑器列表，默认全部内置的 */
  options?: string[]
}

const STORAGE_KEY = 'rinova-playground:editor'

const presets: Record<string, (file: string, line: number) => string> = {
  vscode: (file, line) => `vscode://file/${file}:${line}`,
  cursor: (file, line) => `cursor://file/${file}:${line}`,
  webstorm: (file, line) => `webstorm://open?line=${line}&file=${encodeURIComponent(file)}`,
}

const labels: Record<string, string> = {
  vscode: 'VS Code',
  cursor: 'Cursor',
  webstorm: 'WebStorm',
  custom: '编辑器',
}

const DEFAULT_OPTIONS = ['vscode', 'cursor', 'webstorm']

const editorConfig = (): EditorConfig => ((config as { editor?: EditorConfig }).editor ?? {})

const readStored = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/** 访问者自己选的编辑器（localStorage），没有则用配置里的 preset */
export const editorChoice = ref<string>(readStored() || editorConfig().preset || 'vscode')

export const editorOptions = (): { value: string; label: string }[] => {
  const editor = editorConfig()
  const values = editor.options?.length ? editor.options : DEFAULT_OPTIONS
  const list = values.filter((value) => value === 'custom' || Boolean(presets[value]))
  // 配置里指定的 preset 无论如何都要在列表里
  const preset = editor.preset
  if (preset && !list.includes(preset)) list.unshift(preset)
  return list.map((value) => ({ value, label: labels[value] ?? value }))
}

/** 访问者能否自己选：配置显式关闭，或只有一个可选编辑器时不显示菜单 */
export const canChooseEditor = (): boolean =>
  editorConfig().allowChoice !== false && editorOptions().length > 1

export const setEditorChoice = (value: string): void => {
  editorChoice.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 隐私模式下写不进去也没关系，本次会话仍生效
  }
}

/** 按钮上显示的编辑器名，如「在 Cursor 打开」 */
export const editorLabel = (): string => labels[editorChoice.value] ?? '编辑器'

/** 项目根绝对路径；`editor.exposeRoot: false` 时插件不下发 */
const projectRoot = (): string => String((config as { root?: string }).root ?? '')

export const editorEnabled = (): boolean =>
  Boolean(projectRoot()) && (Boolean(editorConfig().preset) || editorOptions().length > 0)

/** 拼出「在 IDE 中打开」的 URL；拿不到绝对路径时返回空串 */
export const editorUrl = (rel: string, line = 1): string => {
  const root = projectRoot()
  if (!root) return ''
  const abs = `${root.replace(/\/+$/, '')}/${rel.replace(/^\.?\//, '')}`
  const editor = editorConfig()

  if (editorChoice.value === 'custom' && editor.custom) {
    return editor.custom.replace('{file}', abs).replace('{line}', String(line))
  }
  const build = presets[editorChoice.value]
  return build ? build(abs, line) : ''
}

/** 打开本地 IDE；没有可用 URL 时降级为复制绝对路径 */
export const openInEditor = (rel: string, line = 1): void => {
  const url = editorUrl(rel, line)
  if (!url) {
    toast('未配置本地编辑器（playground.config 的 editor.preset）')
    return
  }
  try {
    // 必须挂到文档里再点击：脱离文档的 <a> 在部分浏览器里不会触发协议跳转
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => anchor.remove(), 0)
  } catch {
    toast('打开本地编辑器失败')
  }
}

/** 复制「文件:行」，给没有 IDE 或路径失效的场景兜底 */
export const copyPath = async (rel: string, line = 1): Promise<void> => {
  const root = projectRoot()
  const abs = root ? `${root.replace(/\/+$/, '')}/${rel}` : rel
  const text = `${abs}:${line}`
  const ok = await copyText(text)
  toast(ok ? `已复制 ${text}` : '复制失败，请手动复制路径')
}
