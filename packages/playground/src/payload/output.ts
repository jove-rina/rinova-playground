import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

export type SceneSnapshot = Record<string, unknown>

export interface SceneOutputBinding {
  /** 槽位标识，缺省 `default` */
  key: string
  /** 面板上显示的名字，等于传进来的 slot */
  label: string
  getter: () => SceneSnapshot
}

/** setup 期递增，保证面板里顺序与声明顺序一致 */
let seq = 0
type Slot = SceneOutputBinding & { order: number }

/** 当前场景挂载的全部出参槽位；由面板轮询调用，纯前端实现 */
export const currentOutputSlots = shallowRef<SceneOutputBinding[]>([])

/** 兼容旧接口：第一个槽位 */
export const currentOutput = computed<(() => SceneSnapshot) | null>(
  () => currentOutputSlots.value[0]?.getter ?? null
)

const sortSlots = (list: Slot[]): SceneOutputBinding[] =>
  [...list].sort((a, b) => a.order - b.order)

/**
 * 把场景里的响应式状态暴露成「出参」快照。
 * 一个场景多个 demo 时传 `slot` 区分，例如 `useSceneOutput(() => ({ ... }), '主按钮')`。
 */
export const useSceneOutput = (getter: () => SceneSnapshot, slot?: string): void => {
  const entry: Slot = {
    order: seq++,
    key: slot ?? 'default',
    label: slot ?? '',
    getter,
  }
  onMounted(() => {
    currentOutputSlots.value = sortSlots([...(currentOutputSlots.value as Slot[]), entry])
  })
  onBeforeUnmount(() => {
    currentOutputSlots.value = currentOutputSlots.value.filter((item) => item !== entry)
  })
}
