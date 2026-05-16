type KeycapVisualType = 'gmk' | 'dsa' | 'flat'

/** 单个键位的坐标定义 */
interface TKeyDefinition {
  code: string
  x: number
  y: number
  w?: number
  h?: number
  label?: string
  textAlign?: 'left' | 'center' | 'right'
}

/** Space 键拆分的单个键位定义（仅定义宽度，x 坐标由运行时从 Space 起点累加计算） */
interface TSpaceVariantKey {
  code: string
  w: number
}

/** 完整的键盘布局定义 */
interface TKeyboardDefinition {
  id: string
  name: string
  keys: TKeyDefinition[]
  emphasisOneCodes?: string[]
  emphasisTwoCodes?: string[]
  /** Space 键拆分变体：根据 splitSpace 配置选择对应的 Space 区域布局 */
  spaceVariants?: {
    space1: TSpaceVariantKey[]
    space2: TSpaceVariantKey[]
    space3: TSpaceVariantKey[]
  }
}

interface KeyboardConfigItem {
  label?: string
  textAlign?: 'left' | 'center' | 'right'
  size: number
  alias?: string // LShift
  marginLeft?: number // default 0
  marginRight?: number // default 0
  marginBottom?: number // default 0
}

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

interface TBookmarkEntry {
  url: string
  name?: string
}

interface BookmarkItem {
  key: string
  url: string
  name?: string
}
