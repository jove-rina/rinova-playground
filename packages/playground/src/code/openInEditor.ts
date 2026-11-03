import config from 'virtual:playground/config'
import { toast } from '../components/toast'
import { copyText } from './clipboard'

interface EditorConfig {
  preset?: string
  custom?: string
  exposeRoot?: boolean
}

const presets: Record<string, (file: string, line: number) => string> = {
  vscode: (file, line) => `vscode://file/${file}:${line}`,
  cursor: (file, line) => `cursor://file/${file}:${line}`,
  webstorm: (file, line) => `webstorm://open?line=${line}&file=${encodeURIComponent(file)}`,
}

const editorConfig = (): EditorConfig => ((config as { editor?: EditorConfig }).editor ?? {})

/** 项目根绝对路径；`editor.exposeRoot: false` 时插件不下发 */
const projectRoot = (): string => String((config as { root?: string }).root ?? '')

export const editorEnabled = (): boolean => {
  const editor = editorConfig()
  return Boolean(projectRoot()) && Boolean(editor.preset)
}

/** 拼出「在 IDE 中打开」的 URL；拿不到绝对路径时返回空串 */
export const editorUrl = (rel: string, line = 1): string => {
  const root = projectRoot()
  if (!root) return ''
  const abs = `${root.replace(/\/+$/, '')}/${rel.replace(/^\.?\//, '')}`
  const editor = editorConfig()
  if (editor.preset === 'custom' && editor.custom) {
    return editor.custom.replace('{file}', abs).replace('{line}', String(line))
  }
  const build = presets[editor.preset ?? 'vscode']
  return build ? build(abs, line) : ''
}

/** 打开本地 IDE；失败时降级为复制绝对路径 */
export const openInEditor = (rel: string, line = 1): void => {
  const url = editorUrl(rel, line)
  if (!url) {
    toast('未配置本地编辑器（playground.config 的 editor.preset）')
    return
  }
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.rel = 'noopener'
    anchor.click()
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
