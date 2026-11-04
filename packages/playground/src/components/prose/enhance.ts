import { getHighlighter, PW_THEME_DARK, PW_THEME_LIGHT } from '../../code/highlighter'

/**
 * 代码块增强：语法高亮 + 语言角标 + 复制按钮。
 *
 * Markdown 与手写内容页（`PwProse`）走同一段逻辑，保证同一个代码块在两条路上长得一样。
 * 只在已渲染的 DOM 上就地改：不移动、不替换 `<pre>` 节点，Vue 重新渲染时会被覆盖，
 * 于是用「按钮是否还在」当幂等标记，重渲染后自动再增强一次。
 */

/** shiki 的语言别名 → 我们注册过的 lang */
const LANGS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  md: 'markdown',
  yml: 'yaml',
  htm: 'html',
}

const detectLang = (pre: HTMLElement): { shikiLang: string; label: string } => {
  const code = pre.querySelector('code')
  const langClass = [...(code?.classList ?? [])].find((name) => name.startsWith('language-'))
  const raw = (langClass ? langClass.slice('language-'.length) : pre.dataset.lang ?? '').toLowerCase()
  if (!raw) return { shikiLang: 'text', label: '' }
  return { shikiLang: LANGS[raw] ?? raw, label: raw }
}

/** 把 `<pre><code>` 换成 shiki 的高亮结果（保留原来的 `<pre>` 节点） */
const applyHighlight = async (pre: HTMLElement, lang: string): Promise<void> => {
  if (pre.classList.contains('shiki')) return
  const code = pre.querySelector('code')
  if (!code) return
  const highlighter = await getHighlighter().catch((error) => {
    console.warn('[rinova-playground] 代码高亮初始化失败：', error)
    return null
  })
  if (!highlighter) return
  try {
    const html = highlighter.codeToHtml(code.textContent ?? '', {
      lang,
      themes: { light: PW_THEME_LIGHT, dark: PW_THEME_DARK },
      defaultColor: false,
    })
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const next = doc.querySelector('pre')
    const nextCode = doc.querySelector('code')
    if (!next || !nextCode) return
    pre.setAttribute('class', next.getAttribute('class') ?? 'shiki')
    pre.setAttribute('style', next.getAttribute('style') ?? '')
    code.innerHTML = nextCode.innerHTML
    code.removeAttribute('class')
  } catch (error) {
    // 语言 / 主题没注册过：保留纯文本，只加语言角标和复制按钮（但要能看到原因）
    console.warn('[rinova-playground] 代码高亮失败（保留纯文本）：', error)
  }
}

const COPY_LABEL = '复制'
const DONE_LABEL = '已复制'

/** 给一个 `<pre>` 加语言角标与复制按钮；带 data-pw-copy 说明已经处理过 */
const decorate = (pre: HTMLElement, label: string): void => {
  pre.classList.add('pw-prose__code')
  if (pre.querySelector('[data-pw-copy]')) return
  if (label) {
    const tag = document.createElement('span')
    tag.className = 'pw-prose__lang'
    tag.setAttribute('aria-hidden', 'true')
    tag.textContent = label
    pre.append(tag)
  }
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pw-prose__copy'
  button.dataset.pwCopy = ''
  button.textContent = COPY_LABEL
  pre.append(button)
}

/** 增强 root 下所有还没处理过的代码块 */
export const enhanceCodeBlocks = async (root: HTMLElement | null): Promise<void> => {
  if (!root) return
  const pending = [...root.querySelectorAll<HTMLElement>('pre')].filter(
    (pre) => !pre.querySelector('[data-pw-copy]')
  )
  for (const pre of pending) {
    const { shikiLang, label } = detectLang(pre)
    await applyHighlight(pre, shikiLang)
    decorate(pre, label)
  }
}

/** 复制按钮的点击：由容器统一代理（`v-html` 里的节点绑不了 Vue 事件） */
export const handleCopyClick = async (event: MouseEvent): Promise<void> => {
  const target = event.target as HTMLElement | null
  const button = target?.closest<HTMLButtonElement>('[data-pw-copy]')
  if (!button) return
  const pre = button.closest('pre')
  const text = pre?.querySelector('code')?.textContent ?? ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  button.textContent = DONE_LABEL
  button.classList.add('is-done')
  window.setTimeout(() => {
    button.textContent = COPY_LABEL
    button.classList.remove('is-done')
  }, 1200)
}
