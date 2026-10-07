/**
 * 节假日地区数据校验脚本
 *
 * 对 src/logic/calendar/regions/*.json 执行完整性校验，防止手写数据出错：
 *  1. 每个数据文件都必须在 regions/index.ts 的 HOLIDAY_REGIONS 中注册
 *  2. JSON 可解析且符合 schema（见 regions/types.ts）
 *  3. 休班日期真实存在、不与补班日冲突、不重复、年份不缺失
 *  4. 每年数据都标注了来源与人工核对日期
 *  5. exclude 中的节日名必须真实存在于 tyme4ts 内置表或通用节日表
 *     （库升级改名后会触发，避免排除静默失效）
 *  6. 地区下拉的 labelKey / noteKey 在 zh-CN 与 en-US 中都存在
 *     （这两个 key 是动态传给 $t 的，validate-registries 的静态扫描覆盖不到）
 *
 * 用法：
 *   pnpm exec tsx scripts/check/validate-holidays.ts
 *
 * @see src/logic/calendar/regions/README.md
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  HOLIDAY_REGIONS,
  REGION_CODES,
  isRegionCode,
} from '../../src/logic/calendar/regions'
import { validateRegionData } from '../../src/logic/calendar/regions/validate'

const REGIONS_DIR = fileURLToPath(
  new URL('../../src/logic/calendar/regions', import.meta.url),
)

let hasError = false

console.log('═══ NaiveTab 节假日地区数据校验 ═══')

const files = readdirSync(REGIONS_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort()

if (files.length === 0) {
  console.log('（暂无地区数据文件）')
}

for (const file of files) {
  // ── 注册检查 ──
  const code = file.replace(/\.json$/, '').toUpperCase()
  if (!isRegionCode(code)) {
    console.error(`❌ ${file} 未在 regions/index.ts 的 HOLIDAY_REGIONS 中注册`)
    hasError = true
  }

  // ── 解析检查 ──
  const raw = readFileSync(join(REGIONS_DIR, file), 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error(`❌ ${file} 不是合法 JSON：${(error as Error).message}`)
    hasError = true
    continue
  }

  // ── schema 与数据检查 ──
  const errors = validateRegionData(parsed, file)
  if (errors.length > 0) {
    hasError = true
    for (const error of errors) console.error(`❌ ${file} ${error}`)
  } else {
    console.log(`✅ ${file}`)
  }
}

for (const code of REGION_CODES) {
  const entry = HOLIDAY_REGIONS[code]
  const yearCount = entry.data
    ? Object.keys(entry.data.years).sort().join(', ') || '暂无年度数据'
    : '使用 tyme4ts 内置数据'
  console.log(`   ${code}（${entry.data?.scheme ?? 'library'}）：${yearCount}`)
}

// ── i18n 文案检查 ──
// 地区下拉的 labelKey / noteKey 是动态传给 $t 的，validate-registries 的静态扫描覆盖不到，
// 写错只会在界面上露出原始 key，所以在这里补一道。
const LOCALES_DIR = fileURLToPath(new URL('../../src/locales', import.meta.url))
const localeDicts: Array<[string, unknown]> = ['zh-CN', 'en-US'].map((name) => [
  name,
  JSON.parse(readFileSync(join(LOCALES_DIR, `${name}.json`), 'utf8')),
])

const pick = (dict: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      dict,
    )

for (const code of REGION_CODES) {
  const entry = HOLIDAY_REGIONS[code]
  for (const key of [entry.labelKey, entry.noteKey]) {
    for (const [name, dict] of localeDicts) {
      if (typeof pick(dict, key) !== 'string') {
        console.error(`❌ ${code} 的 i18n key「${key}」在 ${name} 中缺失`)
        hasError = true
      }
    }
  }
}

console.log()
if (hasError) {
  console.error('❌ 校验失败，请修复上述问题后重试。')
  process.exit(1)
} else {
  console.log('✅ 所有校验通过。')
  process.exit(0)
}
