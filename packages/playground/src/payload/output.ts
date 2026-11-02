import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

export type SceneSnapshot = Record<string, unknown>

/** 出参快照：由面板轮询调用，纯前端实现 */
export const currentOutput = shallowRef<(() => SceneSnapshot) | null>(null)

export const useSceneOutput = (getter: () => SceneSnapshot): void => {
  onMounted(() => {
    currentOutput.value = getter
  })
  onBeforeUnmount(() => {
    if (currentOutput.value === getter) currentOutput.value = null
  })
}
