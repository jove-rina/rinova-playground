import { parseFrontmatter, splitBlocks, stripFrontmatter, TONE_LABEL, type CalloutTone } from './parse'

export type { CalloutTone } from './parse'

export type MarkdownBlock =
  | { kind: 'html'; html: string }
  | { kind: 'callout'; tone: CalloutTone; title: string; html: string }
  | { kind: 'steps'; items: string[] }

/**
 * 把 Markdown 原文渲染成区块列表。
 *
 * 这里只做 Markdown → HTML；语法高亮、语言角标与复制按钮统一交给 `enhance.ts`
 * （和手写内容页 `PwProse` 走同一段逻辑）。marked 按需加载，页面里没有 `.md` 场景时不会下载。
 */
export const renderMarkdown = async (source: string): Promise<MarkdownBlock[]> => {
  const { marked } = await import('marked')
  marked.setOptions({ gfm: true, breaks: false })

  const body = stripFrontmatter(source)
  const blocks = splitBlocks(body)
  const out: MarkdownBlock[] = []

  for (const block of blocks) {
    const html = marked.parse(block.text, { async: false }) as string

    if (block.kind === 'callout') {
      const tone = block.tone ?? 'info'
      out.push({ kind: 'callout', tone, title: block.title || TONE_LABEL[tone], html })
      continue
    }

    if (block.kind === 'steps') {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const items = [...doc.querySelectorAll('ol > li')].map((item) => item.innerHTML.trim())
      if (items.length) {
        out.push({ kind: 'steps', items })
        continue
      }
      // 没写成有序列表就退化成普通段落
    }

    out.push({ kind: 'html', html })
  }

  return out.filter((block) => (block.kind === 'steps' ? block.items.length > 0 : block.html.trim().length > 0))
}

export { parseFrontmatter }
