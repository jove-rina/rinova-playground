import { computed, onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue'
import { useSceneContext } from './context'

export type SceneArgs = Record<string, unknown>

export interface SceneArgsOptions {
  /** 字符串字段的可选值 → 渲染成下拉框 */
  options?: Record<string, Array<string | number>>
  /** 字段标签，缺省用 key */
  labels?: Record<string, string>
  /**
   * 槽位名。一个场景里多次调用 `useSceneArgs` 时，每块入参各占一个槽位，
   * 面板按名字分块显示。只调用一次时可以省略。
   */
  slot?: string
}

export interface SceneArgsBinding {
  /** 槽位标识，缺省 `default` */
  key: string
  /** 归属场景（页内多场景时只显示当前场景的槽位） */
  sceneId: string
  /** 面板上显示的名字，等于 `options.slot` */
  label: string
  values: SceneArgs
  defaults: SceneArgs
  options: SceneArgsOptions
}

/** setup 期递增，保证面板里槽位顺序与代码里声明的顺序一致 */
let seq = 0
type Slot = SceneArgsBinding & { order: number }

/** 当前场景挂载的全部入参槽位（同一时刻只有一个场景挂载） */
export const currentArgsSlots = shallowRef<SceneArgsBinding[]>([])

/** 兼容旧接口：第一个槽位 */
export const currentArgs = computed<SceneArgsBinding | null>(
  () => currentArgsSlots.value[0] ?? null
)

const sortSlots = (list: Slot[]): SceneArgsBinding[] =>
  [...list].sort((a, b) => a.order - b.order)

/**
 * 在场景的 `<script setup>` 里声明可变入参，返回响应式对象：
 * 面板改表单 → 这里同步变化 → 组件跟着重渲染。纯浏览器能力，生产环境同样可用。
 *
 * 一个场景里有多个 demo 时，各自调用一次并传 `slot` 区分：
 * ```ts
 * const primary = useSceneArgs({ size: 'md' }, { slot: '主按钮' })
 * const ghost = useSceneArgs({ size: 'sm' }, { slot: '次按钮' })
 * ```
 */
export const useSceneArgs = <T extends SceneArgs>(
  defaults: T,
  options: SceneArgsOptions = {}
): T => {
  const values = reactive({ ...defaults }) as T
  const slot: Slot = {
    order: seq++,
    sceneId: useSceneContext(),
    key: options.slot ?? 'default',
    label: options.slot ?? '',
    values: values as SceneArgs,
    defaults: { ...defaults },
    options,
  }
  onMounted(() => {
    currentArgsSlots.value = sortSlots([...(currentArgsSlots.value as Slot[]), slot])
  })
  onBeforeUnmount(() => {
    currentArgsSlots.value = currentArgsSlots.value.filter((item) => item !== slot)
  })
  return values
}
