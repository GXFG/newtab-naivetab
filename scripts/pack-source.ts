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
  '.git',
  '.claude',
  '.github',
  '.vscode',
  '.idea',
  '.qoder',
  'test',
  'coverage',
  '__tests__',
])

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
  if (isDir && EXCLUDE_DIRS.has(name)) return true
  if (EXCLUDE_FILES.has(name)) return true
  if (EXCLUDE_EXT.has(path.extname(name))) return true
  if (EXCLUDE_PATHS.has(relativePath.replaceAll(path.sep, '/'))) return true
  return false
}

// ── 递归遍历 ────────────────────────────────────────────────────────────────

function addDir(archive: ZipArchive, rootDir: string, currentDir: string) {
  const scanDir = currentDir ? path.join(rootDir, currentDir) : rootDir
  const entries = fs.readdirSync(scanDir)

  for (const name of entries) {
    const relativePath = currentDir ? path.join(currentDir, name) : name
    const fullPath = path.join(rootDir, relativePath)
    const stat = fs.statSync(fullPath)

    if (isExcluded(name, relativePath, stat.isDirectory())) continue

    if (stat.isDirectory()) {
      addDir(archive, rootDir, relativePath)
    } else {
      // zip 内部统一使用 POSIX 分隔符
      archive.file(fullPath, { name: relativePath.replaceAll(path.sep, '/') })
    }
  }
}

// ── 主逻辑 ──────────────────────────────────────────────────────────────────

async function packSource() {
  console.log('📦 Creating source zip for Firefox store submission...')

  await fs.ensureDir(path.dirname(OUTPUT))
  await fs.remove(OUTPUT)

  const output = fs.createWriteStream(OUTPUT)
  const archive = new ZipArchive({ zlib: { level: 9 } })

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2)
      console.log(`✅ Source zip created: ${OUTPUT} (${sizeMB} MB)`)
      resolve()
    })

    archive.on('error', reject)

    archive.pipe(output)

    addDir(archive, ROOT, '')

    archive.finalize()
  })
}

packSource().catch((err) => {
  console.error('❌ Failed to create source zip:', err)
  process.exit(1)
})
