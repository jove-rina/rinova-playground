/**
 * 源码搜索的文本匹配工具。
 *
 * shiki 把一行拆成几十个 `<span>`（token），直接对单个文本节点做 `indexOf` 会漏掉跨 token 的词
 * （例如 `pageSize` 可能被拆成 `page` + `Size`）。做法是：
 * 1. 把 DOM 里所有文本节点拼成一条扁平字符串（记下每个节点在扁平串里的起点）；
 * 2. 在扁平串上匹配；
 * 3. 把匹配区间按交集映射回各个文本节点，节点内从后往前切分，偏移不会失效。
 */

export interface FlatText {
  nodes: Text[]
  text: string
  /** 每个节点在扁平串里的起始下标 */
  starts: number[]
}

export interface TextMatch {
  start: number
  end: number
}

/** 映射结果：某个文本节点上的一段（相对节点自身的偏移） */
export interface TextSegment {
  nodeIndex: number
  start: number
  end: number
  matchIndex: number
}

const WORD_CHAR = /[\w$]/

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 收集 root 下所有文本节点（行号是 CSS counter，不参与匹配） */
export const flattenTextNodes = (root: HTMLElement): FlatText => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  const starts: number[] = []
  let text = ''
  let current = walker.nextNode()
  while (current) {
    const node = current as Text
    nodes.push(node)
    starts.push(text.length)
    text += node.data
    current = walker.nextNode()
  }
  return { nodes, text, starts }
}

/**
 * 在扁平文本里找所有匹配。
 *
 * - `wholeWord` 用 `[\w$]` 判定前后边界；中文不属于词字符，按子串命中处理（符合直觉）
 * - `limit` 防止超大文件把 DOM 撑爆，超出后不再收集
 */
export const findMatches = (
  text: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; limit?: number } = {}
): TextMatch[] => {
  if (!query) return []
  const limit = options.limit ?? 2000
  const pattern = new RegExp(escapeRegExp(query), options.caseSensitive ? 'g' : 'gi')
  const matches: TextMatch[] = []
  let hit = pattern.exec(text)
  while (hit && matches.length < limit) {
    const start = hit.index
    const end = start + hit[0].length
    const before = start > 0 ? (text[start - 1] as string) : ''
    const after = end < text.length ? (text[end] as string) : ''
    const boundaryOk = !options.wholeWord || (!WORD_CHAR.test(before) && !WORD_CHAR.test(after))
    if (boundaryOk) matches.push({ start, end })
    pattern.lastIndex = end > start ? end : end + 1
    hit = pattern.exec(text)
  }
  return matches
}

/** 把扁平文本上的匹配映射到各文本节点的局部片段 */
export const segmentsOf = (flat: FlatText, matches: TextMatch[]): TextSegment[] => {
  const segments: TextSegment[] = []
  matches.forEach((match, matchIndex) => {
    flat.nodes.forEach((node, nodeIndex) => {
      const nodeStart = flat.starts[nodeIndex] ?? 0
      const nodeEnd = nodeStart + node.data.length
      const start = Math.max(match.start, nodeStart)
      const end = Math.min(match.end, nodeEnd)
      if (start < end) {
        segments.push({ nodeIndex, start: start - nodeStart, end: end - nodeStart, matchIndex })
      }
    })
  })
  return segments
}
