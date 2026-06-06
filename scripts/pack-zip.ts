/**
 * ZIP 打包脚本 — 替换 jszip-cli，使用 archiver v8 (ESM) 将扩展目录打包为 zip。
 *
 * 用法：tsx scripts/pack-zip.ts <src-dir> <output-file>
 * 示例：tsx scripts/pack-zip.ts extension-chrome ./dist/naivetab-chrome.zip
 *
 * 类型定义见 scripts/archiver.d.ts
 */
import fs from 'fs-extra'
import path from 'node:path'
import { ZipArchive } from 'archiver'

const [srcDir, outputFile] = process.argv.slice(2)

if (!srcDir || !outputFile) {
  console.error('Usage: tsx scripts/pack-zip.ts <src-dir> <output-file>')
  process.exit(1)
}

async function packZip() {
  // 确保输出目录存在
  await fs.ensureDir(path.dirname(outputFile))

  // 如果已存在则删除（等价于 jszip-cli 的 -f 参数）
  await fs.remove(outputFile)

  const output = fs.createWriteStream(outputFile)
  const archive = new ZipArchive({ zlib: { level: 9 } })

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      console.log(
        `✓ ${outputFile} (${(archive.pointer() / 1024).toFixed(1)} KB)`,
      )
      resolve()
    })

    archive.on('error', reject)

    archive.pipe(output)

    // 将 srcDir 目录内容添加到 zip 根目录，忽略 .DS_Store
    const entries = fs.readdirSync(srcDir)
    for (const entry of entries) {
      if (entry === '.DS_Store') continue
      const entryPath = path.join(srcDir, entry)
      const stat = fs.statSync(entryPath)
      if (stat.isDirectory()) {
        archive.directory(entryPath, entry)
      } else {
        archive.file(entryPath, { name: entry })
      }
    }

    archive.finalize()
  })
}

packZip().catch((err) => {
  console.error('pack-zip failed:', err)
  process.exit(1)
})
