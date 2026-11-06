/**
 * MPA 第二入口的 dev 回落匹配器。
 *
 * playground 是宿主 Vite 的第二个 HTML 入口（`playground/index.html`），路由用 History API：
 * `/_playground/tao-form/form` 在磁盘上没有对应文件。Vite 的 spa 回落只会给**根** `index.html`
 * （那是宿主主应用），所以插件必须把这类「页面请求」改写到自己的入口。
 *
 * 判据（缺一不可）：
 * 1. 路径命中 `routeBase`，且不含扩展名（`/_playground/logo.png` 是静态资源）；
 * 2. GET / HEAD；
 * 3. `Accept` 里有 `text/html`（浏览器地址栏 / 刷新；`fetch()` 拿 JSON 的请求不该被改写）。
 *
 * 导出是为了让 verify 直接测这三种拒绝路径，不用起 dev server。
 */
export const createEntryFallbackMatcher = (
  routeBase: string
): ((url: string, method?: string, accept?: string) => boolean) => {
  const base = `/${routeBase.replace(/^\/+|\/+$/g, '')}`
  const pattern = new RegExp(`^${base}(/[^.?]*)?$`)
  return (url, method = 'GET', accept = '') => {
    const upper = method.toUpperCase()
    if (upper !== 'GET' && upper !== 'HEAD') return false
    if (accept && !accept.includes('text/html')) return false
    const pathname = (url.split('#')[0] ?? '').split('?')[0] ?? ''
    return pattern.test(pathname)
  }
}
