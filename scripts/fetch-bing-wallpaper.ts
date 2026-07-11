/**
 * 从 GitHub 下载 Bing 壁纸历史列表，解析并输出为紧凑 JSON
 *
 * TTL 策略：24 小时内不重复请求，避免频繁 dev/build 浪费网络
 * 通过 pnpm fetch-bing 或 --force 参数强制刷新
 *
 * @usage
 *   tsx scripts/fetch-bing-wallpaper.ts            # 自动 TTL
 *   tsx scripts/fetch-bing-wallpaper.ts --force    # 强制刷新
 */
import fs from 'fs-extra'
import { r, log } from './utils'

const BING_WALLPAPER_URL =
  'https://raw.githubusercontent.com/niumoo/bing-wallpaper/refs/heads/main/bing-wallpaper.md'
const OUTPUT_PATH = r('src/logic/image/bing-wallpaper.data.json')
const TTL_MS = 24 * 60 * 60 * 1000 // 24 小时
const FETCH_TIMEOUT_MS = 30_000 // fetch 超时（30s），防止受限环境挂起

interface BingWallpaperItem {
  name: string
  desc: string
}

/**
 * 带超时的 fetch 封装，避免在沙箱/CI 等受限环境中无限挂起
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const force = process.argv.includes('--force')

  // TTL 缓存检查：24 小时内不重复请求
  if (!force && fs.existsSync(OUTPUT_PATH)) {
    const stat = fs.statSync(OUTPUT_PATH)
    const age = Date.now() - stat.mtimeMs
    if (age < TTL_MS) {
      log('BING', `缓存未过期（${Math.round(age / 3600000)}h），跳过 fetch`)
      return
    }
    log('BING', `缓存已过期（${Math.round(age / 3600000)}h），开始更新...`)
  }

  try {
    log('BING', '正在从 GitHub 获取 Bing 壁纸列表...')
    const response = await fetchWithTimeout(
      BING_WALLPAPER_URL,
      FETCH_TIMEOUT_MS,
    )
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const text = await response.text()

    const lines = text.split('\n')
    const items: BingWallpaperItem[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      // 只处理日期行：YYYY-MM-DD | ...
      if (!/^\d{4}-\d{2}-\d{2} \|/.test(trimmed)) continue

      const nameMatch = trimmed.match(/th\?id=OHR\.(.*?)_UHD\.jpg/)
      const name = nameMatch ? nameMatch[1] : ''
      const descMatch = trimmed.match(/\[(.*?)\s*\(/)
      const desc = descMatch ? descMatch[1] : ''

      if (name && desc) {
        items.push({ name, desc })
      }
    }

    await fs.writeJson(OUTPUT_PATH, items, { spaces: 2 })
    log(
      'BING',
      `完成：${items.length} 条壁纸记录已写入 src/logic/image/bing-wallpaper.data.json`,
    )
  } catch (e) {
    const errMsg = (e as Error).message
    if (fs.existsSync(OUTPUT_PATH)) {
      // 有缓存则保留，不阻断构建
      log('BING', `fetch 失败，使用已有缓存（${errMsg}）`)
    } else {
      // 无缓存：写入空数组，避免 import 时文件缺失报错
      log('BING', `fetch 失败且无本地缓存，写入空数组（${errMsg}）`)
      await fs.writeJson(OUTPUT_PATH, [])
    }
  }
}

main()
