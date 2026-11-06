/**
 * 架构边界检查脚本
 *
 * 校验各执行上下文（newtab / contentScripts / background / popup / options）的 import 方向。
 * 这类问题 typecheck 完全发现不了，只在特定上下文运行时才崩，是 AI 改动最容易
 * 引入且最难复现的一类回归。
 *
 * 检查项：
 *  1. logic/ 反向依赖 UI 层（logic 必须上下文无关，否则 SW 引入即崩）
 *  2. background/ 引入 DOM 相关代码（SW 无 DOM）
 *  3. contentScripts/ 引入页面层代码（注入宿主页面，体积与 DOM 环境受限）
 *  4. contentScripts/ 直接使用 localStorage（应走 browser.storage）
 *  5. components/ 依赖页面层（通用组件不得绑定具体页面）
 *  6. 循环依赖
 *  7. logic/ / background/ / contentScripts/ 引入虚拟组件模块（`~icons/*` 之类）
 *
 * 第 7 条的由来：`~icons/*`（unplugin-icons）在类型上只是「一个组件」，typecheck 和
 * 依赖方向检查都看不出问题，但它会把 Vue 组件连同运行时一起拖进 SW / CS 的产物。
 * 更麻烦的是这类说明符不是项目内路径，`resolveToSrcRelative` 直接跳过 —— 所以
 * 必须在解析之前单独拦，否则它是唯一一条「看不见的」跨层依赖。
 *
 * 用法：
 *   pnpm check-boundaries                     # 全量检查
 *   pnpm check-boundaries src/logic           # 检查指定路径
 *   pnpm check-boundaries --graph             # 只输出依赖摘要，不做校验
 *
 * 规则说明：docs/conventions/ai-collaboration.md#p0-1
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import {
  ROOT,
  SRC,
  buildGraph,
  collectFiles,
  contextOf,
  extractImports,
  resolveExistingFile,
  resolveToSrcRelative,
} from './lib/import-graph'

interface Violation {
  file: string
  line: number
  rule: string
  specifier: string
  message: string
  fix: string
}

/** 一条禁止规则 */
interface ForbidRule {
  /** 禁止依赖的目标目录（相对 src），匹配路径前缀 */
  target: string
  /** 违规说明 */
  message: string
  /** 修复建议 */
  fix: string
}

/** 源目录 → 禁止清单 */
const BOUNDARY_RULES: Record<string, ForbidRule[]> = {
  logic: [
    {
      target: 'newtab',
      message: 'logic/ 必须上下文无关，不得依赖页面层',
      fix: '把依赖上移到调用方（newtab/ 或 setting/），logic/ 只保留纯逻辑',
    },
    {
      target: 'components',
      message: 'logic/ 必须上下文无关，不得依赖 UI 组件',
      fix: '组件依赖上移到调用方，logic/ 不感知渲染',
    },
    {
      target: 'setting',
      message: 'logic/ 必须上下文无关，不得依赖 Setting 面板',
      fix: '把面板相关逻辑留在 setting/，logic/ 只提供数据',
    },
    {
      target: 'popup',
      message: 'logic/ 必须上下文无关，不得依赖 popup',
      fix: '把依赖上移到 popup 入口',
    },
    {
      target: 'options',
      message: 'logic/ 必须上下文无关，不得依赖 options',
      fix: '把依赖上移到 options 入口',
    },
  ],
  background: [
    {
      target: 'components',
      message: 'background/ 运行在 Service Worker，无 DOM，不得依赖 UI 组件',
      fix: '把 UI 相关逻辑留在 newtab/popup，SW 只处理数据与消息',
    },
    {
      target: 'setting',
      message:
        'background/ 运行在 Service Worker，无 DOM，不得依赖 Setting 面板',
      fix: '把面板逻辑留在 setting/',
    },
    {
      target: 'newtab',
      message: 'background/ 运行在 Service Worker，不得依赖页面入口',
      fix: '共享数据放到 logic/，通过消息通信',
    },
    {
      target: 'popup',
      message: 'background/ 运行在 Service Worker，不得依赖 popup',
      fix: '共享数据放到 logic/，通过消息通信',
    },
    {
      target: 'options',
      message: 'background/ 运行在 Service Worker，不得依赖 options',
      fix: '共享数据放到 logic/',
    },
  ],
  contentScripts: [
    {
      target: 'newtab',
      message: 'contentScripts/ 注入宿主页面，不得依赖页面入口',
      fix: '共享逻辑下沉到 logic/，注意不要引入 DOM 副作用',
    },
    {
      target: 'popup',
      message: 'contentScripts/ 注入宿主页面，不得依赖 popup',
      fix: '共享逻辑下沉到 logic/',
    },
    {
      target: 'options',
      message: 'contentScripts/ 注入宿主页面，不得依赖 options',
      fix: '共享逻辑下沉到 logic/',
    },
    {
      target: 'setting',
      message: 'contentScripts/ 注入宿主页面，不得依赖 Setting 面板',
      fix: '共享逻辑下沉到 logic/',
    },
    {
      target: 'components',
      message:
        'contentScripts/ 注入宿主页面，不得依赖应用组件（体积与样式冲突）',
      fix: 'CS 所需 UI 请内联或使用轻量实现',
    },
  ],
  components: [
    {
      target: 'newtab',
      message: 'components/ 是通用组件层，不得依赖具体页面',
      fix: '通过 props / slot / 事件解耦，页面依赖留在 newtab/',
    },
    {
      target: 'popup',
      message: 'components/ 是通用组件层，不得依赖具体页面',
      fix: '通过 props / slot / 事件解耦',
    },
    {
      target: 'options',
      message: 'components/ 是通用组件层，不得依赖具体页面',
      fix: '通过 props / slot / 事件解耦',
    },
  ],
}

/** Service Worker 与 content script 环境中禁止出现 .vue 导入 */
const NO_VUE_DIRS = new Set(['background', 'contentScripts'])

/**
 * 虚拟组件模块：由构建插件在编译期生成「一个图标就是一个组件」的模块。
 * 目前唯一来源是 unplugin-icons，两种写法（`~icons/...` 与 `virtual:icons/...`）都要拦；
 * 将来出现别的同类插件时在这里补充即可。
 */
const VIRTUAL_COMPONENT_RE = /^(?:~|virtual:)(?:icons|components)\//

/**
 * 不得引入虚拟组件模块的目录：逻辑层要保持上下文无关（它被 SW / CS 直接引用），
 * SW / CS 自身不能打包 Vue 组件。UI 层（newtab/popup/options/components/setting）
 * 不受限。
 */
const NO_VIRTUAL_COMPONENT_DIRS = new Set([
  'logic',
  'background',
  'contentScripts',
])

/** 去掉行内注释，避免 `// localStorage` 这类注释误报 */
function stripLineComment(line: string): string {
  const idx = line.indexOf('//')
  return idx >= 0 ? line.slice(0, idx) : line
}

/** 校验单个文件 */
function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return violations
  }

  const topDir = contextOf(filePath)
  const rules = BOUNDARY_RULES[topDir] ?? []

  for (const { specifier, line, typeOnly } of extractImports(
    content,
    filePath,
  )) {
    // 类型依赖运行时擦除，不构成架构耦合
    if (typeOnly) continue

    // 规则：共享层 / SW / CS 禁止引入虚拟组件模块
    // 必须放在路径解析之前：这类说明符不是项目内路径，下面会当作外部包跳过
    if (
      NO_VIRTUAL_COMPONENT_DIRS.has(topDir) &&
      VIRTUAL_COMPONENT_RE.test(specifier)
    ) {
      violations.push({
        file: filePath,
        line,
        rule: 'no-virtual-component',
        specifier,
        message: `${topDir}/ 不得引入构建期虚拟组件模块，会把 Vue 组件拖进 SW / CS 产物`,
        fix: '图标名等「数据」留在 logic/，组件解析放到 newtab/popup/options 等 UI 层',
      })
      continue
    }

    const target = resolveToSrcRelative(specifier, filePath)
    if (!target) continue

    const actual = relative(SRC, resolveExistingFile(resolve(SRC, target)))

    // 规则：SW / CS 禁止导入 .vue
    if (NO_VUE_DIRS.has(topDir) && actual.endsWith('.vue')) {
      violations.push({
        file: filePath,
        line,
        rule: 'no-vue-in-sw',
        specifier,
        message: `${topDir}/ 运行环境无 DOM，不得导入 .vue 单文件组件`,
        fix: '把渲染逻辑留在 newtab/popup，共享数据放 logic/',
      })
      continue
    }

    for (const rule of rules) {
      if (actual === rule.target || actual.startsWith(`${rule.target}/`)) {
        violations.push({
          file: filePath,
          line,
          rule: `no-${topDir}-to-${rule.target}`,
          specifier,
          message: rule.message,
          fix: rule.fix,
        })
        break
      }
    }
  }

  // 规则：contentScripts 禁止直接使用 localStorage
  if (topDir === 'contentScripts') {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const code = stripLineComment(lines[i])
      if (/\blocalStorage\b/.test(code)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-localstorage-in-cs',
          specifier: 'localStorage',
          message: 'contentScripts/ 运行在宿主页面环境，不得使用 localStorage',
          fix: '改用 browser.storage（@/logic/utils/database 或 webextension-polyfill）',
        })
      }
    }
  }

  return violations
}

/** DFS 找环，返回去重后的环路径 */
function findCycles(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = []
  const state = new Map<string, 0 | 1 | 2>() // 0 未访问 1 栈中 2 完成
  const stack: string[] = []
  const seen = new Set<string>()

  const visit = (node: string): void => {
    state.set(node, 1)
    stack.push(node)
    for (const dep of graph.get(node) ?? []) {
      const s = state.get(dep) ?? 0
      if (s === 0) {
        visit(dep)
      } else if (s === 1) {
        const start = stack.indexOf(dep)
        const cycle = [...stack.slice(start), dep]
        // 用排序后的节点集合去重，避免同一个环从不同起点重复报告
        const key = [...new Set(cycle)].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          cycles.push(cycle)
        }
      }
    }
    stack.pop()
    state.set(node, 2)
  }

  for (const node of graph.keys()) {
    if ((state.get(node) ?? 0) === 0) visit(node)
  }
  return cycles
}

/** 输出各上下文依赖摘要 */
function printGraph(graph: Map<string, string[]>): void {
  const stats = new Map<string, Map<string, number>>()
  for (const [file, deps] of graph) {
    const from = contextOf(file)
    if (!stats.has(from)) stats.set(from, new Map())
    const bucket = stats.get(from)!
    for (const dep of deps) {
      const to = contextOf(dep)
      bucket.set(to, (bucket.get(to) ?? 0) + 1)
    }
  }
  console.log('模块依赖摘要（源 → 目标，条数）\n')
  for (const [from, bucket] of [...stats].sort()) {
    const targets = [...bucket]
      .sort((a, b) => b[1] - a[1])
      .map(([to, n]) => `${to}(${n})`)
      .join('  ')
    console.log(`  ${from.padEnd(16)} → ${targets || '(无项目内依赖)'}`)
  }
  console.log()
}

// --- main ---
const args = process.argv.slice(2)
const graphOnly = args.includes('--graph')
const targets = args.filter((a) => !a.startsWith('--'))
const targetDirs =
  targets.length > 0 ? targets.map((a) => resolve(ROOT, a)) : [SRC]

const files = targetDirs.flatMap((d) => (existsSync(d) ? collectFiles(d) : []))

if (files.length === 0) {
  console.error('未找到待检查的文件')
  process.exit(1)
}

const graph = buildGraph(files)

if (graphOnly) {
  printGraph(graph)
  process.exit(0)
}

let violations: Violation[] = []
for (const file of files) {
  violations = violations.concat(checkFile(file))
}

for (const cycle of findCycles(graph)) {
  const path = cycle.map((f) => relative(SRC, f)).join(' → ')
  violations.push({
    file: cycle[0],
    line: 1,
    rule: 'no-circular',
    specifier: '',
    message: `循环依赖：${path}`,
    fix: '抽出共同依赖到下层模块，或改用事件/回调解耦',
  })
}

if (violations.length > 0) {
  console.error('\n发现架构边界违规:\n')
  for (const v of violations) {
    const relPath = relative(ROOT, v.file)
    console.error(`  ${relPath}:${v.line}  [${v.rule}] ${v.message}`)
    if (v.specifier) console.error(`      import: ${v.specifier}`)
    console.error(`      修复: ${v.fix}`)
  }
  console.error(
    `\n共 ${violations.length} 处违规。规则说明见 docs/conventions/ai-collaboration.md#p0-1\n`,
  )
  process.exit(1)
}

console.log(`架构边界检查通过（${files.length} 个文件）`)
