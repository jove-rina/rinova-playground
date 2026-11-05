/** 消费端的常量字典示例：枚举 / 状态映射这类文件，文档形态就是一张对照表。 */

export type OrderStatus = 'draft' | 'pending' | 'paid' | 'shipped' | 'closed'
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface OrderStatusMeta {
  /** 中文标签，界面上直接用 */
  label: string
  /** 展示色调，对应 --rp-color-* 里的语义色 */
  tone: StatusTone
  /** 是否终态：终态不再流转，按钮要禁用 */
  final: boolean
}

/** 订单状态字典：key 是接口返回值，值是展示信息 */
export const ORDER_STATUS: Record<OrderStatus, OrderStatusMeta> = {
  draft: { label: '草稿', tone: 'neutral', final: false },
  pending: { label: '待付款', tone: 'warning', final: false },
  paid: { label: '已付款', tone: 'success', final: false },
  shipped: { label: '已发货', tone: 'success', final: false },
  closed: { label: '已关闭', tone: 'danger', final: true },
}

/** 给下拉框 / 循环渲染用的数组形式，保持声明顺序 */
export const ORDER_STATUS_LIST = (Object.keys(ORDER_STATUS) as OrderStatus[]).map((value) => ({
  value,
  ...ORDER_STATUS[value],
}))
