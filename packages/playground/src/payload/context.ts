import { inject, provide, type InjectionKey } from 'vue'

/** 当前场景标识：由 PlaygroundSceneSection 提供，`useSceneArgs` / `useSceneOutput` 用来标记归属 */
const sceneContextKey: InjectionKey<string> = Symbol('rinova-playground:scene')

export const provideSceneContext = (name: string): void => provide(sceneContextKey, name)

/** 不在场景里调用（例如自己在别处挂组件）时返回空串 */
export const useSceneContext = (): string => inject(sceneContextKey, '')
