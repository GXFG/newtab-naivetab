/**
 * 源码打包脚本 — 生成 Firefox Store 提交用源码 zip。
 *
 * 排除 node_modules、构建产物、IDE 配置等开发目录，
 * 递归遍历项目根目录，逐文件添加到 zip。
 *
 * 用法：tsx scripts/pack-source.ts
 * 输出：dist/naivetab-source.zip
 */
import fs from 'fs-extra'
import path from 'node:path'
import { ZipArchive } from 'archiver'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT = path.resolve(ROOT, 'dist', 'naivetab-source.zip')

// ── 排除规则 ────────────────────────────────────────────────────────────────

/** 任意层级排除的目录名 */
const EXCLUDE_DIRS = new Set([
  'docs',
  'site',
  'node_modules',
  'extension-chrome',
  'extension-firefox',
  'dist',
  'test',
  'coverage',
  '__tests__',
])

/**
 * 以 `.` 开头的目录一律排除（.git/.claude/.github/.vscode/.pnpm-store/.workbuddy 等）。
 * 这些目录都是本地工具缓存或仓库元数据，既不属于源码，体积也可能很大
 * （例如误建在项目根的 .pnpm-store 可达数百 MB）。
 */

/** 任意层级排除的文件名（精确匹配） */
const EXCLUDE_FILES = new Set(['.DS_Store', '.eslintcache', 'stats.html'])

/** 任意层级排除的扩展名 */
const EXCLUDE_EXT = new Set(['.log', '.local', '.crx', '.xpi'])

/** 精确路径排除（相对项目根，POSIX 分隔符） */
const EXCLUDE_PATHS = new Set(['src/auto-imports.d.ts', 'src/components.d.ts'])

function isExcluded(
  name: string,
  relativePath: string,
  isDir: boolean,
): boolean {
  if (isDir && name.startsWith('.')) return true
  if (isDir && EXCLUDE_DIRS.has(name)) return true
  if (EXCLUDE_FILES.has(name)) return true
  if (EXCLUDE_EXT.has(path.extname(name))) return true
  if (EXCLUDE_PATHS.has(relativePath.replaceAll(path.sep, '/'))) return true
  return false
}

// ── 递归遍历 ────────────────────────────────────────────────────────────────

function addDir(
  archive: ZipArchive,
  rootDir: string,
  currentDir: string,
): number {
  const scanDir = currentDir ? path.join(rootDir, currentDir) : rootDir
  const entries = fs.readdirSync(scanDir)
  let count = 0

  for (const name of entries) {
    const relativePath = currentDir ? path.join(currentDir, name) : name
    const fullPath = path.join(rootDir, relativePath)
    const stat = fs.statSync(fullPath)

    if (isExcluded(name, relativePath, stat.isDirectory())) continue

    if (stat.isDirectory()) {
      count += addDir(archive, rootDir, relativePath)
    } else {
      // zip 内部统一使用 POSIX 分隔符
      archive.file(fullPath, { name: relativePath.replaceAll(path.sep, '/') })
      count += 1
    }
  }

  return count
}

// ── 主逻辑 ──────────────────────────────────────────────────────────────────

/** 源码包体积上限（MB）。超出基本意味着把缓存/依赖目录误打进去了。 */
const MAX_SIZE_MB = 20

async function packSource() {
  console.log('📦 Creating source zip for Firefox store submission...')

  await fs.ensureDir(path.dirname(OUTPUT))
  await fs.remove(OUTPUT)

  const output = fs.createWriteStream(OUTPUT)
  const archive = new ZipArchive({ zlib: { level: 9 } })
  let fileCount = 0

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = archive.pointer() / 1024 / 1024
      console.log(
        `✅ Source zip created: ${OUTPUT} (${sizeMB.toFixed(2)} MB, ${fileCount} files)`,
      )
      if (sizeMB > MAX_SIZE_MB) {
        reject(
          new Error(
            `源码包体积异常（${sizeMB.toFixed(2)} MB > ${MAX_SIZE_MB} MB），请检查排除规则`,
          ),
        )
        return
      }
      resolve()
    })

    archive.on('error', reject)

    archive.pipe(output)

    fileCount = addDir(archive, ROOT, '')

    archive.finalize()
  })
}

packSource().catch((err) => {
  console.error('❌ Failed to create source zip:', err)
  process.exit(1)
})
