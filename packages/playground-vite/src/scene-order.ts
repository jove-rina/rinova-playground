/**
 * 页内场景的排序规则（插件与 verify 共用）。
 *
 * 右侧索引按「概要 → Props → Events → Exposes → Slots」分组展示，内容区是平铺的一串；
 * 两边必须用同一个顺序，否则会出现「索引里 event-validate 在 Props 下面，正文里却在 model 上面」——
 * 真实宿主里很常见：每个 section 各自从 10 开始编号，`order` 撞车后旧的比较器退化成按 id 字母序，
 * 而 `event-validate` < `model` 正好把 Events 排到了 Props 前面。
 */
export const SECTION_ORDER = ['overview', 'props', 'events', 'exposes', 'slots'] as const

export type SceneSection = (typeof SECTION_ORDER)[number]

export const isSection = (value: unknown): value is SceneSection =>
  typeof value === 'string' && (SECTION_ORDER as readonly string[]).includes(value)

/** 未声明 section 的场景按 props 处理：索引里它显示在 Props 组，内容区也就该排在 Props 段 */
export const sceneSectionRank = (section?: SceneSection): number => {
  const index = SECTION_ORDER.indexOf((section ?? 'props') as SceneSection)
  return index === -1 ? SECTION_ORDER.indexOf('props') : index
}

export interface OrderableScene {
  section?: SceneSection
  order: number
  id: string
}

/** 分组序 → 组内 order → id（id 只用来让顺序稳定，不参与跨 section 的语义） */
export const compareScenes = (a: OrderableScene, b: OrderableScene): number =>
  sceneSectionRank(a.section) - sceneSectionRank(b.section) ||
  a.order - b.order ||
  a.id.localeCompare(b.id)

export const orderScenes = <T extends OrderableScene>(list: readonly T[]): T[] => [...list].sort(compareScenes)
