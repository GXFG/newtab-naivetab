/**
 * 注册点完整性校验脚本
 *
 * 自动检查 Widget/Command 的注册完整性，防止遗漏关键注册点。
 * 同时在 lint-staged 中作为 i18n key 同步校验使用。
 *
 * 用法：
 *   pnpm exec esno scripts/validate-registries.ts          # 全量校验
 *   pnpm exec esno scripts/validate-registries.ts i18n     # 仅校验 i18n
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'src')

// ─── 工具函数 ───────────────────────────────────────────────

let hasError = false

const error = (msg: string) => {
  console.error(`  ❌ ${msg}`)
  hasError = true
}

const ok = (msg: string) => {
  console.log(`  ✅ ${msg}`)
}

const section = (title: string) => {
  console.log(`\n▸ ${title}`)
}

// 读取并解析 JSON 文件
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf-8')) as T

// 从 TypeScript 源码中提取常量数组（简单字符串匹配）
const extractArrayItems = (source: string, varName: string): string[] => {
  const regex = new RegExp(
    `export const ${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`,
  )
  const match = source.match(regex)
  if (!match) return []
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

// 从源码中提取 WidgetConfigByCode 的 keys
const extractRegistryKeys = (source: string): string[] => {
  const regex = /export type WidgetConfigByCode\s*=\s*\{([\s\S]*?)\}/
  const match = source.match(regex)
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim().match(/^(\w+):/)?.[1])
    .filter(Boolean) as string[]
}

// 从源码中提取 ICONS 的 keys
const extractIconKeys = (source: string): string[] => {
  const regex = /export const ICONS\s*=\s*\{([\s\S]*?)\n\}/
  const match = source.match(regex)
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim().match(/^(\w+):/)?.[1])
    .filter(Boolean) as string[]
}

// 从源码中提取 WIDGET_ICON_META 的 keys
const extractWidgetIconMetaKeys = (source: string): string[] => {
  const regex =
    /export const WIDGET_ICON_META\s*:\s*Record<WidgetCodes,\s*WidgetIconMeta>\s*=\s*\{([\s\S]*?)\n\}/
  const match = source.match(regex)
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim().match(/^(\w+):/)?.[1])
    .filter(Boolean) as string[]
}

// 深度获取 JSON 对象的所有 key
const deepKeys = (obj: unknown, prefix = ''): string[] => {
  if (!obj || typeof obj !== 'object') return []
  const keys: string[] = []
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    const v = (obj as Record<string, unknown>)[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...deepKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

// ─── 校验函数 ───────────────────────────────────────────────

/**
 * 校验 1：Widget config 有文件但 codes.ts 未注册
 */
const checkUnregisteredWidgets = () => {
  section('Widget 注册完整性')

  const codesSource = readFileSync(
    resolve(SRC, 'common/widget-constants.ts'),
    'utf-8',
  )
  const codeList = extractArrayItems(codesSource, 'WIDGET_CODE_LIST')

  // 扫描所有 widget config.ts 文件
  const widgetsDir = resolve(SRC, 'newtab/widgets')
  const widgetDirs = readdirSync(widgetsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)

  const configFiles = widgetDirs.filter((dir: string) =>
    existsSync(resolve(widgetsDir, dir, 'config.ts')),
  )

  const unregistered = configFiles.filter((f: string) => !codeList.includes(f))
  const orphaned = codeList.filter((c: string) => !configFiles.includes(c))

  if (unregistered.length > 0) {
    error(
      `config.ts 存在但未在 WIDGET_CODE_LIST 注册: ${unregistered.join(', ')}`,
    )
  } else {
    ok('所有 widget config 均已注册到 WIDGET_CODE_LIST')
  }

  if (orphaned.length > 0) {
    error(`WIDGET_CODE_LIST 中有但无对应目录: ${orphaned.join(', ')}`)
  } else {
    ok('WIDGET_CODE_LIST 中所有 code 均有对应目录')
  }

  // 校验 2：Widget 在 codes.ts 但 WIDGET_ICON_META 无条目
  const iconsSource = readFileSync(
    resolve(SRC, 'logic/constants/icons.ts'),
    'utf-8',
  )
  const widgetIconMetaKeys = extractWidgetIconMetaKeys(iconsSource)
  const missingIconMeta = codeList.filter(
    (c: string) => !widgetIconMetaKeys.includes(c),
  )

  if (missingIconMeta.length > 0) {
    error(`Widget 缺少 WIDGET_ICON_META 注册: ${missingIconMeta.join(', ')}`)
  } else {
    ok('所有 Widget 均已在 WIDGET_ICON_META 中注册')
  }

  // 校验 3：Widget 在 codes.ts 但 WidgetConfigByCode 无类型映射
  const registrySource = readFileSync(
    resolve(SRC, 'common/widget-constants.ts'),
    'utf-8',
  )
  const registryKeys = extractRegistryKeys(registrySource)
  const missingRegistry = codeList.filter(
    (c: string) => !registryKeys.includes(c),
  )

  if (missingRegistry.length > 0) {
    error(
      `Widget 缺少 WidgetConfigByCode 类型映射: ${missingRegistry.join(', ')}`,
    )
  } else {
    ok('所有 Widget 均已在 WidgetConfigByCode 中注册类型')
  }
}

/**
 * 校验 5：Command 在 keymap 但不在 CATEGORIES
 */
const checkCommandConsistency = () => {
  section('Command 注册一致性')

  const shortcutSource = readFileSync(
    resolve(SRC, 'logic/shortcut/shortcut-command.ts'),
    'utf-8',
  )

  // 提取 COMMAND_CATEGORIES 中所有 command
  const commandsInCategories = extractCategoryCommands(shortcutSource)

  // 提取 keymap 中所有 command
  const commandsInKeymap = extractKeymapCommands(shortcutSource)

  const missing = commandsInKeymap.filter(
    (c) => !commandsInCategories.includes(c),
  )

  if (missing.length > 0) {
    error(`keymap 中的命令未在 COMMAND_CATEGORIES 声明: ${missing.join(', ')}`)
  } else {
    ok('keymap 中所有命令均已在 COMMAND_CATEGORIES 中声明')
  }
}

const extractCategoryCommands = (source: string): string[] => {
  // 匹配 { command: 'xxx', ... } 或 { command: 'xxx', execEnv: 'cs' as const, ... }
  const regex = /command:\s*['"](\w+)['"]/g
  const commands: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(source)) !== null) {
    commands.push(match[1])
  }
  return [...new Set(commands)]
}

const extractKeymapCommands = (source: string): string[] => {
  // 匹配 keymap: { ... } 内的 command: 'xxx'
  const keymapStart = source.indexOf('keymap:')
  if (keymapStart === -1) return []
  // 找到 keymap 的结束位置（匹配 as Record）
  const keymapEnd = source.indexOf('as Record', keymapStart)
  const keymapSection = source.slice(keymapStart, keymapEnd)
  const regex = /command:\s*['"](\w+)['"]/g
  const commands: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(keymapSection)) !== null) {
    commands.push(match[1])
  }
  return [...new Set(commands)]
}

/**
 * 校验 6：i18n key 同步
 */
const checkI18nSync = () => {
  section('i18n key 同步')

  const zhPath = resolve(SRC, 'locales/zh-CN.json')
  const enPath = resolve(SRC, 'locales/en-US.json')

  if (!existsSync(zhPath) || !existsSync(enPath)) {
    error('locale 文件不存在')
    return
  }

  const zh = readJson<Record<string, unknown>>(zhPath)
  const en = readJson<Record<string, unknown>>(enPath)

  const zhKeys = new Set(deepKeys(zh))
  const enKeys = new Set(deepKeys(en))

  const zhOnly = [...zhKeys].filter((k) => !enKeys.has(k))
  const enOnly = [...enKeys].filter((k) => !zhKeys.has(k))

  if (zhOnly.length > 0) {
    error(
      `仅在 zh-CN.json 中的 key (${zhOnly.length} 个): ${zhOnly.slice(0, 10).join(', ')}${zhOnly.length > 10 ? ' ...' : ''}`,
    )
  } else {
    ok('zh-CN.json 无多余 key')
  }

  if (enOnly.length > 0) {
    error(
      `仅在 en-US.json 中的 key (${enOnly.length} 个): ${enOnly.slice(0, 10).join(', ')}${enOnly.length > 10 ? ' ...' : ''}`,
    )
  } else {
    ok('en-US.json 无多余 key')
  }

  if (zhOnly.length === 0 && enOnly.length === 0) {
    ok(`i18n key 完全同步 (${zhKeys.size} keys)`)
  }
}

// ─── 主入口 ───────────────────────────────────────────────

const args = process.argv.slice(2)
const mode = args[0]

if (mode === 'i18n') {
  checkI18nSync()
} else {
  console.log('═══ NaiveTab 注册点完整性校验 ═══')
  checkUnregisteredWidgets()
  checkCommandConsistency()
  checkI18nSync()

  console.log()
  if (hasError) {
    console.error('❌ 校验失败，请修复上述问题后重试。')
    process.exit(1)
  } else {
    console.log('✅ 所有校验通过。')
    process.exit(0)
  }
}
