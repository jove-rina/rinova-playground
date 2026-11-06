/**
 * 字段展开规则回归（外部包不展开 / 32 上限 / 说明清洗）
 *
 *   pnpm verify:fields   # 自己跑并逐项打印
 *   pnpm verify          # 主脚本里跑同一组断言（汇总成 1 项）
 */
import { runFieldFixtureChecks } from './lib/field-fixture.ts'

const results = runFieldFixtureChecks()
const failed = results.filter((item) => !item.ok)

for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`)
}
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)
