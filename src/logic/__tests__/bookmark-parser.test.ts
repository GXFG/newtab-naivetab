import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseBookmarkTitle,
  parseBookmarkFolder,
  findFolderByPath,
  findBookmarkByUrl,
} from '@/logic/bookmark/parser'
import {
  addBookmarkPrefix,
  removeBookmarkPrefix,
  swapBookmarksInSourceFolder,
  removeBookmarkFromSourceFolder,
} from '@/logic/bookmark/mutations'

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

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes)

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

  it('标准 code 前缀正确绑定', async () => {
    const mockTree = [
      folder('NaiveTab', [
        bookmark('[KeyQ] Google', 'https://google.com'),
        bookmark('[KeyW] GitHub', 'https://github.com'),
      ]),
    ]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes)

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].code).toBe('KeyQ')
    expect(result.entries[1].code).toBe('KeyW')
  })

  it('_ 开头书签被跳过', async () => {
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

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes)

    expect(result.entries).toHaveLength(2)
  })

  it('_ 开头文件夹被跳过', async () => {
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

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes)

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].code).toBe('KeyQ')
  })

  it('找不到文件夹返回空', async () => {
    const mockTree = [folder('Other', [])]
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve(mockTree)),
    }

    const result = await parseBookmarkFolder('NaiveTab', layoutCodes)

    expect(result.entries).toHaveLength(0)
  })
})

describe('findFolderByPath', () => {
  it('在顶层找到匹配的文件夹', () => {
    const tree = [
      folder('NaiveTab', []),
      folder('Other', []),
    ]
    expect(findFolderByPath(tree, 'NaiveTab')).toBe(tree[0])
  })

  it('在嵌套文件夹中找到', () => {
    const tree = [
      folder('Root', [
        folder('Level1', [
          folder('Target', []),
        ]),
      ]),
    ]
    const found = findFolderByPath(tree, 'Root/Level1/Target')
    expect(found).not.toBeNull()
    expect(found?.title).toBe('Target')
  })

  it('找不到返回 null', () => {
    const tree = [folder('Other', [])]
    expect(findFolderByPath(tree, 'Missing')).toBeNull()
  })

  it('路径部分不存在返回 null', () => {
    const tree = [
      folder('A', [folder('Sub', [])]),
      folder('B', [folder('Other', [])]),
    ]
    expect(findFolderByPath(tree, 'A/NonExistent')).toBeNull()
  })

  it('跳过 Chrome 隐形根节点（id="0"，无 title）', () => {
    const tree = [
      { id: '0', children: [folder('书签栏', [folder('NaiveTab', [folder('layer1', [])])])], title: '' },
    ]
    expect(findFolderByPath(tree, 'NaiveTab/layer1')?.title).toBe('layer1')
    expect(findFolderByPath(tree, 'NaiveTab')?.title).toBe('NaiveTab')
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

// ════════════════════════════════════════════════════════════
// swapBookmarksInSourceFolder / removeBookmarkFromSourceFolder
// ════════════════════════════════════════════════════════════

describe('swapBookmarksInSourceFolder', () => {
  /** 交换测试专用书签，带 index 和 parentId */
  const swapBookmark = (
    title: string,
    url: string,
    id: string,
    index: number,
    parentId: string,
  ): chrome.bookmarks.BookmarkTreeNode =>
    ({ id, title, url, index, parentId, children: [] } as unknown as chrome.bookmarks.BookmarkTreeNode)

  /**
   * 构造 Chrome 风格的书签树：root → Bookmarks Bar → NaiveTab → layer1 → bookmarks
   * findFolderByPath('NaiveTab/layer1') 会按路径查找嵌套文件夹
   */
  function mockBookmarks(children: chrome.bookmarks.BookmarkTreeNode[]) {
    const layer1Folder: chrome.bookmarks.BookmarkTreeNode = {
      id: 'layer1',
      title: 'layer1',
      url: undefined,
      children,
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const naiveTabFolder: chrome.bookmarks.BookmarkTreeNode = {
      id: 'naiveTab',
      title: 'NaiveTab',
      url: undefined,
      children: [layer1Folder],
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const bookmarksBar: chrome.bookmarks.BookmarkTreeNode = {
      id: 'bar',
      title: 'Bookmarks Bar',
      url: undefined,
      children: [naiveTabFolder],
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const root: chrome.bookmarks.BookmarkTreeNode = {
      id: '0',
      title: '',
      url: undefined,
      children: [bookmarksBar],
    } as unknown as chrome.bookmarks.BookmarkTreeNode

    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve([root])),
      remove: vi.fn(() => Promise.resolve({})),
      create: vi.fn(() => Promise.resolve({ id: 'new' })),
    }
    return {
      removeMock: chrome.bookmarks.remove as ReturnType<typeof vi.fn>,
      createMock: chrome.bookmarks.create as ReturnType<typeof vi.fn>,
    }
  }

  it('交换两个书签的 URL 和名称，前缀保持不变', async () => {
    const { removeMock, createMock } = mockBookmarks([
      swapBookmark('[KeyQ] Google', 'https://google.com', 'bm1', 0, 'folder1'),
      swapBookmark('[KeyW] GitHub', 'https://github.com', 'bm2', 1, 'folder1'),
    ])

    await swapBookmarksInSourceFolder('NaiveTab/layer1', 'KeyQ', 'KeyW')

    // 应该先删除两个书签（从大到小索引）
    expect(removeMock).toHaveBeenCalledTimes(2)
    // 然后创建两个新书签
    expect(createMock).toHaveBeenCalledTimes(2)

    // 验证创建的内容：KeyQ 处放 GitHub，KeyW 处放 Google
    const created = createMock.mock.calls
    expect(created[0][0]).toMatchObject({
      title: '[KeyQ] GitHub',
      url: 'https://github.com',
    })
    expect(created[1][0]).toMatchObject({
      title: '[KeyW] Google',
      url: 'https://google.com',
    })
  })

  it('交换时保持原始索引位置', async () => {
    const { removeMock, createMock } = mockBookmarks([
      swapBookmark('[KeyA] Alpha', 'https://alpha.com', 'bm1', 0, 'folder1'),
      swapBookmark('[KeyB] Beta', 'https://beta.com', 'bm2', 1, 'folder1'),
      swapBookmark('[KeyC] Gamma', 'https://gamma.com', 'bm3', 2, 'folder1'),
    ])

    await swapBookmarksInSourceFolder('NaiveTab/layer1', 'KeyA', 'KeyC')

    // KeyA 在索引 0，KeyC 在索引 2
    // KeyA 处放 Gamma，KeyC 处放 Alpha
    const created = createMock.mock.calls
    // 索引 0 的创建
    expect(created[0][0]).toMatchObject({
      index: 0,
      title: '[KeyA] Gamma',
      url: 'https://gamma.com',
    })
    // 索引 2 的创建
    expect(created[1][0]).toMatchObject({
      index: 2,
      title: '[KeyC] Alpha',
      url: 'https://alpha.com',
    })
  })

  it('找不到 codeA 的书签时跳过', async () => {
    const { removeMock, createMock } = mockBookmarks([
      swapBookmark('[KeyW] GitHub', 'https://github.com', 'bm1', 0, 'folder1'),
    ])

    await swapBookmarksInSourceFolder('NaiveTab/layer1', 'KeyQ', 'KeyW')

    expect(removeMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('找不到 codeB 的书签时跳过', async () => {
    const { removeMock, createMock } = mockBookmarks([
      swapBookmark('[KeyQ] Google', 'https://google.com', 'bm1', 0, 'folder1'),
    ])

    await swapBookmarksInSourceFolder('NaiveTab/layer1', 'KeyQ', 'KeyW')

    expect(removeMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('文件夹不存在时跳过', async () => {
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve([folder('NaiveTab', [])])),
      remove: vi.fn(() => Promise.resolve({})),
      create: vi.fn(() => Promise.resolve({ id: 'new' })),
    }

    await swapBookmarksInSourceFolder('NonExistent', 'KeyQ', 'KeyW')

    expect(chrome.bookmarks.remove).not.toHaveBeenCalled()
    expect(chrome.bookmarks.create).not.toHaveBeenCalled()
  })
})

describe('removeBookmarkFromSourceFolder', () => {
  /** 删除测试专用书签 */
  const removeBookmark = (
    title: string,
    url: string,
    id: string,
  ): chrome.bookmarks.BookmarkTreeNode =>
    ({ id, title, url, children: [] } as unknown as chrome.bookmarks.BookmarkTreeNode)

  function mockBookmarks(children: chrome.bookmarks.BookmarkTreeNode[]) {
    const layer1Folder: chrome.bookmarks.BookmarkTreeNode = {
      id: 'layer1',
      title: 'layer1',
      url: undefined,
      children,
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const naiveTabFolder: chrome.bookmarks.BookmarkTreeNode = {
      id: 'naiveTab',
      title: 'NaiveTab',
      url: undefined,
      children: [layer1Folder],
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const bookmarksBar: chrome.bookmarks.BookmarkTreeNode = {
      id: 'bar',
      title: 'Bookmarks Bar',
      url: undefined,
      children: [naiveTabFolder],
    } as unknown as chrome.bookmarks.BookmarkTreeNode
    const root: chrome.bookmarks.BookmarkTreeNode = {
      id: '0',
      title: '',
      url: undefined,
      children: [bookmarksBar],
    } as unknown as chrome.bookmarks.BookmarkTreeNode

    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve([root])),
      remove: vi.fn(() => Promise.resolve({})),
    }
    return chrome.bookmarks.remove as ReturnType<typeof vi.fn>
  }

  it('删除指定 code 的书签', async () => {
    const removeMock = mockBookmarks([
      removeBookmark('[KeyQ] Google', 'https://google.com', 'bm1'),
      removeBookmark('[KeyW] GitHub', 'https://github.com', 'bm2'),
    ])

    await removeBookmarkFromSourceFolder('NaiveTab/layer1', 'KeyQ')

    expect(removeMock).toHaveBeenCalledWith('bm1')
    expect(removeMock).toHaveBeenCalledTimes(1)
  })

  it('找不到指定 code 的书签时跳过', async () => {
    const removeMock = mockBookmarks([
      removeBookmark('[KeyQ] Google', 'https://google.com', 'bm1'),
    ])

    await removeBookmarkFromSourceFolder('NaiveTab/layer1', 'KeyW')

    expect(removeMock).not.toHaveBeenCalled()
  })

  it('文件夹不存在时跳过', async () => {
    ;(globalThis.chrome as any).bookmarks = {
      getTree: vi.fn(() => Promise.resolve([folder('NaiveTab', [])])),
      remove: vi.fn(() => Promise.resolve({})),
    }

    await removeBookmarkFromSourceFolder('NonExistent', 'KeyQ')

    expect(chrome.bookmarks.remove).not.toHaveBeenCalled()
  })
})
