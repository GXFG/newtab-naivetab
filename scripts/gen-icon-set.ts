/**
 * 离线图标集生成脚本
 *
 * 输入：`src/logic/constants/icons.ts` 的 ICONS / COMMAND_ICONS —— 图标名的唯一来源。
 * 输出：`src/logic/constants/icon-set.json` —— 扁平「图标名 → 图标数据」映射，
 *       由 `src/common/iconify.ts` 启动时逐条 `addIcon` 注册。
 *
 * 为什么以常量表为输入：项目规则禁止在模板里硬编码图标名，图标名只存在于常量表。
 * 早先的版本扫描源码里的字面量来「猜」用了哪些图标，那一步自带三类误判
 * （注释里的带引号名称被打进产物、数字开头的图标名扫不到、未知前缀要靠手工白名单挡），
 * 而它产出的信息量与常量表完全一致。现在正则只保留守卫职责。
 *
 * 数据源：`@iconify/json` 全量包（装在 devDependencies 里，`json/<prefix>.json`）。
 * 只装一个包而不是几十个 `@iconify-json/<prefix>`：装包体积大一些，换来的是
 * 「新增图标集不需要改依赖」和「所有集合只有一个版本号」。产物必须能由
 * `pnpm gen:icons` 现场复现 —— CI 会重跑并与提交的产物比对（`pnpm check:icons`）。
 *
 * 用法：
 *   pnpm gen:icons            # 生成并写入 src/logic/constants/icon-set.json
 *   pnpm check:icons          # 同 --check：只在内存里生成，与磁盘产物比对，不写文件
 *   tsx scripts/gen-icon-set.ts --check
 * 退出码：出现「常量值格式非法 / 缺数据包（含安装不完整）/ 未知图标集前缀 / 图标名不存在」时为 1，
 * 且不写产物；`--check` 模式下产物与常量表不一致也为 1。
 *
 * 为什么自建而不是用库：`@iconify/*` 只提供「给定集合的数据与解析」，没有任何库能
 * 「从项目的常量表挑出图标、按项目规则报错、写出可提交的产物」—— 这段是项目约定，
 * 不是通用能力。解析本身已经交给 `@iconify/utils`（见 icon-set-build.ts）。
 *
 * 集合 JSON 的数据结构见 https://iconify.design/docs/types/iconify-json.html
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { green, yellow, red } from 'kolorist'
import { r } from './utils'
import { ICONS, COMMAND_ICONS } from '../src/logic/constants/icons'
import {
  buildIconMap,
  type IconifyCollectionData,
  type IconifyIconData,
} from '../src/logic/constants/icon-set-build'
import { ICON_NAME_RE } from '../src/logic/constants/icon-scan'

/** 全量包的集合目录：`@iconify/json/json/<prefix>.json` */
const DATA_DIR = r('node_modules/@iconify/json/json')
/** 全量包的集合清单：用来区分「前缀拼错了」和「数据包没装」 */
const COLLECTIONS_FILE = r('node_modules/@iconify/json/collections.json')
const OUT_FILE = r('src/logic/constants/icon-set.json')
/** `--check`：只比对不落盘（CI / pre-commit 用） */
const CHECK = process.argv.includes('--check')

/** 常量表里的全部图标名 → 引用它的常量（报错时指明该改哪一行） */
function collectIconOwners(): Map<string, string[]> {
  const owners = new Map<string, string[]>()

  const add = (table: string, entries: Record<string, string>) => {
    for (const [key, name] of Object.entries(entries)) {
      const list = owners.get(name) ?? []
      list.push(`${table}.${key}`)
      owners.set(name, list)
    }
  }

  add('ICONS', ICONS)
  add('COMMAND_ICONS', COMMAND_ICONS)
  return owners
}

const readCollection = (prefix: string): IconifyCollectionData | null => {
  const file = join(DATA_DIR, `${prefix}.json`)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as IconifyCollectionData
}

/** 全量包里有哪些集合前缀 —— 只看文件名，不解析内容 */
function readKnownPrefixes(): Set<string> {
  return new Set(
    Object.keys(
      JSON.parse(readFileSync(COLLECTIONS_FILE, 'utf8')) as Record<
        string,
        unknown
      >,
    ),
  )
}

function main() {
  const owners = collectIconOwners()

  // 1. 常量值必须是 prefix:name，否则下面按前缀分组没有意义
  const invalidNames = [...owners].filter(([name]) => !ICON_NAME_RE.test(name))
  if (invalidNames.length) {
    console.error(
      red(`\n✖ ${invalidNames.length} 个常量值不是 prefix:name 形式：`),
    )
    for (const [name, refs] of invalidNames) {
      console.error(`    "${name}"  ← ${refs.join(', ')}`)
    }
    console.error(yellow('  图标名形如 mdi:close（小写、连字符分段）。'))
    process.exitCode = 1
    return
  }

  // 2. 数据包必须存在：产物要能由仓库自身复现，不能靠「人记得装过」
  if (!existsSync(COLLECTIONS_FILE) || !existsSync(DATA_DIR)) {
    console.error(red('\n✖ 缺少图标数据包 @iconify/json'))
    console.error('  请安装后重跑：pnpm add -D @iconify/json')
    process.exitCode = 1
    return
  }

  // 3. 按前缀分组
  const prefixOwners = new Map<string, string[]>()
  for (const [name, refs] of owners) {
    const prefix = name.slice(0, name.indexOf(':'))
    prefixOwners.set(prefix, [...(prefixOwners.get(prefix) ?? []), ...refs])
  }

  // 4. 全量包在手还找不到集合，只可能是前缀写错 —— 单独报，别让人去装包
  const knownPrefixes = readKnownPrefixes()
  const unknownPrefixes = [...prefixOwners.keys()]
    .filter((prefix) => !knownPrefixes.has(prefix))
    .sort()
  if (unknownPrefixes.length) {
    console.error(red(`\n✖ ${unknownPrefixes.length} 个图标集前缀不存在：`))
    for (const prefix of unknownPrefixes) {
      console.error(`    ${prefix}  ← ${prefixOwners.get(prefix)!.join(', ')}`)
    }
    console.error(yellow('  前缀拼写错误，或该集合尚未发布到 Iconify。'))
    process.exitCode = 1
    return
  }

  const collections = new Map<string, IconifyCollectionData | null>()
  const unreadablePrefixes: string[] = []
  for (const prefix of [...prefixOwners.keys()].sort()) {
    const collection = readCollection(prefix)
    collections.set(prefix, collection)
    if (!collection) unreadablePrefixes.push(prefix)
  }

  if (unreadablePrefixes.length) {
    console.error(
      yellow(
        `\n⚠ ${unreadablePrefixes.length} 个图标集在数据包中读不到，产物未写入：`,
      ),
    )
    for (const prefix of unreadablePrefixes) {
      console.error(
        `    ${prefix}.json  ← ${prefixOwners.get(prefix)!.join(', ')}`,
      )
    }
    console.error('  数据包可能安装不完整，请重新 pnpm install 后重跑。')
    process.exitCode = 1
    return
  }

  // 5. 摊平别名、合并集合默认尺寸
  const { icons, missing } = buildIconMap(collections, owners.keys())

  const badIcons = missing.filter((item) => item.reason === 'icon')
  if (badIcons.length) {
    console.error(red(`\n✖ ${badIcons.length} 个图标名在对应集合中不存在：`))
    for (const { name } of badIcons) {
      console.error(`    ${name}  ← ${owners.get(name)!.join(', ')}`)
    }
    console.error(
      yellow('  图标名不存在或别名链断开会渲染成空白，请修正后重跑。'),
    )
    process.exitCode = 1
    return
  }

  const content = `${JSON.stringify(icons, null, 2)}\n`

  if (CHECK) {
    process.exitCode = verifyIconSet(content) ? 0 : 1
    return
  }

  writeFileSync(OUT_FILE, content)

  const rel = relative(r(), OUT_FILE)
  console.log(
    green('✔ 图标集已生成'),
    `${Object.keys(icons).length} 个图标 / ${collections.size} 个图标集`,
  )
  console.log(`  → ${rel}`)
}

/**
 * `--check` 模式：只在内存里生成，与磁盘上的产物比对，不写文件。
 *
 * 为什么是「与文件比」而不是 `git diff --exit-code`：
 *  - 不依赖 git 状态。`git diff` 比较的是 index 与工作区，产物未被跟踪时整条校验是空跑；
 *    比对文件内容则与 git 无关，`git add` 与否都能拦。
 *  - 不覆盖证据。旧写法先重生成再比对，等于把「产物被人手改过」这个现场先抹掉；
 *    这里不落盘，改坏的文件会如实报 diff。
 *  - 报错能说清差在哪：给出新增／移除／图形数据变化的图标名，而不是让 56KB JSON 刷屏。
 */
function verifyIconSet(content: string): boolean {
  const rel = relative(r(), OUT_FILE)
  const expected = JSON.parse(content) as Record<string, IconifyIconData>

  if (!existsSync(OUT_FILE)) {
    console.error(red(`\n✖ ${rel} 不存在`))
    console.error(yellow('  运行 pnpm gen:icons 生成后一并提交。'))
    return false
  }

  const actual = readFileSync(OUT_FILE, 'utf8')
  if (actual === content) {
    console.log(
      green('✔ 图标集与常量表一致'),
      `${Object.keys(expected).length} 个图标`,
    )
    return true
  }

  let current: Record<string, IconifyIconData>
  try {
    current = JSON.parse(actual) as Record<string, IconifyIconData>
  } catch (error) {
    console.error(red(`\n✖ ${rel} 不是合法 JSON`))
    console.error(`  ${(error as Error).message}`)
    console.error(yellow('  运行 pnpm gen:icons 重写产物。'))
    return false
  }

  const added = Object.keys(expected).filter((name) => !(name in current))
  const removed = Object.keys(current).filter((name) => !(name in expected))
  const changed = Object.keys(expected).filter(
    (name) =>
      name in current &&
      JSON.stringify(expected[name]) !== JSON.stringify(current[name]),
  )

  console.error(red(`\n✖ ${rel} 落后于常量表`))
  console.error(
    `  应有 ${Object.keys(expected).length} 个图标，磁盘上有 ${Object.keys(current).length} 个`,
  )
  const show = (label: string, names: string[]) => {
    if (!names.length) return
    const preview = names.slice(0, 8).join(', ')
    const rest = names.length > 8 ? ` 等 ${names.length} 个` : ''
    console.error(`    ${label}：${preview}${rest}`)
  }
  show('新增', added)
  show('移除', removed)
  show('图形数据变化', changed)
  console.error(yellow('  修复：pnpm gen:icons → git add ' + rel))
  return false
}

main()
