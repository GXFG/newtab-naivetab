/**
 * 从 GitHub 下载 Bing 壁纸历史列表，解析并输出为紧凑 JSON
 *
 * TTL 策略：24 小时内不重复请求，避免频繁 dev/build 浪费网络
 * 通过 pnpm fetch-bing 或 --force 参数强制刷新
 *
 * 网络策略：优先使用 curl（遵守 http_proxy/https_proxy 环境变量），
 * 不可用时回退到原生 fetch。解决国内环境下 Node.js fetch 不走系统代理的问题。
 *
 * @usage
 *   tsx scripts/fetch-bing-wallpaper.ts            # 自动 TTL
 *   tsx scripts/fetch-bing-wallpaper.ts --force    # 强制刷新
 */
import fs from 'fs-extra'
import { execFile } from 'node:child_process'
import { r, log } from './utils'

const BING_WALLPAPER_URL =
  'https://raw.githubusercontent.com/niumoo/bing-wallpaper/refs/heads/main/bing-wallpaper.md'
const OUTPUT_PATH = r('src/logic/image/bing-wallpaper.data.json')
const TTL_MS = 24 * 60 * 60 * 1000 // 24 小时
const FETCH_TIMEOUT_MS = 30_000

interface BingWallpaperItem {
  name: string
  desc: string
}

function curlFetch(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'curl',
      ['-sS', '-L', '--max-time', String(Math.floor(timeoutMs / 1000)), url],
      { timeout: timeoutMs + 5000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(err)
        } else {
          resolve(stdout)
        }
      },
    )
  })
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<string> {
  // 优先 curl：遵守 http_proxy/https_proxy 系统代理
  try {
    log('BING', '尝试通过 curl 获取（遵守系统代理）...')
    return await curlFetch(url, timeoutMs)
  } catch (curlErr) {
    const curlMsg =
      (curlErr as NodeJS.ErrnoException).code === 'ENOENT'
        ? 'curl 未安装'
        : (curlErr as Error).message
    log('BING', `curl 失败（${curlMsg}），回退到原生 fetch...`)

    // 回退到原生 fetch
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`, {
          cause: curlErr,
        })
      }
      return await response.text()
    } finally {
      clearTimeout(timer)
    }
  }
}

async function main() {
  const force = process.argv.includes('--force')

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
    const text = await fetchWithTimeout(BING_WALLPAPER_URL, FETCH_TIMEOUT_MS)

    const lines = text.split('\n')
    const items: BingWallpaperItem[] = []

    for (const line of lines) {
      const trimmed = line.trim()
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
      log('BING', `fetch 失败，使用已有缓存（${errMsg}）`)
    } else {
      log('BING', `fetch 失败且无本地缓存，写入空数组（${errMsg}）`)
      await fs.writeJson(OUTPUT_PATH, [])
    }
  }
}

main()
