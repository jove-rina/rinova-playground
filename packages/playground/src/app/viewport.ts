/**
 * 预览宽度：设备预设 + 自定义，行业通用的几个档位。
 *
 * 名称与数值对齐 Chrome DevTools / Storybook 的默认视口：
 * 手机 390（iPhone 14/15 逻辑宽）、平板 820（iPad Air 竖屏）、桌面 1280（笔记本基准）。
 * 非自适应时给一层设备外壳（手机 / 平板 / 桌面窗口），看起来就是"装进设备里"。
 */

export type ViewportId = 'auto' | 'mobile' | 'tablet' | 'desktop' | 'custom'
export type DeviceShell = 'none' | 'phone' | 'tablet' | 'desktop'

export interface ViewportState {
  id: ViewportId
  /** 自定义宽度（px）；预设模式下为 0 */
  px: number
}

export interface ViewportPreset {
  id: Exclude<ViewportId, 'custom'>
  label: string
  /** 0 表示自适应 */
  px: number
  shell: DeviceShell
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: 'auto', label: '自适应', px: 0, shell: 'none' },
  { id: 'mobile', label: '手机', px: 390, shell: 'phone' },
  { id: 'tablet', label: '平板', px: 820, shell: 'tablet' },
  { id: 'desktop', label: '桌面', px: 1280, shell: 'desktop' },
]

/** 自定义宽度的可输入范围，超出就夹住 */
export const CUSTOM_WIDTH = { min: 320, max: 1920 } as const

/** 自定义宽度按大小自动挑外壳，避免 380px 却套桌面窗口 */
export const shellOf = (px: number): DeviceShell => {
  if (px < 640) return 'phone'
  if (px < 1024) return 'tablet'
  return 'desktop'
}

export const clampWidth = (px: number): number =>
  Math.min(CUSTOM_WIDTH.max, Math.max(CUSTOM_WIDTH.min, Math.round(px)))

export interface ResolvedViewport {
  id: ViewportId
  /** 0 = 自适应（不限制宽度） */
  px: number
  shell: DeviceShell
  label: string
}

export const resolveViewport = (state: ViewportState): ResolvedViewport => {
  if (state.id === 'custom') {
    const px = clampWidth(state.px || 480)
    return { id: 'custom', px, shell: shellOf(px), label: `自定义 ${px}px` }
  }
  const preset = VIEWPORT_PRESETS.find((item) => item.id === state.id) ?? VIEWPORT_PRESETS[0]!
  return { ...preset, label: preset.px ? `${preset.label} ${preset.px}px` : preset.label }
}

export const DEFAULT_VIEWPORT: ViewportState = { id: 'auto', px: 0 }
