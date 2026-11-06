/**
 * 改动影响面分析
 *
 * 回答一个问题：**改这个文件，会波及谁、要跑哪些测试、有哪些已知坑。**
 *
 * 边界检查负责"拦住错的"，这个脚本负责"让 AI 做对"——改动共享层之前先看清
 * 影响范围，比事后被检查拦下便宜得多。
 *
 * 用法：
 *   pnpm impact src/logic/config/defaults.ts     # 分析单个文件
 *   pnpm impact src/logic/config                 # 分析整个目录
 *   pnpm impact src/logic/config --depth 2       # 限制间接依赖展示层数
 *
 * 数据来源与 check-boundaries 共用 scripts/check/lib/import-graph.ts，
 * 保证两边看到的是同一张依赖图。
 */

import { existsSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import {
  ROOT,
  SRC,
  buildFullGraph,
  collectFiles,
  contextOf,
  reverseGraph,
} from './lib/import-graph'

interface RiskRule {
  match: (relToSrc: string) => boolean
  tip: string
}

/** 已知的高风险区，来自 .claude/rules/ 与踩坑文档 */
const RISK_RULES: RiskRule[] = [
  {
    match: (rel) => rel.startsWith('logic/config/'),
    tip: '配置层：结构变更必须在 MIGRATION_STEPS 追加步骤（导入路径不经过 handleAppUpdate），否则老用户数据会静默丢失',
  },
  {
    match: (rel) => rel === 'common/widget-constants.ts',
    tip: 'Widget 注册核心：影响全部 Widget、迁移步骤与后台缓存，改完必须跑全量测试',
  },
  {
    match: (rel) => rel.startsWith('logic/keyboard/'),
    tip: '键盘层：字段重命名/删除必须同步修改 src/background/config/cache.ts',
  },
  {
    match: (rel) => rel.startsWith('logic/shortcut/'),
    tip: '快捷键层：命令被 4 个执行上下文共用，改动后需逐一验证',
  },
  {
    match: (rel) => rel.startsWith('logic/utils/'),
    tip: '基础设施层：被各上下文广泛依赖，改动前先跑 pnpm test 记录基线',
  },
  {
    match: (rel) => rel.startsWith('logic/image/'),
    tip: '背景图系统：涉及存储与渲染两条链路，注意 storage.md 的约定',
  },
]

const isTestFile = (file: string): boolean =>
  file.includes('/__tests__/') || file.endsWith('.test.ts')

/**
 * 项目内一级目录按「是否独立入口」区分：newtab / CS / SW / popup / options 各有自己的
 * 入口与运行环境（详见 CLAUDE.md「执行上下文」）。logic / components / setting 只是
 * 被这些入口共享的模块层，不算上下文。
 */
const EXECUTION_CONTEXTS = new Set([
  'newtab',
  'contentScripts',
  'background',
  'popup',
  'options',
])

/** 列表最多展示条数，避免大模块输出淹没终端 */
const MAX_LIST = 15

/**
 * 从 start 出发，按层收集反向依赖（dependents）
 *
 * 只收集运行时文件——测试文件单独统计，否则「依赖者数量」和「相关测试」
 * 两个口径会重复计算。
 */
function dependentsByLevel(
  reversed: Map<string, string[]>,
  start: Set<string>,
): string[][] {
  const seen = new Set(start)
  const levels: string[][] = []
  let frontier = [...start]

  while (frontier.length > 0) {
    const next: string[] = []
    for (const file of frontier) {
      for (const dependent of reversed.get(file) ?? []) {
        if (seen.has(dependent) || isTestFile(dependent)) continue
        seen.add(dependent)
        next.push(dependent)
      }
    }
    if (next.length === 0) break
    levels.push(next)
    frontier = next
  }
  return levels
}

/** 从 from 出发能否到达 target（判断测试是否覆盖目标） */
function reachesTarget(
  graph: Map<string, string[]>,
  from: string,
  target: Set<string>,
): boolean {
  const seen = new Set<string>([from])
  const stack = [from]
  while (stack.length > 0) {
    const node = stack.pop()!
    for (const dep of graph.get(node) ?? []) {
      if (target.has(dep)) return true
      if (seen.has(dep)) continue
      seen.add(dep)
      stack.push(dep)
    }
  }
  return false
}

/** 收集目标文件：接受文件或目录 */
function resolveTargets(inputs: string[]): string[] {
  const files: string[] = []
  for (const input of inputs) {
    const abs = resolve(ROOT, input)
    if (!existsSync(abs)) {
      console.error(`路径不存在：${input}`)
      process.exit(1)
    }
    if (statSync(abs).isDirectory()) {
      files.push(...collectFiles(abs, { includeTests: true }))
    } else {
      files.push(abs)
    }
  }
  return [...new Set(files)]
}

function relToRoot(file: string): string {
  return relative(ROOT, file)
}

/** 按上下文分组统计 */
function groupByContext(files: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const file of files) {
    if (!file.startsWith(SRC)) continue
    const ctx = contextOf(file)
    counts.set(ctx, (counts.get(ctx) ?? 0) + 1)
  }
  return counts
}

// --- main ---
const args = process.argv.slice(2)
const depthIndex = args.indexOf('--depth')
const maxDepth =
  depthIndex >= 0 ? Number.parseInt(args[depthIndex + 1] ?? '3', 10) || 3 : 3
// --depth 的值不以 -- 开头，必须显式排除，否则会被当成目标路径
const depthValueIndex = depthIndex >= 0 ? depthIndex + 1 : -1
const inputs = args.filter(
  (a, i) => !a.startsWith('--') && i !== depthValueIndex,
)

if (inputs.length === 0) {
  console.error(
    '用法：pnpm impact <文件或目录> [--depth N]\n' +
      '示例：pnpm impact src/logic/config/defaults.ts',
  )
  process.exit(1)
}

const targets = resolveTargets(inputs)
if (targets.length === 0) {
  console.error('目录下没有可分析的 .ts / .vue 文件')
  process.exit(1)
}

const targetSet = new Set(targets)
const graph = buildFullGraph()
const reversed = reverseGraph(graph)

const levels = dependentsByLevel(reversed, targetSet)
const runtimeDependents = levels.flat()

// 相关测试：测试文件的依赖闭包里含目标文件（直接 import 也算命中）
const relatedTests = new Set<string>()
for (const file of graph.keys()) {
  if (!isTestFile(file)) continue
  if (reachesTarget(graph, file, targetSet)) relatedTests.add(file)
}

console.log('\n▸ 目标')
for (const target of targets.slice(0, 10)) console.log(`  ${relToRoot(target)}`)
if (targets.length > 10) console.log(`  ... 等 ${targets.length} 个文件`)

console.log(`\n▸ 直接依赖者（${levels[0]?.length ?? 0}）`)
if (!levels[0]?.length) {
  console.log('  （无——目标之间互相依赖，或尚未被其他模块静态引用）')
} else {
  const direct = levels[0].map(relToRoot).sort()
  for (const file of direct.slice(0, MAX_LIST)) console.log(`  ${file}`)
  if (direct.length > MAX_LIST) console.log(`  ... 等 ${direct.length} 个`)
}

const indirect = levels.slice(1)
if (indirect.length > 0) {
  const shown = indirect.slice(0, maxDepth)
  const total = indirect.reduce((n, l) => n + l.length, 0)
  console.log(`\n▸ 间接依赖者（共 ${total} 个，按层级）`)
  shown.forEach((level, i) => {
    const preview = level.slice(0, 4).map(relToRoot).join('、')
    const more = level.length > 4 ? ` 等 ${level.length} 个` : ''
    console.log(`  L${i + 2}  ${preview}${more}`)
  })
  if (indirect.length > shown.length) {
    console.log(`  ... 还有 ${indirect.length - shown.length} 层更远的依赖`)
  }
}

const ctxCounts = groupByContext(runtimeDependents)
if (ctxCounts.size > 0) {
  console.log(`\n▸ 受影响模块（${ctxCounts.size}）`)
  const line = [...ctxCounts]
    .sort((a, b) => b[1] - a[1])
    .map(([ctx, n]) => `${ctx}(${n})`)
    .join('  ')
  console.log(`  ${line}`)

  const contexts = [...ctxCounts.keys()].filter((c) =>
    EXECUTION_CONTEXTS.has(c),
  )
  if (contexts.length > 0) {
    console.log(
      `\n▸ 涉及执行上下文（${contexts.length}/${EXECUTION_CONTEXTS.size}）  ${contexts.sort().join('  ')}`,
    )
  }
}

console.log(`\n▸ 相关测试（${relatedTests.size}）`)
if (relatedTests.size === 0) {
  console.log('  （无——改动没有回归网保护，建议先补测试）')
} else {
  const testList = [...relatedTests].map(relToRoot).sort()
  for (const file of testList.slice(0, MAX_LIST)) console.log(`  ${file}`)
  if (testList.length > MAX_LIST) console.log(`  ... 等 ${testList.length} 个`)
}

// 风险提示
const tips: string[] = []
for (const target of targets) {
  const rel = relative(SRC, target)
  for (const rule of RISK_RULES) {
    if (rule.match(rel) && !tips.includes(rule.tip)) tips.push(rule.tip)
  }
}

if (ctxCounts.size >= 3) {
  tips.push(
    `波及 ${ctxCounts.size} 个顶层模块：按 workflow.md「改动半径」规则，跨 3 个以上顶层目录需拆分为多个任务`,
  )
}
if (runtimeDependents.length >= 20) {
  tips.push(
    `被 ${runtimeDependents.length} 个文件（直接+间接）依赖：改动前先跑 pnpm test 记录基线，改完对比`,
  )
}
if (relatedTests.size === 0 && runtimeDependents.length > 0) {
  tips.push('有依赖者但无相关测试：这类改动没有任何自动化保护，必须先补用例')
}

if (tips.length > 0) {
  console.log('\n▸ 风险提示')
  for (const tip of tips) console.log(`  ⚠ ${tip}`)
}

console.log()
