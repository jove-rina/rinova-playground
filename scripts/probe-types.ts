/**
 * 类型提取回归（AST 路径）
 *
 *   pnpm verify:types    # 自己跑并逐项打印
 *   pnpm verify          # 主脚本里跑同一组断言（汇总成 1 项）
 *
 * 覆盖旧实现抽不出来的四类声明：
 *   1. 字面量联合别名（type TagTone = 'neutral' | 'success' | 'danger'）
 *   2. TS enum（成员名 → values）
 *   3. 内联字面量联合（没有别名 → 只出 values，不造 types 条目）
 *   4. 交叉类型 / 混合联合 / 泛型容器里的具名类型
 * 同时确认：外部包类型（Event）不进 types，对象数组不出 values。
 */
import { runTypeFixtureChecks } from './lib/type-fixture.ts'

const results = runTypeFixtureChecks()
const failed = results.filter((item) => !item.ok)

for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)
