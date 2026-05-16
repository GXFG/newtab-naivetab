/**
 * @module bookmark/api
 * @description 浏览器书签读取 — chrome.bookmarks API 封装。提供书签树读取和 favicon 获取。
 *   兼容 Chrome/Firefox 差异（bookmarklet 协议检测）。
 * @dependencies env.ts（isChrome/isFirefox）
 * @consumers bookmark/parser.ts、keyboard/bookmark-state.ts
 * @see docs/features/bookmark.md
 */
import { isChrome, isFirefox } from '@/env'

const getChromeBookmark = (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome.bookmarks) {
        reject(
          new Error(
            'chrome.bookmarks API not available. Permission not granted.',
          ),
        )
        return
      }
      chrome.bookmarks.getTree((bookmarks) => resolve(bookmarks))
    } catch (e) {
      reject(e)
    }
  })
}

export const getBrowserBookmark = async () => {
  const res = (await getChromeBookmark()) as BookmarkNode[]
  const root = res[0].children || []
  // 过滤书签文件夹, Chrome书签根目录是第一个, Firefox书签根目录是第二个
  const base = isFirefox ? root?.[1]?.children || [] : root?.[0]?.children || []
  return base
}

export const getFaviconFromUrl = (url: string, size = 128) => {
  if (!url) return ''
  try {
    if (isChrome) {
      return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`
    }
    const urlEle = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlEle.origin}&sz=${size}`
  } catch (e) {
    console.warn(e)
    return ''
  }
}
