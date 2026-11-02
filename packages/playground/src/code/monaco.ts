import type * as Monaco from 'monaco-editor/editor/editor.api'
import { getHighlighter, PW_THEME_DARK, PW_THEME_LIGHT } from './highlighter'

/**
 * Monaco 单例：worker 环境只能设置一次，highlighter 也只注入一次。
 * 所有路径都是懒加载，首屏不会碰到编辑器代码。
 */
let loader: Promise<typeof Monaco> | null = null

export const PW_MONACO_LANGS = ['vue', 'typescript', 'javascript', 'css', 'html', 'json', 'less'] as const

type ShikiInject = (highlighter: unknown, monaco: unknown) => void

/** 不同打包链路下 @shikijs/monaco 可能以 default 形式出现，两种形态都接受 */
const resolveShikiToMonaco = (mod: unknown): ShikiInject => {
  const candidate = mod as { shikiToMonaco?: ShikiInject; default?: { shikiToMonaco?: ShikiInject } }
  const inject = candidate.shikiToMonaco ?? candidate.default?.shikiToMonaco
  if (typeof inject !== 'function') throw new Error('@shikijs/monaco 未导出 shikiToMonaco')
  return inject
}

export const loadMonaco = (): Promise<typeof Monaco> => {
  loader ??= (async () => {
    const [editorWorker, tsWorker, monaco, _contribution, shikiModule] = await Promise.all([
      import('monaco-editor/editor/editor.worker?worker'),
      import('monaco-editor/language/typescript/ts.worker?worker'),
      import('monaco-editor/editor/editor.api'),
      import('monaco-editor/language/typescript/monaco.contribution'),
      import('@shikijs/monaco'),
    ])

    // 只保留 editor + ts 两个 worker：展示场景不需要 json/css/html 的语义能力
    const EditorWorker = editorWorker.default
    const TsWorker = tsWorker.default
    self.MonacoEnvironment = {
      getWorker: (_workerId: string, label: string) =>
        label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker(),
    }

    for (const id of PW_MONACO_LANGS) monaco.languages.register({ id })

    const shikiToMonaco = resolveShikiToMonaco(shikiModule)
    const highlighter = await getHighlighter()
    shikiToMonaco(highlighter, monaco)
    monaco.editor.setTheme(PW_THEME_LIGHT)

    return monaco
  })()

  return loader
}

export const applyMonacoTheme = (monaco: typeof Monaco, theme: 'light' | 'dark'): void => {
  monaco.editor.setTheme(theme === 'dark' ? PW_THEME_DARK : PW_THEME_LIGHT)
}

/** 按扩展名判断 Monaco 语言 */
export const langFromFile = (file: string): string => {
  if (file.endsWith('.ts')) return 'typescript'
  if (file.endsWith('.js')) return 'javascript'
  if (file.endsWith('.json')) return 'json'
  if (file.endsWith('.less')) return 'less'
  if (file.endsWith('.css')) return 'css'
  if (file.endsWith('.html')) return 'html'
  return 'vue'
}
