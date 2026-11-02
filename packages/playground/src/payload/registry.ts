import { shallowRef } from 'vue'

export type SceneSnapshot = Record<string, unknown>

export interface ScenePayload {
  /** 入参快照：返回当前 props / 本地状态 */
  input?: () => SceneSnapshot
  /** 出参快照：返回 emit 记录、modelValue 等 */
  output?: () => SceneSnapshot
}

/**
 * 同一时刻只有一个场景挂载，所以只需要一个"当前 payload"槽位。
 * 由场景内部的 useScenePayload 注册，面板负责轮询取快照。
 */
export const currentPayload = shallowRef<ScenePayload | null>(null)

export const setCurrentPayload = (payload: ScenePayload): void => {
  currentPayload.value = payload
}

export const clearCurrentPayload = (payload: ScenePayload): void => {
  if (currentPayload.value === payload) currentPayload.value = null
}
