import { onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue'

export type SceneArgs = Record<string, unknown>

export interface SceneArgsOptions {
  /** 字符串字段的可选值 → 渲染成下拉框 */
  options?: Record<string, Array<string | number>>
  /** 字段标签，缺省用 key */
  labels?: Record<string, string>
}

export interface SceneArgsBinding {
  values: SceneArgs
  defaults: SceneArgs
  options: SceneArgsOptions
}

/** 同一时刻只有一个场景挂载，所以只需要一个"当前入参"槽位 */
export const currentArgs = shallowRef<SceneArgsBinding | null>(null)

/**
 * 在场景的 `<script setup>` 里声明可变入参，返回响应式对象：
 * 面板改表单 → 这里同步变化 → 组件跟着重渲染。纯浏览器能力，生产环境同样可用。
 */
export const useSceneArgs = <T extends SceneArgs>(
  defaults: T,
  options: SceneArgsOptions = {}
): T => {
  const values = reactive({ ...defaults }) as T
  const binding: SceneArgsBinding = { values: values as SceneArgs, defaults: { ...defaults }, options }
  onMounted(() => {
    currentArgs.value = binding
  })
  onBeforeUnmount(() => {
    if (currentArgs.value === binding) currentArgs.value = null
  })
  return values
}
