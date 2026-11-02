import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/**
 * 全局唯一的 shiki highlighter。
 * 静态代码块与后续的 Monaco 编辑器必须共用这一个实例，避免两套主题色。
 */
let highlighterPromise: Promise<HighlighterCore> | null = null

export const PW_THEME_LIGHT = 'vitesse-light'
export const PW_THEME_DARK = 'vitesse-dark'

export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('@shikijs/themes/vitesse-light'), import('@shikijs/themes/vitesse-dark')],
    langs: [
      import('@shikijs/langs/vue'),
      import('@shikijs/langs/typescript'),
      import('@shikijs/langs/javascript'),
      import('@shikijs/langs/css'),
      import('@shikijs/langs/json'),
    ],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}
