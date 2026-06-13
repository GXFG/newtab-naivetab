/**
 * 项目代码模式检查脚本
 *
 * 检查常见违规模式，帮助 AI 和开发者在提交前发现错误。
 *
 * 检查项：
 *  1. v-bind() 在 <style> 中使用（禁止，应用 :style + computed + var()）
 *  2. &--modifier BEM 拼接（禁止，postcss-preset-env 不支持）
 *  3. Reka Content/Overlay 组件缺少 z-index（portal 内容面板可能被遮挡）
 *
 * 用法：
 *   pnpm exec tsx scripts/check/check-patterns.ts                    # 检查 src/ 下所有文件
 *   pnpm exec tsx scripts/check/check-patterns.ts src/components/    # 检查指定路径
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '../..')
const SRC = resolve(ROOT, 'src')

interface Violation {
  file: string
  line: number
  message: string
}

/**
 * 从 Vue 文件中提取 <style> 块的行号范围
 */
function getStyleBlocks(
  content: string,
): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = []
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(0, match.index)
    const startLine = before.split('\n').length
    const blockLines = match[1].split('\n').length
    blocks.push({ start: startLine, end: startLine + blockLines })
  }
  return blocks
}

/**
 * 检查单个文件
 */
function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  let content: string

  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return violations
  }

  const isVue = filePath.endsWith('.vue')
  const lines = content.split('\n')
  const styleBlocks = isVue ? getStyleBlocks(content) : []

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]

    // 检查 1: v-bind() 在 <style> 块中
    if (isVue && line.includes('v-bind(')) {
      const inStyle = styleBlocks.some(
        (b) => lineNum >= b.start && lineNum <= b.end,
      )
      if (inStyle) {
        violations.push({
          file: filePath,
          line: lineNum,
          message:
            '禁止在 <style> 中使用 v-bind()，请改用 :style + computed + var()',
        })
      }
    }

    // 检查 2: &-- BEM modifier 拼接
    if (line.match(/&--\w/)) {
      const inStyle =
        !isVue ||
        styleBlocks.some((b) => lineNum >= b.start && lineNum <= b.end)
      if (inStyle) {
        violations.push({
          file: filePath,
          line: lineNum,
          message:
            '禁止使用 &--modifier BEM 拼接（postcss-preset-env 不支持），请写完整类名',
        })
      }
    }
  }

  return violations
}

const TARGET_EXTS = new Set(['.vue', '.css', '.scss'])
const SKIP_DIRS = new Set([
  'node_modules',
  'extension',
  'dist',
  '.git',
  '__tests__',
])

/**
 * 递归收集目录下的目标文件
 */
function collectFiles(dir: string): string[] {
  const results: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        results.push(...collectFiles(fullPath))
      }
    } else if (entry.isFile() && TARGET_EXTS.has(extname(entry.name))) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * 检查 3：Reka Portal Content/Overlay 是否缺少 z-index
 *
 * 扫描 src/styles/reka/ 下的 CSS 文件，按 __content / __overlay 类名分组，
 * 检查每个类是否至少有一个规则块设置了 z-index。Portal 内容面板缺少
 * z-index 会导致下拉面板被其他元素遮挡。
 *
 * 参考：docs/architecture/reka-ui.md#z-index-层级体系
 */
function checkRekaZIndex(): Violation[] {
  const violations: Violation[] = []
  const rekaCssDir = resolve(ROOT, 'src/styles/reka')

  if (!existsSync(rekaCssDir)) return violations

  const files = readdirSync(rekaCssDir)
    .filter((f) => f.endsWith('.css') && f !== 'index.css')
    .map((f) => resolve(rekaCssDir, f))

  for (const filePath of files) {
    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }

    // 收集所有 __content / __overlay 类名及其是否有 z-index
    const classZIndex = new Map<
      string,
      { hasZIndex: boolean; firstLine: number }
    >()

    // 匹配包含 .reka-*__content 或 .reka-*__overlay 的 CSS 规则块
    // 兼容深色模式等复合选择器（如 :root[data-theme='dark'] .reka-xxx__content）
    const ruleRegex = /([^{]*(\.reka-\w+__(?:content|overlay))\b[^{]*)\{/g
    let match: RegExpExecArray | null

    while ((match = ruleRegex.exec(content)) !== null) {
      const className = match[2]
      const blockStart = match.index + match[0].length
      const before = content.slice(0, match.index)
      const lineNum = before.split('\n').length

      // 找到匹配的 }
      let depth = 1
      let pos = blockStart
      while (depth > 0 && pos < content.length) {
        if (content[pos] === '{') depth++
        else if (content[pos] === '}') depth--
        pos++
      }
      const block = content.slice(blockStart, pos - 1)

      const existing = classZIndex.get(className)
      if (existing) {
        // 已有记录，如果之前没有 z-index 但当前有，更新状态
        if (!existing.hasZIndex && /z-index\s*:/.test(block)) {
          existing.hasZIndex = true
        }
      } else {
        classZIndex.set(className, {
          hasZIndex: /z-index\s*:/.test(block),
          firstLine: lineNum,
        })
      }
    }

    // 报告缺少 z-index 的类
    for (const [className, info] of classZIndex) {
      if (!info.hasZIndex) {
        violations.push({
          file: filePath,
          line: info.firstLine,
          message: `"${className}" 缺少 z-index（Portal 内容面板可能被遮挡，参考 docs/architecture/reka-ui.md#z-index-层级体系）`,
        })
      }
    }
  }

  return violations
}

// --- main ---
const args = process.argv.slice(2)
const targetDirs = args.length > 0 ? args.map((a) => resolve(ROOT, a)) : [SRC]

const files = targetDirs.flatMap((d) => (existsSync(d) ? collectFiles(d) : []))
let allViolations: Violation[] = []

for (const file of files) {
  if (!existsSync(file)) continue
  allViolations = allViolations.concat(checkFile(file))
}

// 额外检查：Reka 组件 z-index
allViolations = allViolations.concat(checkRekaZIndex())

if (allViolations.length > 0) {
  console.error('\n发现以下代码模式违规:\n')
  for (const v of allViolations) {
    const relPath = relative(ROOT, v.file)
    console.error(`  ${relPath}:${v.line}  ${v.message}`)
  }
  console.error(
    `\n共 ${allViolations.length} 处违规。详见 .claude/rules/pitfalls-css.md\n`,
  )
  process.exit(1)
}

console.log('代码模式检查通过')
