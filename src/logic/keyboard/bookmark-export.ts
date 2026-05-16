/**
 * @module keyboard/bookmark-export
 * @description 键盘书签导出到浏览器原生书签系统。包括：创建/更新 sourceFolder 中的
 *   书签条目、多层文件夹创建、全量导出。
 * @dependencies bookmark/parser.ts（findFolderByPath、extractDomainName）、
 *   bookmark/mutations.ts（removeBookmarkFromSourceFolder）、keyboard-constants.ts
 * @consumers components/BaseNaiveBookmarkManager.vue、components/BaseSystemBookmarkManager.vue
 * @see docs/features/bookmark.md
 */

import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard/keyboard-layout'
import { padUrlHttps } from '@/logic/utils/common'
import { findFolderByPath, extractDomainName } from '@/logic/bookmark/parser'
import { removeBookmarkFromSourceFolder } from '@/logic/bookmark/mutations'
import {
  KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER,
  EXPORT_LAYERS,
} from './keyboard-constants'

/** 顶层 NaiveTab 文件夹名称 */
const TOP_LEVEL_FOLDER = KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER
/** 导出目标根路径 */
export const EXPORT_FOLDER_PATH = TOP_LEVEL_FOLDER

/**
 * 在指定文件夹下按键盘布局顺序创建书签（带 `[X]` 前缀）
 */
const createBookmarksInFolder = async (
  folderId: string,
  keymap: Record<string, TBookmarkEntry>,
): Promise<void> => {
  const layoutCodes = keyboardCurrentModelAllKeyList.value
  for (const code of layoutCodes) {
    const entry = keymap[code]
    if (!entry?.url) continue

    const name = entry.name || extractDomainName(entry.url)
    await chrome.bookmarks.create({
      parentId: folderId,
      title: `[${code}] ${name}`,
      url: padUrlHttps(entry.url),
    })
  }
}

/**
 * 获取或创建顶层 NaiveTab 文件夹
 */
const getOrCreateTopLevelFolder = async (
  tree: chrome.bookmarks.BookmarkTreeNode[],
): Promise<string> => {
  const existingTopFolder = findFolderByPath(tree, TOP_LEVEL_FOLDER)
  if (existingTopFolder) return existingTopFolder.id

  const bookmarksBar = tree[0]?.children?.[0]
  const otherBookmarks = tree[0]?.children?.[1]
  const parentId = bookmarksBar?.id || otherBookmarks?.id || tree[0].id
  const folder = await chrome.bookmarks.create({
    parentId,
    title: TOP_LEVEL_FOLDER,
  })
  return folder.id
}

/**
 * 在父文件夹中查找或创建指定名称的子文件夹
 * @returns 文件夹 ID，如果文件夹已存在则返回已有 ID
 */
const getOrCreateLayerFolder = async (
  parentId: string,
  layerName: string,
  createIfMissing: boolean,
): Promise<string> => {
  const [subTree] = await chrome.bookmarks.getSubTree(parentId)
  const existingLayer = subTree.children?.find(
    (c) => c.title === layerName && !c.url,
  )

  if (existingLayer) return existingLayer.id

  if (createIfMissing) {
    const folder = await chrome.bookmarks.create({
      parentId,
      title: layerName,
    })
    return folder.id
  }

  return ''
}

/**
 * 导出 keymap 到浏览器书签树，所有书签自动添加 `[X]` 前缀
 * 书签创建在 NaiveTab/layer1 子文件夹中，同时创建 layer2-4 空文件夹占位
 * @param keymap - 要导出的 keymap
 */
export const exportKeymapToBrowser = async (
  keymap: Record<string, TBookmarkEntry>,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const topLevelFolderId = await getOrCreateTopLevelFolder(tree)

  // layer1 清空后重建（始终创建/覆盖）
  const layer1Id = await getOrCreateLayerFolder(
    topLevelFolderId,
    EXPORT_LAYERS[0],
    true,
  )
  // 先清空 layer1 的旧书签
  if (layer1Id) {
    const [subTree] = await chrome.bookmarks.getSubTree(layer1Id)
    for (const child of subTree.children ?? []) {
      await chrome.bookmarks.remove(child.id)
    }
  }

  // 创建书签到 layer1
  await createBookmarksInFolder(layer1Id, keymap)

  // 创建 layer2-4 空文件夹占位
  for (let i = 1; i < EXPORT_LAYERS.length; i++) {
    await getOrCreateLayerFolder(topLevelFolderId, EXPORT_LAYERS[i], true)
  }
}

/**
 * 创建 Layer 书签文件夹结构
 * 在书签栏创建 NaiveTab/layer1-4 文件夹，返回各层的路径数组
 */
export const createLayerBookmarkFolders = async (): Promise<string[]> => {
  const tree = await chrome.bookmarks.getTree()
  const topLevelFolderId = await getOrCreateTopLevelFolder(tree)

  const paths: string[] = []
  for (const layerName of EXPORT_LAYERS) {
    await getOrCreateLayerFolder(topLevelFolderId, layerName, true)
    paths.push(`${TOP_LEVEL_FOLDER}/${layerName}`)
  }
  return paths
}

/**
 * 在文件夹中创建书签并移动到键盘布局正确位置
 */
const createBookmarkInFolderAtPosition = async (
  folderId: string,
  code: string,
  url: string,
  name: string,
): Promise<void> => {
  const folder = await chrome.bookmarks.getSubTree(folderId)
  const existingPrefixedBookmarks = (folder[0]?.children ?? []).filter(
    (n) => n.url && /^\[([^\]]+)\]/.test(n.title || ''),
  )
  const existingCodes = existingPrefixedBookmarks.map((n) => {
    const match = n.title!.match(/^\[([^\]]+)\]/)
    return match ? match[1] : ''
  })

  const layoutCodes = keyboardCurrentModelAllKeyList.value
  const currentIdx = layoutCodes.indexOf(code)
  let insertIndex = existingPrefixedBookmarks.length
  for (let i = 0; i < existingCodes.length; i++) {
    const existingIdx = layoutCodes.indexOf(existingCodes[i])
    if (existingIdx > currentIdx) {
      insertIndex = i
      break
    }
  }

  const bookmark = await chrome.bookmarks.create({
    parentId: folderId,
    title: `[${code}] ${name}`,
    url: padUrlHttps(url),
  })

  await chrome.bookmarks.move(bookmark.id, { index: insertIndex })
}

/**
 * 在 sourceFolder 中指定位置插入 `[X]` 书签（复制方式，不修改原始书签）
 */
export const addBookmarkToSourceFolder = async (
  sourceFolderPath: string,
  code: string,
  url: string,
  name: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByPath(tree, sourceFolderPath)
  if (!sourceFolder) {
    const bookmarksBar = tree[0]?.children?.[0]
    const otherBookmarks = tree[0]?.children?.[1]
    const parentId = bookmarksBar?.id || otherBookmarks?.id || tree[0].id
    const folder = await chrome.bookmarks.create({
      parentId,
      title: sourceFolderPath.split('/').pop() || sourceFolderPath,
    })
    await createBookmarkInFolderAtPosition(folder.id, code, url, name)
    return
  }

  await createBookmarkInFolderAtPosition(sourceFolder.id, code, url, name)
}

/**
 * 更新 sourceFolder 中指定 code 的书签（先删后加，保持顺序）
 */
export const updateBookmarkInSourceFolder = async (
  sourceFolderPath: string,
  code: string,
  url: string,
  name: string,
): Promise<void> => {
  await removeBookmarkFromSourceFolder(sourceFolderPath, code)
  await addBookmarkToSourceFolder(sourceFolderPath, code, url, name)
}
