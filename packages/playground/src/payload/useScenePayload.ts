import { onBeforeUnmount, onMounted } from 'vue'
import { clearCurrentPayload, setCurrentPayload, type ScenePayload } from './registry'

/**
 * 在场景的 `<script setup>` 里调用，声明入参 / 出参快照。
 *
 * ```ts
 * const count = ref(0)
 * useScenePayload({
 *   input: () => ({ count: count.value }),
 *   output: () => ({ clicked: count.value }),
 * })
 * ```
 */
export const useScenePayload = (payload: ScenePayload): void => {
  onMounted(() => setCurrentPayload(payload))
  onBeforeUnmount(() => clearCurrentPayload(payload))
}
