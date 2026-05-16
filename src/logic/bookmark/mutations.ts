/**
 * 书签变更操作 — chrome.bookmarks API 写操作（添加前缀、移除前缀、交换、删除）。
 *
 * @dependencies bookmark/parser.ts（findBookmarkByUrl、findFolderByPath）
 * @consumers keyboard/bookmark-export.ts、components/BaseSystemBookmarkManager.vue
 */

import { findBookmarkByUrl, findFolderByPath } from './parser'

/**
 * 在 sourceFolder 中查找 `[X]` 前缀书签
 */
const findPrefixedBookmarkInFolder = (
  folderNode: chrome.bookmarks.BookmarkTreeNode,
  code: string,
): chrome.bookmarks.BookmarkTreeNode | null => {
  if (!folderNode.children) return null
  const prefix = `[${code}]`
  for (const child of folderNode.children) {
    if (child.url && child.title?.startsWith(prefix)) return child
  }
  return null
}

/**
 * 为指定 URL 的浏览器书签添加 `[X] ` 前缀
 */
export const addBookmarkPrefix = async (
  code: string,
  url: string,
  name?: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const bookmark = findBookmarkByUrl(tree, url)
  if (!bookmark) return

  if (/^\[([^\]]+)\]\s*/.test(bookmark.title || '')) return

  const prefix = `[${code}] `
  const newName = name || bookmark.title || ''
  await chrome.bookmarks.update(bookmark.id, {
    title: `${prefix}${newName}`,
  })
}

/**
 * 移除指定书签的 `[X] ` 前缀
 */
export const removeBookmarkPrefix = async (url: string): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const bookmark = findBookmarkByUrl(tree, url)
  if (!bookmark) return

  const title = bookmark.title || ''
  const cleaned = title.replace(/^\[([^\]]+)\]\s*/, '')
  if (cleaned !== title) {
    await chrome.bookmarks.update(bookmark.id, { title: cleaned })
  }
}

/**
 * 交换 sourceFolder 中两个 `[X]` 书签的名称和 URL（前缀保持不变）
 *
 * 场景：拖拽键帽互换绑定，键位前缀（如 `[Digit1]`）跟随键位不动，
 * 只交换书签名称和 URL。
 *
 * 策略：先删除两个书签 → 按原始位置重建（每个位置保持前缀，内容换成对方的）。
 * 删除时从大到小索引避免位移影响，创建时从小到大索引避免位移影响。
 */
export const swapBookmarksInSourceFolder = async (
  sourceFolderPath: string,
  codeA: string,
  codeB: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByPath(tree, sourceFolderPath)
  if (!sourceFolder || !sourceFolder.children) return

  const bookmarkA = findPrefixedBookmarkInFolder(sourceFolder, codeA)
  const bookmarkB = findPrefixedBookmarkInFolder(sourceFolder, codeB)
  if (!bookmarkA || !bookmarkB) return

  const parentId = bookmarkA.parentId ?? sourceFolder.id
  const idxA = bookmarkA.index ?? 0
  const idxB = bookmarkB.index ?? 0
  const urlA = bookmarkA.url || ''
  const urlB = bookmarkB.url || ''
  const nameA = bookmarkA.title!.replace(/^\[[^\]]+\]\s*/, '')
  const nameB = bookmarkB.title!.replace(/^\[[^\]]+\]\s*/, '')

  const dataAtIdxA = { title: `[${codeA}] ${nameB}`, url: urlB }
  const dataAtIdxB = { title: `[${codeB}] ${nameA}`, url: urlA }

  const [firstId, secondId] =
    idxA > idxB ? [bookmarkA.id, bookmarkB.id] : [bookmarkB.id, bookmarkA.id]

  await chrome.bookmarks.remove(firstId)
  await chrome.bookmarks.remove(secondId)

  const [firstIdx, firstData, secondIdx, secondData] =
    idxA < idxB
      ? [idxA, dataAtIdxA, idxB, dataAtIdxB]
      : [idxB, dataAtIdxB, idxA, dataAtIdxA]

  await chrome.bookmarks.create({
    parentId,
    index: firstIdx,
    ...firstData,
  })
  await chrome.bookmarks.create({
    parentId,
    index: secondIdx,
    ...secondData,
  })
}

/**
 * 从 sourceFolder 中删除指定 code 的 `[X]` 书签。
 * 仅删除 sourceFolder 内的副本，不影响原始书签。
 */
export const removeBookmarkFromSourceFolder = async (
  sourceFolderPath: string,
  code: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByPath(tree, sourceFolderPath)
  if (!sourceFolder) return

  const bookmark = findPrefixedBookmarkInFolder(sourceFolder, code)
  if (!bookmark) return

  await chrome.bookmarks.remove(bookmark.id)
}
