import { reactive } from 'vue'
import { definePlaygroundPlugin } from '@rinova/playground'
import AccountMenu from './AccountMenu.vue'
import EnvBadge from './EnvBadge.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import ThemeFrame from './ThemeFrame.vue'
import type { AuthApi, DemoUser } from './types'

/**
 * 演示用的假登录态：真实项目里换成 fetch('/api/me')，不要写死 token。
 * 三个角色是为了验证「切换账号后，场景与抽屉同时变」。
 */
const demoUsers: DemoUser[] = [
  { id: 'liting', name: '李婷', role: 'admin', token: 'mock-token-8f3a2c' },
  { id: 'wangrui', name: '王锐', role: 'editor', token: 'mock-token-2b7d10' },
  { id: 'chenmo', name: '陈默', role: 'viewer', token: 'mock-token-91e4f7' },
]

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 测试床插件：三件事各用一个插件，正好覆盖四种挂载点。
 * 只演示接法，不是框架内置能力 —— 登录态、请求层、mock 都由消费端自己写。
 */
export default [
  // 1) 异步初始化 + 可切换的账号状态：真实项目里这里请求 /me，拿不到就抛错（默认整页报错）
  definePlaygroundPlugin({
    name: 'auth',
    async setup() {
      await sleep(400)
      // reactive：场景里读 auth.user 的地方在切换账号后立刻重渲染
      const state = reactive<AuthApi>({
        user: demoUsers[0] as DemoUser,
        users: demoUsers,
        switchTo: (id: string) => {
          const next = demoUsers.find((item) => item.id === id)
          if (next) state.user = next
        },
      })
      return state
    },
  }),

  // 2) 包裹层：config-provider / router 这类必须包住 demo 才生效的东西
  definePlaygroundPlugin({
    name: 'locale',
    setup(ctx) {
      ctx.wrap(ThemeFrame)
      // 串行初始化：排在前面的 auth 已经完成，这里一定读得到
      const auth = ctx.get<AuthApi>('auth')
      if (auth) console.info(`[demo] 当前演示用户：${auth.user.name}`)
    },
  }),

  // 3) UI 缝位：页头一个当前用户、侧栏底部一个环境标识、一个抽屉（里面能切换账号）
  definePlaygroundPlugin({
    name: 'account',
    setup(ctx) {
      ctx.ui.panel({ id: 'account', title: '演示环境', component: EnvironmentPanel })
      ctx.ui.header({ component: AccountMenu })
      ctx.ui.sidebarFooter({ component: EnvBadge })
    },
  }),
]
