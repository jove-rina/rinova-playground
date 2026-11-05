/** 测试床插件共用的类型：场景和插件 UI 都从这里取，避免各写一份 */
export interface DemoUser {
  id: string
  name: string
  role: string
  token: string
}

export interface AuthApi {
  /** 当前登录用户（reactive，切换账号后场景会立刻跟着变） */
  user: DemoUser
  /** 可切换的演示账号 */
  users: DemoUser[]
  /** 切换账号：只改插件状态，不动路由 */
  switchTo: (id: string) => void
}
