/** 消费端的纯函数示例：金额格式化 / 解析。这类文件同样可以写成交互文档。 */

export type CurrencyCode = 'CNY' | 'USD' | 'JPY' | 'EUR'

/** 币种符号 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CNY: '¥',
  USD: '$',
  JPY: '¥',
  EUR: '€',
}

/** 各币种默认小数位：日元没有小数 */
export const DEFAULT_DECIMALS: Record<CurrencyCode, number> = {
  CNY: 2,
  USD: 2,
  JPY: 0,
  EUR: 2,
}

export interface FormatMoneyOptions {
  /** 币种代码，默认 CNY */
  currency?: CurrencyCode
  /** 小数位；不传按币种默认值，传入时会被夹在 0–6 之间 */
  decimals?: number
  /** 是否加千分位，默认 true */
  thousands?: boolean
}

export interface ParsedMoney {
  /** 数值部分（已去掉符号与千分位） */
  value: number
  /** 识别出的币种；没有符号时按 CNY */
  currency: CurrencyCode
}

const groupThousands = (integer: string): string => integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/**
 * 把数值格式化成带符号与千分位的金额文本。
 *
 * @param value 金额数值，允许负数
 * @param options 币种 / 小数位 / 千分位
 */
export const formatMoney = (value: number, options: FormatMoneyOptions = {}): string => {
  const currency = options.currency ?? 'CNY'
  const raw = options.decimals ?? DEFAULT_DECIMALS[currency]
  const decimals = Math.min(6, Math.max(0, Math.trunc(Number.isFinite(raw) ? raw : 0)))
  const thousands = options.thousands ?? true

  const fixed = Math.abs(Number.isFinite(value) ? value : 0).toFixed(decimals)
  const [integer = '0', fraction] = fixed.split('.')
  const grouped = thousands ? groupThousands(integer) : integer
  const sign = value < 0 ? '-' : ''
  return `${sign}${CURRENCY_SYMBOLS[currency]}${fraction ? `${grouped}.${fraction}` : grouped}`
}

/**
 * 从用户输入里解析金额，识别不出来时返回 null（不要抛错，表单场景很常见）。
 *
 * @param text 形如 `¥1,234.50` / `$99` / `-12.5` 的文本
 */
export const parseMoney = (text: string): ParsedMoney | null => {
  const compact = text.trim().replace(/[,\s]/g, '')
  if (!compact) return null

  const currency = (Object.keys(CURRENCY_SYMBOLS) as CurrencyCode[]).find((code) =>
    compact.startsWith(CURRENCY_SYMBOLS[code])
  )
  const numeric = compact.replace(/^[^\d.-]+/, '')
  if (!/^-?\d*\.?\d+$/.test(numeric)) return null

  return { value: Number(numeric), currency: currency ?? 'CNY' }
}
