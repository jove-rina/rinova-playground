import { defineComponent, h } from 'vue'
import PwMarkdown from './PwMarkdown.vue'

/**
 * 把一个 Markdown 场景包成组件：插件扫描到 `.md` 文件时调用。
 *
 * ```ts
 * load: () => import('./guide.md?raw').then((mod) => ({ default: defineMarkdownScene(mod.default) }))
 * ```
 */
export const defineMarkdownScene = (source: string) =>
  defineComponent({
    name: 'PwMarkdownScene',
    setup: () => () => h(PwMarkdown, { source }),
  })
