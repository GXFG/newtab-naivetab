/**
 * @module bookmark/parser
 * @description 书签解析器：从 chrome.bookmarks 解析指定文件夹，构建键盘 keymap。
 *   解析规则：只读取 `[X] 名称` 前缀书签，精确绑定到对应键位。
 *   隐藏规则：书签名/文件夹名以 `_` 开头的条目不参与解析。
 * @dependencies bookmark/api.ts（findBookmarksBarFromTree）
 * @consumers bookmark/mutations.ts、keyboard/bookmark-state.ts、keyboard/bookmark-export.ts
 * @see docs/features/bookmark.md
 */

import { findBookmarksBarFromTree } from '@/logic/bookmark/api'

// ── 解析接口 ─────────────────────────────────────────────────────────────────

interface ParsedBookmarkEntry {
  code: string
  url: string
  name?: string
}

interface ParseBookmarkFolderResult {
  /** 键位 code → bookmark entry 的映射 */
  entries: ParsedBookmarkEntry[]
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
 * 在书签树中按路径查找文件夹（如 "NaiveTab/layer1" 或 "layer1"）
 *
 * 通过 findBookmarksBarFromTree 定位书签工具栏，不依赖 children 索引顺序。
 */
export const findFolderByPath = (
  tree: chrome.bookmarks.BookmarkTreeNode[],
  path: string,
): chrome.bookmarks.BookmarkTreeNode | null => {
  const parts = path.split('/')

  // 通过 findBookmarksBarFromTree 定位书签工具栏，与 getBrowserBookmark 保持一致。
  // Chrome: 通过 ID "1" 或标题匹配定位；Firefox: 通过 GUID "toolbar_____" 定位。
  const root = tree[0]
  let current: chrome.bookmarks.BookmarkTreeNode[] = tree
  if (root?.children) {
    const barNode = findBookmarksBarFromTree(tree)
    current = barNode?.children ?? root.children
  }
  let foundNode: chrome.bookmarks.BookmarkTreeNode | null = null

  for (const part of parts) {
    foundNode = current.find((n) => !n.url && n.title === part) ?? null
    if (!foundNode) return null
    current = foundNode.children ?? []
  }

  return foundNode
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
 * 从 URL 提取域名作为默认书签名称。
 * 供 newtab Widget（logic.ts）和书签导出（bookmark-export.ts）共用。
 */
export const extractDomainName = (url: string): string => {
  if (!url) return ''
  const padUrl = url.startsWith('http') ? url : `https://${url}`
  const domain = padUrl.split('/')[2]
  if (!domain) return ''
  if (domain.includes(':')) return `:${domain.split(':')[1]}`
  const parts = domain.split('.')
  return parts.includes('www') ? parts[1] : parts[0]
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
 * 解析指定文件夹，构建键盘 keymap 数据
 *
 * @param sourceFolderPath - 数据源文件夹路径（如 "NaiveTab/layer1" 或 "layer1"）
 * @param keyboardLayout - 当前布局的所有键位 code 列表（按渲染顺序）
 */
export const parseBookmarkFolder = async (
  sourceFolderPath: string,
  keyboardLayout: string[],
): Promise<ParseBookmarkFolderResult> => {
  const tree = await chrome.bookmarks.getTree()
  const sourceFolder = findFolderByPath(tree, sourceFolderPath)
  if (!sourceFolder) {
    return { entries: [] }
  }

  const preciseMap = new Map<string, ParsedBookmarkEntry>()

  // 构建布局 code 集合用于快速查找
  const layoutCodeSet = new Set(keyboardLayout)

  traverseBookmarks(sourceFolder, (node) => {
    if (!node.url) return

    const { code, name } = parseBookmarkTitle(node.title || '')

    // 只处理 [X] 前缀书签，code 必须匹配键盘布局中的标准 code
    if (code && layoutCodeSet.has(code)) {
      preciseMap.set(code, {
        code,
        url: node.url,
        name: name || node.title,
      })
    }
  })

  return {
    entries: buildExactKeymap(preciseMap, keyboardLayout),
  }
}
