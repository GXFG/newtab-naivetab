import { isChrome } from '@/env'

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
  const res = (await getChromeBookmark()) as ChromeBookmarkItem[]
  const root = res[0].children
  return root
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
