/** 布局选项：40 个字段，用来验证「本项目声明 + 32 个上限 + 说明清洗」 */
export interface LayoutOptions {
  /**
   * 列宽（本项目声明，用于验证字段规则）。宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；宽度会按容器等比缩放；
   *
   * This feature is not Baseline because it does not work in some browsers.
   *
   * | Chrome | Firefox | Safari |
   * | :----: | :-----: | :----: |
   * | **93** | **92** | **15.4** |
   */
  width?: string
  /** 高度 */
  height?: string
  gap?: string
  padding?: string
  align?: string
  columns?: string
  rows?: string
  minWidth?: string
  maxWidth?: string
  minHeight?: string
  maxHeight?: string
  ratio?: string
  offsetX?: string
  offsetY?: string
  sticky?: string
  zIndex?: string
  overflow?: string
  border?: string
  radius?: string
  shadow?: string
  opacity?: string
  blur?: string
  rotate?: string
  scale?: string
  order?: string
  span?: string
  wrap?: string
  dense?: string
  centered?: string
  hidden?: string
  stickyTop?: string
  stickyBottom?: string
  scrollX?: string
  scrollY?: string
  snap?: string
  snapAlign?: string
  transition?: string
  duration?: string
  delay?: string
  easing?: string
}
