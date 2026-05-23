/**
 * @module bookmark/api
 * @description 浏览器书签读取 — chrome.bookmarks API 封装。提供书签树读取和 favicon 获取。
 *   兼容 Chrome/Firefox 差异（GUID/书签工具栏定位）。
 * @dependencies env.ts（isChrome/isFirefox）
 * @consumers bookmark/parser.ts、keyboard/bookmark-state.ts
 * @see docs/features/bookmark.md
 */
import { isChrome, isFirefox } from '@/env'

/** Firefox 书签工具栏 GUID（Firefox 源码定义，长期稳定） */
const FIREFOX_TOOLBAR_GUID = 'toolbar_____'

/** Chrome 书签栏的历史 ID，M142+ 后可能不再稳定 */
const CHROME_BOOKMARKS_BAR_ID = '1'

/**
 * 从 getTree() 返回的根节点 children 中找到书签栏节点。
 *
 * Chrome: 通过 ID "1" 匹配，失败时回退到 children[0]
 * Firefox: 通过 GUID "toolbar_____" 定位
 *
 * 来源：https://issues.chromium.org/360160839
 * https://issues.chromium.org/issues/456225717
 */
export const findBookmarksBarFromTree = (
  tree: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode | undefined => {
  const children = tree[0]?.children
  if (!children) return

  if (isFirefox) {
    // Firefox: GUID 稳定，失败时回退到 children[1]（书签工具栏的传统位置）
    return children.find((n) => n.id === FIREFOX_TOOLBAR_GUID) ?? children[1]
  }

  // Chrome: ID 匹配优先，失败时回退到 children[0]（始终为书签栏）
  return children.find((n) => n.id === CHROME_BOOKMARKS_BAR_ID) ?? children[0]
}

/**
 * 通过 getSubTree + GUID 直接获取书签工具栏/书签栏的内容。
 *
 * - Firefox: GUID 稳定，直接 getSubTree("toolbar_____")
 * - Chrome: 优先 getSubTree("1")，如果返回空则回退到 getTree + children[0] 定位
 *
 * 来源：https://issues.chromium.org/360160839（Chrome ID 稳定性变化）
 */
export const getBrowserBookmark = async (): Promise<BookmarkNode[]> => {
  if (!chrome.bookmarks) {
    throw new Error(
      'chrome.bookmarks API not available. Permission not granted.',
    )
  }

  if (isFirefox) {
    const [subTree] = await chrome.bookmarks.getSubTree(FIREFOX_TOOLBAR_GUID)
    return subTree?.children || []
  }

  // Chrome: 先尝试 getSubTree("1")
  try {
    const [subTree] = await chrome.bookmarks.getSubTree(CHROME_BOOKMARKS_BAR_ID)
    if (subTree?.children?.length) return subTree.children
  } catch {
    // ID "1" 不存在时回退
  }

  // 回退: getTree + findBookmarksBarFromTree
  const tree = await chrome.bookmarks.getTree()
  const bar = findBookmarksBarFromTree(tree)
  return bar?.children || []
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
