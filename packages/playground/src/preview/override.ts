import { shallowReactive } from 'vue'

export interface PreviewOverride {
  /** Vite dev server 上的模块 URL（/@fs/...） */
  src: string
  /** 每次更新自增，用来强制重挂载 */
  rev: number
}

/** 场景 id → 编辑态实时预览模块 */
export const previewOverrides = shallowReactive(new Map<string, PreviewOverride>())

let rev = 0

export const getPreviewOverride = (id: string): PreviewOverride | undefined => previewOverrides.get(id)

export const clearPreviewOverride = (id: string): void => {
  previewOverrides.delete(id)
}

/**
 * 把编辑器里的代码交给 dev server 编译（写到点号开头的临时文件，不动用户源码），
 * 返回可 import 的模块 URL。生产环境没有该接口，会抛错，由调用方降级。
 */
export const applyPreview = async (sceneId: string, code: string): Promise<PreviewOverride> => {
  const response = await fetch('/__pw/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sceneId, code }),
  })

  if (!response.ok) throw new Error(await response.text())

  const payload = (await response.json()) as { src?: string }
  if (!payload.src) throw new Error('dev server 未返回预览模块地址')

  const override: PreviewOverride = { src: payload.src, rev: ++rev }
  previewOverrides.set(sceneId, override)
  return override
}
