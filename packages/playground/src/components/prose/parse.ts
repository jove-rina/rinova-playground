/**
 * Markdown 解析（不依赖任何渲染库，会被 verify 直接单测）。
 *
 * 产物是「区块列表」：普通 Markdown、提示块、步骤块。
 * 真正的 Markdown → HTML 交给 marked，见 `render.ts`。
 */

export type CalloutTone = 'info' | 'tip' | 'warn' | 'danger'

/** `::: tip` 这类容器的别名表：写法尽量宽，渲染统一 */
const TONES: Record<string, CalloutTone> = {
  tip: 'tip',
  info: 'info',
  note: 'info',
  warn: 'warn',
  warning: 'warn',
  danger: 'danger',
  error: 'danger',
}

export const TONE_LABEL: Record<CalloutTone, string> = {
  info: '说明',
  tip: '建议',
  warn: '注意',
  danger: '危险',
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export interface MarkdownBlockRaw {
  kind: 'md' | 'callout' | 'steps'
  tone?: CalloutTone
  title?: string
  text: string
}

/** 去掉 `---` 头（内容由插件解析成 pageMeta / sceneMeta，渲染时不该出现） */
export const stripFrontmatter = (source: string): string => source.replace(FRONTMATTER, '')

/** 极简 frontmatter 解析：`key: value` 与 `key: [a, b]`，够声明标题 / 排序 / 标签用 */
export const parseFrontmatter = (source: string): Record<string, string | string[]> => {
  const match = source.match(FRONTMATTER)
  if (!match) return {}
  const data: Record<string, string | string[]> = {}
  for (const raw of (match[1] ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf(':')
    if (index < 1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (!key) continue
    data[key] = /^\[.*\]$/.test(value)
      ? value
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      : value.replace(/^['"]|['"]$/g, '')
  }
  return data
}

/** 把正文切成「普通 Markdown / 提示块 / 步骤块」，容器不支持嵌套 */
export const splitBlocks = (body: string): MarkdownBlockRaw[] => {
  const blocks: MarkdownBlockRaw[] = []
  let buffer: string[] = []
  let open: { kind: 'callout' | 'steps'; tone?: CalloutTone; title?: string; lines: string[] } | null = null

  const pushText = (text: string): void => {
    if (text.trim()) blocks.push({ kind: 'md', text })
  }

  for (const line of body.split(/\r?\n/)) {
    const match = /^:::\s*([a-zA-Z-]+)\s*(.*)$/.exec(line)
    if (open) {
      if (line.trim() === ':::') {
        pushText(buffer.join('\n'))
        buffer = []
        blocks.push({ kind: open.kind, tone: open.tone, title: open.title, text: open.lines.join('\n') })
        open = null
        continue
      }
      open.lines.push(line)
      continue
    }
    if (match) {
      const name = (match[1] ?? '').toLowerCase()
      const isSteps = name === 'steps'
      const tone = TONES[name]
      if (!isSteps && !tone) {
        // 不认识的容器：当普通文本，避免把内容吞掉
        buffer.push(line)
        continue
      }
      pushText(buffer.join('\n'))
      buffer = []
      open = {
        kind: isSteps ? 'steps' : 'callout',
        tone: isSteps ? undefined : tone,
        title: isSteps ? undefined : (match[2] ?? '').trim(),
        lines: [],
      }
      continue
    }
    buffer.push(line)
  }

  // 没有收口的容器：原样退回正文，不让内容凭空消失
  if (open) {
    const head = open.kind === 'steps' ? '::: steps' : `::: ${open.tone ?? 'info'} ${open.title ?? ''}`.trim()
    pushText([head, ...open.lines].join('\n'))
  }
  pushText(buffer.join('\n'))
  return blocks
}
