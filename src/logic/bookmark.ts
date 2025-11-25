import { isChrome, isFirefox } from '@/env'

const getChromeBookmark = (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve, reject) => {
    try {
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
  try {
    if (isChrome) return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`
    const urlEle = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlEle.origin}&sz=${size}`
  } catch (e) {
    console.warn(e)
    return ''
  }
}
