import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseBookmarkTitle,
  parseBookmarkFolder,
  findFolderByName,
  findBookmarkByUrl,
  addBookmarkPrefix,
  removeBookmarkPrefix,
} from '@/logic/keyboard/bookmark-parser'

/** 创建模拟书签节点 */
const bookmark = (
  title: string,
  url: string,
): chrome.bookmarks.BookmarkTreeNode =>
  ({ id: '1', title, url, children: [] } as unknown as chrome.bookmarks.BookmarkTreeNode)

/** 创建模拟文件夹 */
const folder = (
  title: string,
  children: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode =>
  ({ id: '1', title, url: undefined, children } as unknown as chrome.bookmarks.BookmarkTreeNode)

const layoutCodes = ['KeyQ', 'KeyW', 'KeyE', 'Digit1', 'F1']

beforeEach(() => {
  // 清空 localStorage 外的 chrome mock
  ;(globalThis.chrome as any).bookmarks = undefined
})

describe('parseBookmarkTitle', () => {
  it('解析带标准 code 前缀的书签名', () => {
    expect(parseBookmarkTitle('[KeyQ] Google')).toEqual({
      code: 'KeyQ',
      name: 'Google',
    })
  })

  it('解析 F1 前缀', () => {
    expect(parseBookmarkTitle('[F1] 日历')).toEqual({
      code: 'F1',
      name: '日历',
    })
  })

  it('解析 Digit1 前缀', () => {
    expect(parseBookmarkTitle('[Digit1] 测试')).toEqual({
      code: 'Digit1',
      name: '测试',
    })
  })

  it('解析前缀 + 多空格', () => {
    expect(parseBookmarkTitle('[KeyW]   GitHub')).toEqual({
      code: 'KeyW',
      name: 'GitHub',
    })
  })

  it('解析前缀 + 无名称', () => {
    expect(parseBookmarkTitle('[KeyQ]')).toEqual({
      code: 'KeyQ',
      name: '[KeyQ]',
    })
  })

  it('解析无前缀书签', () => {
    expect(parseBookmarkTitle('Google')).toEqual({
      code: undefined,
      name: 'Google',
    })
  })

  it('空方括号视为无前缀', () => {
    expect(parseBookmarkTitle('[] Empty')).toEqual({
      code: undefined,
      name: '[] Empty',
    })
  })

  it('方括号不闭合视为无前缀', () => {
    expect(parseBookmarkTitle('[Q Notion')).toEqual({
      code: undefined,
      name: '[Q Notion',
    })
  })

  it('用户简写 [Q] 会被解析出 code，但在 parseBookmarkFolder 中被过滤', () => {
    expect(parseBookmarkTitle('[Q] Google')).toEqual({
      code: 'Q',
      name: 'Google',
    })
  })
})

describe('parseBookmarkFolder', () => {
  it('精确模式：标准 code 前缀正确绑定', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('[KeyQ] Google', 'https://google.com'),
        bookmark('[KeyW] GitHub', 'https://github.com'),
        bookmark('Notion', 'https://notion.so'),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: true })

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toEqual({
      code: 'KeyQ',
      url: 'https://google.com',
      name: 'Google',
    })
    expect(result.entries[1]).toEqual({
      code: 'KeyW',
      url: 'https://github.com',
      name: 'GitHub',
    })
  })

  it('精确模式：用户简写 [Q] 被过滤（非标准 code）', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('[Q] Google', 'https://google.com'),
        bookmark('[KeyW] GitHub', 'https://github.com'),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: true })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].code).toBe('KeyW')
  })

  it('顺序模式：所有书签按顺序填充', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('Google', 'https://google.com'),
        bookmark('[KeyW] GitHub', 'https://github.com'),
        bookmark('Notion', 'https://notion.so'),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: false })

    expect(result.entries).toHaveLength(3)
    expect(result.entries[0].code).toBe('KeyQ')
    expect(result.entries[1].code).toBe('KeyW')
    expect(result.entries[2].code).toBe('KeyE')
  })

  it('精确模式：_ 开头书签被跳过', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('[KeyQ] Google', 'https://google.com'),
        bookmark('_hidden', 'https://hidden.com'),
        bookmark('[KeyW] GitHub', 'https://github.com'),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: true })

    expect(result.entries).toHaveLength(2)
  })

  it('精确模式：_ 开头文件夹被跳过', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('[KeyQ] Google', 'https://google.com'),
        folder('_archive', [
          bookmark('[KeyW] GitHub', 'https://github.com'),
        ]),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: true })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].code).toBe('KeyQ')
  })

  it('找不到文件夹返回空', async () => {
    const mockTree = [folder('Other', [])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes, { bindingMode: true })

    expect(result.entries).toHaveLength(0)
  })
})

describe('findFolderByName', () => {
  it('在顶层找到匹配的文件夹', () => {
    const tree = [
      folder('NaiveTab', []),
      folder('Other', []),
    ]
    expect(findFolderByName(tree, 'NaiveTab')).toBe(tree[0])
  })

  it('在嵌套文件夹中找到', () => {
    const tree = [
      folder('Root', [
        folder('Level1', [
          folder('Target', []),
        ]),
      ]),
    ]
    const found = findFolderByName(tree, 'Target')
    expect(found).not.toBeNull()
    expect(found?.title).toBe('Target')
  })

  it('找不到返回 null', () => {
    const tree = [folder('Other', [])]
    expect(findFolderByName(tree, 'Missing')).toBeNull()
  })

  it('优先匹配第一个（深度优先）', () => {
    const tree = [
      folder('A', [folder('Sub', [])]),
      folder('B', [folder('Sub', [])]),
    ]
    const found = findFolderByName(tree, 'Sub')
    expect(found?.id).toBe('1')
  })
})

describe('findBookmarkByUrl', () => {
  it('通过精确 URL 找到书签', () => {
    const tree = [
      folder('NaiveTab', [
        bookmark('Google', 'https://google.com'),
        bookmark('GitHub', 'https://github.com'),
      ]),
    ]
    const found = findBookmarkByUrl(tree, 'https://google.com')
    expect(found).not.toBeNull()
    expect(found?.url).toBe('https://google.com')
  })

  it('忽略协议差异（http vs https）', () => {
    const tree = [
      folder('NaiveTab', [
        bookmark('Google', 'https://google.com'),
      ]),
    ]
    const found = findBookmarkByUrl(tree, 'http://google.com')
    expect(found).not.toBeNull()
  })

  it('忽略尾斜杠差异', () => {
    const tree = [
      folder('NaiveTab', [
        bookmark('Google', 'https://google.com'),
      ]),
    ]
    const found = findBookmarkByUrl(tree, 'https://google.com/')
    expect(found).not.toBeNull()
  })

  it('找不到返回 null', () => {
    const tree = [folder('NaiveTab', [])]
    expect(findBookmarkByUrl(tree, 'https://unknown.com')).toBeNull()
  })
})

describe('addBookmarkPrefix', () => {
  it('为书签添加 [X] 前缀', async () => {
    const mockBookmark = bookmark('Google', 'https://google.com')
    const tree = [folder('NaiveTab', [mockBookmark])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(tree)),
      update: vi.fn(() => Promise.resolve({})),
    }

    await addBookmarkPrefix('KeyQ', 'https://google.com', 'Google')

    expect(chrome.bookmarks.update).toHaveBeenCalledWith(
      mockBookmark.id,
      { title: '[KeyQ] Google' },
    )
  })

  it('已有前缀则跳过', async () => {
    const mockBookmark = bookmark('[KeyW] GitHub', 'https://github.com')
    const tree = [folder('NaiveTab', [mockBookmark])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(tree)),
      update: vi.fn(() => Promise.resolve({})),
    }

    await addBookmarkPrefix('KeyQ', 'https://github.com', 'GitHub')

    expect(chrome.bookmarks.update).not.toHaveBeenCalled()
  })

  it('书签不存在则跳过', async () => {
    const tree = [folder('NaiveTab', [])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(tree)),
      update: vi.fn(() => Promise.resolve({})),
    }

    await addBookmarkPrefix('KeyQ', 'https://missing.com', 'Missing')

    expect(chrome.bookmarks.update).not.toHaveBeenCalled()
  })
})

describe('removeBookmarkPrefix', () => {
  it('移除书签的 [X] 前缀', async () => {
    const mockBookmark = bookmark('[KeyQ] Google', 'https://google.com')
    const tree = [folder('NaiveTab', [mockBookmark])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(tree)),
      update: vi.fn(() => Promise.resolve({})),
    }

    await removeBookmarkPrefix('https://google.com')

    expect(chrome.bookmarks.update).toHaveBeenCalledWith(
      mockBookmark.id,
      { title: 'Google' },
    )
  })

  it('无前缀则跳过', async () => {
    const mockBookmark = bookmark('Google', 'https://google.com')
    const tree = [folder('NaiveTab', [mockBookmark])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(tree)),
      update: vi.fn(() => Promise.resolve({})),
    }

    await removeBookmarkPrefix('https://google.com')

    expect(chrome.bookmarks.update).not.toHaveBeenCalled()
  })
})
