import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/**
 * 全局唯一的 shiki highlighter。
 * 静态代码块与后续的 Monaco 编辑器必须共用这一个实例，避免两套主题色。
 */
let highlighterPromise: Promise<HighlighterCore> | null = null

/**
 * 代码配色：浅色用 light-plus（VSCode 默认浅色）、深色用 tokyo-night。
 *
 * 早先用 vitesse-light / vitesse-dark（低彩度），在 13px 的代码块里
 * 标签名、属性名、字符串几乎一个色，看着像“没有高亮”；换成这两套后
 * token 色相分得开（粉 / 紫 / 绿 / 青），深色底 #1a1b26 也贴着外壳的 #16181d。
 */
export const PW_THEME_LIGHT = 'light-plus'
export const PW_THEME_DARK = 'tokyo-night'

export const getHighlighter = (): Promise<HighlighterCore> => {
  highlighterPromise ??= createHighlighterCore({
    // 注意：这里的模块路径必须和上面的常量一致，否则 codeToHtml 会抛「Theme not found」
    themes: [import('@shikijs/themes/light-plus'), import('@shikijs/themes/tokyo-night')],
    langs: [
      import('@shikijs/langs/vue'),
      import('@shikijs/langs/typescript'),
      import('@shikijs/langs/javascript'),
      import('@shikijs/langs/css'),
      import('@shikijs/langs/json'),
      import('@shikijs/langs/less'),
      import('@shikijs/langs/html'),
      import('@shikijs/langs/bash'),
      import('@shikijs/langs/markdown'),
      import('@shikijs/langs/yaml'),
      import('@shikijs/langs/diff'),
    ],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}
