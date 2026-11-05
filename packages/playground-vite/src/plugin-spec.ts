import path from 'node:path'

const toPosix = (value: string): string => value.split(path.sep).join('/')

/**
 * 插件模块路径 → Vite 能解析的 specifier。
 *
 * `./x` 相对项目根解析成 `/x`；`/x`、`@/x`、裸包名原样返回（交给 Vite 的 alias / resolve）。
 * 越出项目根的相对路径直接拒绝。
 */
export const resolvePluginSpecifier = (root: string, spec: string): string => {
  const value = spec.trim()
  if (!value) throw new Error('插件路径不能为空')
  if (value.startsWith('../')) throw new Error(`插件路径不能越出项目根：${value}`)
  if (!value.startsWith('./')) return value
  const base = path.resolve(root)
  const absolute = path.resolve(base, value)
  if (absolute !== base && !absolute.startsWith(base + path.sep)) {
    throw new Error(`插件路径不能越出项目根：${value}`)
  }
  return `/${toPosix(path.relative(base, absolute))}`
}
