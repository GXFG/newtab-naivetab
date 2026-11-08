/**
 * import 图基础设施
 *
 * `check-boundaries.ts`（校验依赖方向）与 `impact.ts`（分析改动影响面）共用。
 * 两份脚本必须看到同一张图，否则「边界检查拦的」和「影响面显示的」会漂移。
 *
 * 关键点：必须区分运行时依赖与类型依赖。
 *  - `import type { X } from './x'`、`export type`  → 运行时擦除
 *  - 类型位置的 `import('./x').X`（ImportTypeNode）→ 运行时擦除
 * `ts.preProcessFile` 无法区分这两类，会把类型位置的 import() 误判为动态导入，
 * 因此这里走完整 AST。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse as parseSFC } from '@vue/compiler-sfc'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const ROOT = resolve(__dirname, '../../..')
export const SRC = resolve(ROOT, 'src')

/** 参与依赖分析的文件扩展名 */
const TARGET_EXTS = new Set(['.ts', '.vue'])

/** 永不扫描的目录 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist'])

export interface ImportRef {
  specifier: string
  line: number
  /** true 表示类型依赖，运行时擦除，不算真实耦合 */
  typeOnly: boolean
}

/** 文件所属的执行上下文（src 下的一级目录） */
export function contextOf(file: string): string {
  return relative(SRC, file).split('/')[0]
}

/**
 * 递归收集目标文件
 *
 * `includeTests` 为 false 时不进入 `__tests__` 目录、不收集 `*.test.ts`
 * ——测试允许 mock 任意模块，不参与边界校验。
 */
export function collectFiles(
  dir: string,
  { includeTests = false }: { includeTests?: boolean } = {},
): string[] {
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
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      if (!includeTests && entry.name === '__tests__') continue
      results.push(...collectFiles(fullPath, { includeTests }))
    } else if (entry.isFile() && TARGET_EXTS.has(extname(entry.name))) {
      if (entry.name.endsWith('.d.ts')) continue
      if (!includeTests && entry.name.endsWith('.test.ts')) continue
      results.push(fullPath)
    }
  }
  return results
}

/**
 * 把 import 说明符解析为「相对 src 的路径」；非项目内模块（裸包名）返回 null
 */
export function resolveToSrcRelative(
  specifier: string,
  fromFile: string,
): string | null {
  let abs: string
  if (specifier.startsWith('@/')) {
    abs = join(SRC, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    abs = resolve(dirname(fromFile), specifier)
  } else {
    return null
  }
  const rel = relative(SRC, abs)
  // 指向 src 之外（如 ../../shared）视为越界
  return rel.startsWith('..') ? null : rel
}

/** 补全省略的扩展名，返回实际存在的文件路径（不存在则返回原路径） */
export function resolveExistingFile(abs: string): string {
  if (existsSync(abs) && !abs.endsWith('/') && extname(abs)) return abs
  for (const candidate of [`${abs}.ts`, `${abs}.vue`, `${abs}/index.ts`]) {
    if (existsSync(candidate)) return candidate
  }
  return abs
}

/** 用 TS AST 提取一段 TS 代码里的 import/export 说明符 */
function extractFromSource(code: string, startLine: number): ImportRef[] {
  const sf = ts.createSourceFile(
    '__import_graph__.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS,
  )
  const refs: ImportRef[] = []

  const push = (spec: ts.Node, typeOnly: boolean): void => {
    if (!ts.isStringLiteral(spec)) return
    const { line } = sf.getLineAndCharacterOfPosition(spec.getStart(sf))
    refs.push({ specifier: spec.text, line: startLine + line, typeOnly })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      push(node.moduleSpecifier, node.importClause?.isTypeOnly ?? false)
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      push(node.moduleSpecifier, node.isTypeOnly)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      // 真正的动态 import()；类型位置的 import() 是 ImportTypeNode，不经过这里
      const arg = node.arguments[0]
      if (arg) push(arg, false)
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return refs
}

/**
 * 提取单个文件的 import 列表
 *
 * .vue 先用 compiler-sfc 拆出 script / scriptSetup 再解析，
 * 行号按块起始行换算。
 */
export function extractImports(content: string, filePath: string): ImportRef[] {
  if (!filePath.endsWith('.vue')) return extractFromSource(content, 1)

  let descriptor
  try {
    descriptor = parseSFC(content, { filename: filePath }).descriptor
  } catch {
    return []
  }

  const refs: ImportRef[] = []
  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue
    refs.push(...extractFromSource(block.content, block.loc.start.line))
  }
  return refs
}

/**
 * 构建 import 图：文件 → 它依赖的项目内文件（仅运行时依赖）
 */
export function buildGraph(files: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  for (const file of files) {
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      graph.set(file, [])
      continue
    }
    const deps: string[] = []
    for (const { specifier, typeOnly } of extractImports(content, file)) {
      if (typeOnly) continue
      const target = resolveToSrcRelative(specifier, file)
      if (!target) continue
      const abs = resolveExistingFile(resolve(SRC, target))
      if (existsSync(abs)) deps.push(abs)
    }
    graph.set(file, deps)
  }
  return graph
}

/** 构建 src 全量图（含测试文件，供影响面分析反查测试） */
export function buildFullGraph(): Map<string, string[]> {
  return buildGraph(collectFiles(SRC, { includeTests: true }))
}

/**
 * 反转图：目标 → 直接依赖者
 */
export function reverseGraph(
  graph: Map<string, string[]>,
): Map<string, string[]> {
  const reversed = new Map<string, string[]>()
  for (const [file, deps] of graph) {
    for (const dep of deps) {
      const list = reversed.get(dep) ?? []
      list.push(file)
      reversed.set(dep, list)
    }
  }
  return reversed
}
