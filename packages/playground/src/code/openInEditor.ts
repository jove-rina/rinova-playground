import { computed, ref } from 'vue'
import config from 'virtual:playground/config'
import { toast } from '../components/toast'
import { copyText } from './clipboard'

interface EditorConfig {
  preset?: string
  custom?: string
  exposeRoot?: boolean
  /** 是否允许访问者自己切换编辑器，默认 true */
  allowChoice?: boolean
  /** 候选编辑器，默认取内置里常用的那几个 */
  options?: string[]
  /** 是否允许访问者填自定义协议模板，默认 true */
  allowCustom?: boolean
}

interface EditorPreset {
  label: string
  /** 支持 {file}（原样）、{fileEnc}（URL 编码）、{line} */
  template: string
}

/** 内置编辑器协议；都是各编辑器官方注册的 URL scheme */
export const EDITOR_PRESETS: Record<string, EditorPreset> = {
  vscode: { label: 'VS Code', template: 'vscode://file/{file}:{line}' },
  cursor: { label: 'Cursor', template: 'cursor://file/{file}:{line}' },
  windsurf: { label: 'Windsurf', template: 'windsurf://file/{file}:{line}' },
  trae: { label: 'Trae', template: 'trae://file/{file}:{line}' },
  zed: { label: 'Zed', template: 'zed://file/{file}:{line}' },
  webstorm: { label: 'WebStorm', template: 'webstorm://open?file={fileEnc}&line={line}' },
  idea: { label: 'IntelliJ IDEA', template: 'idea://open?file={fileEnc}&line={line}' },
  phpstorm: { label: 'PhpStorm', template: 'phpstorm://open?file={fileEnc}&line={line}' },
  sublime: { label: 'Sublime Text', template: 'subl://open?url=file://{fileEnc}&line={line}' },
  nova: { label: 'Nova', template: 'nova://open?path={fileEnc}' },
}

const DEFAULT_OPTIONS = ['vscode', 'cursor', 'windsurf', 'trae', 'zed', 'webstorm', 'idea', 'sublime']

const STORAGE_KEY = 'rinova-playground:editor'

interface EditorChoice {
  /** 内置 preset 名，或 'custom' */
  key: string
  /** key === 'custom' 时的协议模板 */
  template?: string
}

const editorConfig = (): EditorConfig => ((config as { editor?: EditorConfig }).editor ?? {})

const readStored = (): EditorChoice | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    // 兼容早期版本：只存了一个 preset 名
    if (!raw.startsWith('{')) return { key: raw }
    const parsed = JSON.parse(raw) as EditorChoice
    return typeof parsed?.key === 'string' ? parsed : null
  } catch {
    return null
  }
}

const fallbackChoice = (): EditorChoice => {
  const editor = editorConfig()
  if (editor.preset === 'custom' && editor.custom) return { key: 'custom', template: editor.custom }
  if (editor.preset) return { key: editor.preset }
  return { key: DEFAULT_OPTIONS[0] as string }
}

const choice = ref<EditorChoice>(readStored() ?? fallbackChoice())

/** 当前协议模板：内置 preset 的模板，或访问者自定义的模板 */
export const editorTemplate = (): string => {
  if (choice.value.key === 'custom') return choice.value.template ?? editorConfig().custom ?? ''
  return EDITOR_PRESETS[choice.value.key]?.template ?? ''
}

export const editorLabel = (): string => {
  if (choice.value.key === 'custom') {
    // 自定义模板直接用协议名当标签，读起来是「在 trae 打开」
    return editorTemplate().split('://')[0] || '自定义'
  }
  return EDITOR_PRESETS[choice.value.key]?.label ?? choice.value.key
}

export const editorChoiceKey = computed(() => choice.value.key)

/** 菜单里的候选：配置限定 → 内置；配置指定的 preset 始终在列表里 */
export const editorOptions = (): { value: string; label: string }[] => {
  const editor = editorConfig()
  const values = editor.options?.length ? editor.options : DEFAULT_OPTIONS
  const list = values
    .filter((value) => (value === 'custom' ? Boolean(editor.custom) : Boolean(EDITOR_PRESETS[value])))
    .map((value) => ({ value, label: EDITOR_PRESETS[value]?.label ?? '自定义' }))

  const preset = editor.preset
  if (preset && !list.some((item) => item.value === preset)) {
    list.unshift({
      value: preset,
      label: preset === 'custom' ? '自定义' : (EDITOR_PRESETS[preset]?.label ?? preset),
    })
  }
  return list
}

/** 是否允许访问者填自定义模板（任意 IDE 都能接） */
export const allowCustomEditor = (): boolean => editorConfig().allowCustom !== false

/** 访问者能否自己选：配置显式关闭，或只有一个候选且不允许自定义时隐藏菜单 */
export const canChooseEditor = (): boolean =>
  editorConfig().allowChoice !== false && (editorOptions().length > 1 || allowCustomEditor())

export const setEditorChoice = (next: EditorChoice): void => {
  choice.value = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 隐私模式写不进去，本次会话仍然生效
  }
}

const projectRoot = (): string => String((config as { root?: string }).root ?? '')

export const editorEnabled = (): boolean => Boolean(projectRoot()) && Boolean(editorTemplate())

const fill = (template: string, abs: string, line: number): string =>
  template
    .replace(/\{fileEnc\}/g, encodeURIComponent(abs))
    .replace(/\{file\}/g, abs)
    .replace(/\{line\}/g, String(line))

/** 拼出「在 IDE 中打开」的 URL；拿不到绝对路径时返回空串 */
export const editorUrl = (rel: string, line = 1): string => {
  const root = projectRoot()
  const template = editorTemplate()
  if (!root || !template) return ''
  const abs = `${root.replace(/\/+$/, '')}/${rel.replace(/^\.?\//, '')}`
  return fill(template, abs, line)
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
