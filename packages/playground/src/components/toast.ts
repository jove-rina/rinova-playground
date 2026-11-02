import { reactive } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: number
  text: string
  type: ToastType
}

export const toastState = reactive<ToastItem[]>([])

let seed = 0

/** 轻提示。用法：toast('已复制'), toast('保存失败', 'error') */
export function toast(text: string, type: ToastType = 'info', duration = 2400): void {
  const id = ++seed
  toastState.push({ id, text, type })
  window.setTimeout(() => {
    const index = toastState.findIndex((item) => item.id === id)
    if (index > -1) toastState.splice(index, 1)
  }, duration)
}
