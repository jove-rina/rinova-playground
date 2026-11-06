/**
 * 契约清单的后台生成线程（仅 dev 用）。
 *
 * 为什么要独立线程：`vue-component-meta` + TypeScript 的提取是**同步 CPU 活**，
 * 真实宿主（406 个组件）冷启一次约 9.7s。放在主线程里，`pnpm dev` 的 server ready
 * 被拖到 10s 以上，主应用也要跟着等 —— 这正是「启动卡在这里」的原因。
 *
 * 做成常驻 worker 而不是每次 new Worker：`manifest.ts` / `module-api.ts` 里的
 * checker / meta / program 缓存都在模块作用域，只有进程活着才能命中；
 * 单组件保存的增量（88ms）靠的就是这些缓存。
 */
import { parentPort } from 'node:worker_threads'
import path from 'node:path'
import { buildManifest, syncComponentFile, writeManifest } from './manifest.js'
import { buildModules } from './module-api.js'
import type { ManifestEnv } from './manifest.js'

export interface ManifestJob {
  root: string
  patterns: string[]
  modulePatterns: string[]
  tsconfig: string
  outDir: string
  env: ManifestEnv
  scenes: Array<{
    id: string
    title: string
    group: string
    rel: string
    lang?: 'vue' | 'md'
    sources: { rel: string }[]
  }>
}

export type ManifestWorkerMessage =
  | { type: 'generate'; id: number; job: ManifestJob }
  | { type: 'sync'; file: string }

export type ManifestWorkerResult =
  | {
      type: 'done'
      id: number
      ms: number
      components: number
      props: number
      uncovered: number
      modules: number
      functions: number
    }
  | { type: 'failed'; id: number; error: string }

/** 生成一次清单并落盘；返回给主线程的只有统计数字 */
export const runManifestJob = (job: ManifestJob): Omit<Extract<ManifestWorkerResult, { type: 'done' }>, 'type' | 'id'> => {
  const startedAt = Date.now()
  const modules = job.modulePatterns.length
    ? buildModules({ root: job.root, patterns: job.modulePatterns, tsconfig: job.tsconfig, scenes: job.scenes })
    : []
  const manifest = buildManifest({
    root: job.root,
    patterns: job.patterns,
    tsconfig: job.tsconfig,
    scenes: job.scenes,
    modules,
    env: job.env,
  })
  // 数量以实际提取结果为准（glob 命中了多少组件 / 模块）
  manifest.env.components.count = manifest.components.length
  manifest.env.modules.count = manifest.modules.length
  writeManifest(path.join(job.outDir), manifest)
  return {
    ms: Date.now() - startedAt,
    components: manifest.components.length,
    props: manifest.components.reduce((sum, item) => sum + item.props.length, 0),
    uncovered: manifest.components.reduce((sum, item) => sum + item.uncoveredProps.length, 0),
    modules: manifest.modules.length,
    functions: manifest.modules.reduce((sum, item) => sum + item.functions.length, 0),
  }
}

// 作为 worker 运行时才挂消息循环；被 import（测试 / 备用内联路径）时什么都不做
if (parentPort) {
  parentPort.on('message', (message: ManifestWorkerMessage) => {
    if (message.type === 'sync') {
      syncComponentFile(message.file)
      return
    }
    try {
      parentPort?.postMessage({ type: 'done', id: message.id, ...runManifestJob(message.job) } satisfies ManifestWorkerResult)
    } catch (error) {
      parentPort?.postMessage({
        type: 'failed',
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      } satisfies ManifestWorkerResult)
    }
  })
}
