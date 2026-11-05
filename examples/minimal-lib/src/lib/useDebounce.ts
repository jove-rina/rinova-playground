/** 消费端的组合式函数示例：这类 hooks 也能写成带现场交互的文档页。 */

import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export interface UseDebounceOptions {
  /** 首次渲染就同步一次初始值，默认 true */
  immediate?: boolean
}

/**
 * 防抖：源值停止变化 `delay` 毫秒后才更新返回值。
 *
 * @param source 源值（ref / getter / 原始值都行）
 * @param delay 延迟毫秒，默认 300；传 getter 可以跟着表单实时改
 */
export const useDebounce = <T>(
  source: MaybeRefOrGetter<T>,
  delay: MaybeRefOrGetter<number> = 300,
  options: UseDebounceOptions = {}
): Ref<T> => {
  const result = ref((options.immediate === false ? undefined : toValue(source)) as T) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = watch(
    () => toValue(source),
    (next) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        result.value = next as T
      }, Math.max(0, Number(toValue(delay)) || 0))
    }
  )

  onBeforeUnmount(() => {
    stop()
    if (timer) clearTimeout(timer)
  })

  return result
}
