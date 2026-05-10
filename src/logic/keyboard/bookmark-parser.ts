/**
 * 书签解析器：从 chrome.bookmarks 解析指定文件夹，构建键盘 keymap
 *
 * 解析规则（互不混合，由 bindingMode 开关决定）：
 * - 键位绑定 (bindingMode=true)：只读取 `[X] 名称` 前缀书签，精确绑定到对应键位
 * - 顺序模式 (bindingMode=false)：所有书签按深度优先遍历顺序填充到键位
 *
 * 隐藏规则：书签名/文件夹名以 `_` 开头的条目不参与解析。
 */

import { padUrlHttps } from '@/logic/util'
import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard/keyboard-layout'

// ── 解析接口 ─────────────────────────────────────────────────────────────────

interface ParsedBookmarkEntry {
  code: string
  url: string
  name?: string
}

interface ParseBookmarkFolderOptions {
  bindingMode?: boolean
}

interface ParseBookmarkFolderResult {
  /** 键位 code → bookmark entry 的映射 */
  entries: ParsedBookmarkEntry[]
  /** 按遍历顺序收集的书签（仅顺序模式有效） */
  sequentialBookmarks: Array<{ url: string; name: string }>
}

// ── 核心解析逻辑 ─────────────────────────────────────────────────────────────

/**
 * 解析书签名：`[X] 名称` → `{ code: 'X', name: '名称' }`
 *
 * 不匹配格式时返回 `{ code: undefined, name: 原始标题 }`。
 */
export const parseBookmarkTitle = (
  title: string,
): { code?: string; name: string } => {
  const match = title.match(/^\[([^\]]+)\]\s*(.*)/)
  if (!match) return { name: title }
  const [, code, name] = match
  return { code, name: name || title }
}

/**
 * 在书签树中查找指定名称的文件夹（深度优先，匹配第一个）
 */
export const findFolderByName = (
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  name: string,
): chrome.bookmarks.BookmarkTreeNode | null => {
  for (const node of nodes) {
    if (!node.url && node.title === name) return node
    if (node.children) {
      const found = findFolderByName(node.children, name)
      if (found) return found
    }
  }
  return null
}

/**
 * 规范化 URL：去协议、去尾斜杠、小写，用于模糊匹配书签
 */
const normalizeUrl = (url: string): string =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase()

/**
 * 从 URL 提取域名作为默认名称
 */
const domainNameFromUrl = (url: string): string => {
  const padUrl = padUrlHttps(url)
  const domain = padUrl.split('/')[2]
  if (!domain) return ''
  if (domain.includes(':')) return `:${domain.split(':')[1]}`
  const parts = domain.split('.')
  return parts.includes('www') ? parts[1] : parts[0]
}

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
 * 深度优先遍历书签树，通过 URL 查找书签节点（模糊匹配，忽略协议和尾斜杠）
 */
export const findBookmarkByUrl = (
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  url: string,
): chrome.bookmarks.BookmarkTreeNode | null => {
  const normalized = normalizeUrl(url)
  for (const node of nodes) {
    if (node.url && normalizeUrl(node.url) === normalized) return node
    if (node.children) {
      const found = findBookmarkByUrl(node.children, url)
      if (found) return found
    }
  }
  return null
}

/**
 * 深度优先遍历书签树，跳过 `_` 开头的文件夹和书签
 */
const traverseBookmarks = (
  node: chrome.bookmarks.BookmarkTreeNode,
  callback: (node: chrome.bookmarks.BookmarkTreeNode) => void,
) => {
  // 文件夹：跳过 _ 开头的，递归子节点
  if (!node.url) {
    if (node.title?.startsWith('_')) return
    node.children?.forEach((child) => traverseBookmarks(child, callback))
    return
  }

  // 书签：跳过 _ 开头的
  if (node.title?.startsWith('_')) return

  // 执行回调
  callback(node)
}

/**
 * 键位绑定：只返回精确绑定的键位
 */
const buildExactKeymap = (
  preciseMap: Map<string, ParsedBookmarkEntry>,
  keyboardLayout: string[],
): ParsedBookmarkEntry[] => {
  const entries: ParsedBookmarkEntry[] = []
  for (const code of keyboardLayout) {
    const entry = preciseMap.get(code)
    if (entry) entries.push(entry)
  }
  return entries
}

/**
 * 顺序模式：按键盘布局顺序填充书签
 */
const buildSequentialKeymap = (
  bookmarks: Array<{ url: string; name: string }>,
  keyboardLayout: string[],
): ParsedBookmarkEntry[] => {
  const entries: ParsedBookmarkEntry[] = []
  let bookmarkIndex = 0

  for (const code of keyboardLayout) {
    if (bookmarkIndex >= bookmarks.length) break
    const bookmark = bookmarks[bookmarkIndex++]
    entries.push({
      code,
      url: bookmark.url,
      name: bookmark.name,
    })
  }

  return entries
}

/**
 * 解析指定文件夹，构建键盘 keymap 数据
 *
 * @param sourceFolderTitle - 数据源文件夹名称
 * @param keyboardLayout - 当前布局的所有键位 code 列表（按渲染顺序）
 * @param options - bindingMode: true=键位绑定，false=顺序模式
 */
export const parseBookmarkFolder = async (
  sourceFolderTitle: string,
  keyboardLayout: string[],
  options: ParseBookmarkFolderOptions = {},
): Promise<ParseBookmarkFolderResult> => {
  const { bindingMode = false } = options

  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByName(tree, sourceFolderTitle)
  if (!sourceFolder) {
    return { entries: [], sequentialBookmarks: [] }
  }

  const preciseMap = new Map<string, ParsedBookmarkEntry>()
  const sequentialBookmarks: Array<{ url: string; name: string }> = []

  // 构建布局 code 集合用于快速查找
  const layoutCodeSet = new Set(keyboardLayout)

  traverseBookmarks(sourceFolder, (node) => {
    if (!node.url) return

    const { code, name } = parseBookmarkTitle(node.title || '')

    if (bindingMode) {
      // 键位绑定：只处理 [X] 前缀书签，code 必须匹配键盘布局中的标准 code
      if (code && layoutCodeSet.has(code)) {
        preciseMap.set(code, {
          code,
          url: node.url,
          name: name || node.title,
        })
      }
      // 无前缀书签在键位绑定下被忽略
    } else {
      // 顺序模式：所有书签按顺序收集
      sequentialBookmarks.push({
        url: node.url,
        name: name || node.title,
      })
    }
  })

  return {
    entries: bindingMode
      ? buildExactKeymap(preciseMap, keyboardLayout)
      : buildSequentialKeymap(sequentialBookmarks, keyboardLayout),
    sequentialBookmarks,
  }
}

/**
 * 为指定 URL 的浏览器书签添加 `[X] ` 前缀
 * @param code - 标准键盘 code（如 'KeyQ'）
 * @param url - 书签 URL
 * @param name - 书签名称（可选，为空时从 URL 推断）
 */
export const addBookmarkPrefix = async (
  code: string,
  url: string,
  name?: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const bookmark = findBookmarkByUrl(tree, url)
  if (!bookmark) return

  // 已有前缀则跳过
  if (/^\[([^\]]+)\]\s*/.test(bookmark.title || '')) return

  const prefix = `[${code}] `
  const newName = name || bookmark.title || ''
  await chrome.bookmarks.update(bookmark.id, {
    title: `${prefix}${newName}`,
  })
}

/**
 * 移除指定书签的 `[X] ` 前缀
 * @param url - 书签 URL
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
 * 在指定文件夹下按键盘布局顺序创建书签（带 `[X]` 前缀）
 */
const createBookmarksInFolder = async (
  folderId: string,
  keymap: Record<string, TBookmarkEntry>,
): Promise<void> => {
  // 按键盘布局顺序创建，跳过空 URL
  const layoutCodes = keyboardCurrentModelAllKeyList.value
  for (const code of layoutCodes) {
    const entry = keymap[code]
    if (!entry?.url) continue

    const name = entry.name || domainNameFromUrl(entry.url)
    await chrome.bookmarks.create({
      parentId: folderId,
      title: `[${code}] ${name}`,
      url: padUrlHttps(entry.url),
    })
  }
}

/**
 * 导出 keymap 到浏览器书签树，所有书签自动添加 `[X]` 前缀
 * @param folderTitle - 目标文件夹名称
 * @param keymap - 要导出的 keymap
 * @param mode - 'create' 创建新文件夹 | 'clearAndRebuild' 清空已有文件夹后重建
 */
export const exportKeymapToBrowser = async (
  folderTitle: string,
  keymap: Record<string, TBookmarkEntry>,
  mode: 'create' | 'clearAndRebuild',
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()

  if (mode === 'clearAndRebuild') {
    // 找到已存在的文件夹，清空子节点
    const existingFolder = findFolderByName(tree, folderTitle)
    if (existingFolder && existingFolder.children) {
      for (const child of existingFolder.children) {
        await chrome.bookmarks.remove(child.id)
      }
    }
    // 在清空后的文件夹下创建书签
    if (existingFolder) {
      await createBookmarksInFolder(existingFolder.id, keymap)
      return
    }
    // 文件夹不存在（理论上不该走到这里），降级为创建
  }

  // 创建模式：在根书签栏或"其他书签"下新建文件夹
  const bookmarksBar = tree[0]?.children?.[0] // 书签栏
  const otherBookmarks = tree[0]?.children?.[1] // 其他书签
  const parentId = bookmarksBar?.id || otherBookmarks?.id || tree[0].id
  const folder = await chrome.bookmarks.create({
    parentId,
    title: folderTitle,
  })
  await createBookmarksInFolder(folder.id, keymap)
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
  // 1. 计算目标索引：在已有 [X] 书签中按 code 顺序排列
  const folder = await chrome.bookmarks.getSubTree(folderId)
  const existingPrefixedBookmarks = (folder[0]?.children ?? []).filter(
    (n) => n.url && /^\[([^\]]+)\]/.test(n.title || ''),
  )
  // 提取已有 code 列表
  const existingCodes = existingPrefixedBookmarks.map((n) => {
    const match = n.title!.match(/^\[([^\]]+)\]/)
    return match ? match[1] : ''
  })

  // 目标插入位置：第一个 code 索引大于当前 code 的位置
  const layoutCodes = keyboardCurrentModelAllKeyList.value
  const currentIdx = layoutCodes.indexOf(code)
  let insertIndex = existingPrefixedBookmarks.length // 默认末尾
  for (let i = 0; i < existingCodes.length; i++) {
    const existingIdx = layoutCodes.indexOf(existingCodes[i])
    if (existingIdx > currentIdx) {
      insertIndex = i
      break
    }
  }

  // 2. 创建书签（先添加到末尾）
  const bookmark = await chrome.bookmarks.create({
    parentId: folderId,
    title: `[${code}] ${name}`,
    url: padUrlHttps(url),
  })

  // 3. 移动到正确位置
  await chrome.bookmarks.move(bookmark.id, { index: insertIndex })
}

/**
 * 在 sourceFolder 中指定位置插入 `[X]` 书签（复制方式，不修改原始书签）
 *
 * 流程：先创建到文件夹末尾，再用 `chrome.bookmarks.move` 移到目标位置。
 * 目标位置 = 已有书签中第一个比当前 code 大的索引，没有则为末尾。
 */
export const addBookmarkToSourceFolder = async (
  sourceFolderTitle: string,
  code: string,
  url: string,
  name: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByName(tree, sourceFolderTitle)
  if (!sourceFolder) {
    // sourceFolder 不存在，尝试创建
    const bookmarksBar = tree[0]?.children?.[0]
    const otherBookmarks = tree[0]?.children?.[1]
    const parentId = bookmarksBar?.id || otherBookmarks?.id || tree[0].id
    const folder = await chrome.bookmarks.create({
      parentId,
      title: sourceFolderTitle,
    })
    await createBookmarkInFolderAtPosition(folder.id, code, url, name)
    return
  }

  await createBookmarkInFolderAtPosition(sourceFolder.id, code, url, name)
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
  sourceFolderTitle: string,
  codeA: string,
  codeB: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByName(tree, sourceFolderTitle)
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

  // 每个位置保持前缀不变，内容换成对方的
  const dataAtIdxA = { title: `[${codeA}] ${nameB}`, url: urlB }
  const dataAtIdxB = { title: `[${codeB}] ${nameA}`, url: urlA }

  // 按索引从大到小删除（避免删除一个后另一个索引变化）
  const [firstId, secondId] =
    idxA > idxB ? [bookmarkA.id, bookmarkB.id] : [bookmarkB.id, bookmarkA.id]

  await chrome.bookmarks.remove(firstId)
  await chrome.bookmarks.remove(secondId)

  // 按索引从小到大创建
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
 * 从 sourceFolder 中删除指定 code 的 `[X]` 书签
 *
 * 仅删除 sourceFolder 内的副本，不影响原始书签。
 */
export const removeBookmarkFromSourceFolder = async (
  sourceFolderTitle: string,
  code: string,
): Promise<void> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByName(tree, sourceFolderTitle)
  if (!sourceFolder) return

  const bookmark = findPrefixedBookmarkInFolder(sourceFolder, code)
  if (!bookmark) return

  await chrome.bookmarks.remove(bookmark.id)
}

/**
 * 更新 sourceFolder 中指定 code 的书签（先删后加，保持顺序）
 */
export const updateBookmarkInSourceFolder = async (
  sourceFolderTitle: string,
  code: string,
  url: string,
  name: string,
): Promise<void> => {
  await removeBookmarkFromSourceFolder(sourceFolderTitle, code)
  await addBookmarkToSourceFolder(sourceFolderTitle, code, url, name)
}
