import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '..')
const OUTPUT = path.resolve(ROOT, 'dist', 'naivetab-source.zip')

// 确保输出目录存在
const distDir = path.resolve(ROOT, 'dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// 排除的目录
const EXCLUDE_DIRS = [
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
]

// 排除的文件（支持 glob 模式）
const EXCLUDE_FILES = [
  '.DS_Store',
  '*.log',
  '*.local',
  '*.crx',
  '*.xpi',
  '__tests__',
  'src/auto-imports.d.ts',
  'src/components.d.ts',
  'stats.html',
  '.eslintcache',
]

// 从 EXCLUDE_* 动态生成 zip -x 参数，保持单一数据源
// 目录：匹配根级 ./{dir}/* 和任意层级 ./*/{dir}/*
// 文件：匹配根级 ./{file} 和任意层级 ./*/{file}
const excludes = [
  ...EXCLUDE_DIRS.flatMap((d) => [`-x './${d}/*'`, `-x './*/${d}/*'`]),
  ...EXCLUDE_FILES.flatMap((f) => {
    // 目录类型（无扩展名）：排除目录及其内容
    if (!/\.[^.]+$/.test(f)) {
      return [`-x './${f}/*'`, `-x './*/${f}/*'`]
    }
    return [`-x './${f}'`, `-x './*/${f}'`]
  }),
].join(' ')
const command = `cd "${ROOT}" && zip -rq "${OUTPUT}" . ${excludes}`

console.log('📦 Creating source zip for Firefox store submission...')

try {
  execSync(command, { stdio: 'inherit' })
  const stats = fs.statSync(OUTPUT)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
  console.log(`✅ Source zip created: ${OUTPUT} (${sizeMB} MB)`)
} catch (error) {
  console.error('❌ Failed to create source zip:', error)
  process.exit(1)
}
