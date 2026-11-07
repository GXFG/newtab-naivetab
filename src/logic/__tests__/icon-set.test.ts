import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Icon } from '@iconify/vue/offline'
import { ICONS, COMMAND_ICONS } from '@/logic/constants/icons'
import {
  findIconLiterals,
  lineOf,
  ICON_NAME_RE,
} from '@/logic/constants/icon-scan'
import iconSet from '@/logic/constants/icon-set.json'
// 注册副作用：与三个 UI 入口走同一条路径（common/iconify.ts → addIcon）
import '@/common/iconify'

/**
 * 图标集完整性守卫。
 *
 * `src/logic/constants/icon-set.json` 由 `pnpm gen:icons` 从 ICONS / COMMAND_ICONS
 * 生成，运行时通过 `addIcon` 逐条注册（`@iconify/vue/offline` 不做远程兜底）。
 * 这里守四个方向：
 *
 * 1. **不漏**：常量表里的图标必须都在产物里 —— 忘跑生成脚本时图标不报错、只渲染空白，
 *    这里把它变成一条失败断言。
 * 2. **不多**：产物里的图标必须都来自常量表 —— 删了常量而产物没重生成时，死条目会一直
 *    留在包里。注意这一条对「常量还在但没人用」不成立，那由下面「无未引用常量」负责。
 * 3. **没写错**：产物里的每个图标都要能真的渲染出内容 —— 生成逻辑出错或手工改坏了
 *    body，静态比对看不出来，只会在界面上表现为空白。
 * 4. **没绕过**：除 icons.ts 外不得出现图标名字面量（`.claude/rules/no-hardcode.md`）。
 *
 * 图标清单的唯一来源是常量表；本文件的源码扫描只用于第 4 条守卫。
 */
const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ICONS_FILE = join(SRC_DIR, 'logic/constants/icons.ts')

/** 常量表里的全部图标名 */
const CONSTANT_ICONS = new Set<string>([
  ...Object.values(ICONS),
  ...Object.values(COMMAND_ICONS),
])

/** 已知前缀：只有这些前缀才算「像图标」，避免把 hh:mm、update:show 之类当图标 */
const KNOWN_PREFIXES = new Set(
  [...CONSTANT_ICONS].map((name) => name.slice(0, name.indexOf(':'))),
)

/** 递归收集 src 下的 ts/vue 文件（跳过测试目录，里面是假图标名） */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      collectSourceFiles(full, acc)
    } else if (
      /\.(ts|vue)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const SOURCES = collectSourceFiles(SRC_DIR).map((file) => ({
  file,
  source: readFileSync(file, 'utf8'),
}))

describe('图标常量表', () => {
  it('图标名均为 prefix:name 形式', () => {
    const invalid = [...CONSTANT_ICONS].filter(
      (name) => !ICON_NAME_RE.test(name),
    )
    expect(invalid).toEqual([])
  })

  it('没有未被引用的常量', () => {
    // 常量表是产物唯一的输入，一条没人用的常量 = 一个永远用不到的图标被打进包里。
    // 这项检查依赖「没有动态访问 ICONS[key]」；若将来出现，请先改成显式引用。
    const unused: string[] = []
    for (const [table, entries] of [
      ['ICONS', ICONS],
      ['COMMAND_ICONS', COMMAND_ICONS],
    ] as const) {
      for (const key of Object.keys(entries)) {
        const reference = new RegExp(`${table}\\.${key}\\b`)
        if (!SOURCES.some(({ source }) => reference.test(source))) {
          unused.push(`${table}.${key}`)
        }
      }
    }
    expect(unused, '常量已无人引用：删掉它，或补上使用处').toEqual([])
  })
})

describe('图标集产物', () => {
  it('常量表里的图标都已收录', () => {
    const missing = [...CONSTANT_ICONS].filter((name) => !(name in iconSet))
    expect(missing, '产物落后于常量表：跑 pnpm gen:icons').toEqual([])
  })

  it('产物里没有常量表以外的图标', () => {
    const stale = Object.keys(iconSet).filter(
      (name) => !CONSTANT_ICONS.has(name),
    )
    expect(stale, '产物里有已删除的图标：跑 pnpm gen:icons 清掉').toEqual([])
  })

  it('每个图标都能渲染出内容', async () => {
    const blank: string[] = []
    for (const name of Object.keys(iconSet)) {
      const html = await renderToString(
        createSSRApp({ render: () => h(Icon, { icon: name }) }),
      )
      const body = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</svg>'))
      if (!html.startsWith('<svg') || !body.trim()) blank.push(name)
    }
    expect(blank, '以下图标渲染为空：检查 icon-set.json 是否被手改').toEqual([])
  })
})

describe('图标名不得硬编码', () => {
  it('除 icons.ts 外没有图标名字面量', () => {
    const hits: string[] = []
    for (const { file, source } of SOURCES) {
      if (file === ICONS_FILE) continue
      for (const { icon, index } of findIconLiterals(source, KNOWN_PREFIXES)) {
        hits.push(
          `${relative(SRC_DIR, file)}:${lineOf(source, index)} → ${icon}`,
        )
      }
    }
    expect(
      hits,
      '图标名只能写在 icons.ts 的 ICONS 里，模板用 :icon="ICONS.xxx"',
    ).toEqual([])
  })

  it('扫描规则确实在起作用（防止守卫静默通过）', () => {
    // 守卫期望「零命中」，扫描器失效时也会零命中；用 icons.ts 自身做正向标定。
    const iconsSource = readFileSync(ICONS_FILE, 'utf8')
    const found = [...findIconLiterals(iconsSource, KNOWN_PREFIXES)]
    expect(found.length).toBeGreaterThan(100)
    expect(SOURCES.length).toBeGreaterThan(100)
  })
})
