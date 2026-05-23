/**
 * bookmark.test.ts — 测试 bookmark/api.ts 中的书签相关工具函数
 *
 * 测试目标：
 * - getBrowserBookmark: 通过 GUID 直接获取书签工具栏内容
 * - findBookmarksBarFromTree: 从 getTree 结果中定位书签栏节点
 * - getFaviconFromUrl: favicon URL 生成（Chrome / 其他浏览器）
 */

describe('getBrowserBookmark', () => {
  let getBrowserBookmark: typeof import('@/logic/bookmark/api')['getBrowserBookmark']
  let findBookmarksBarFromTree: typeof import('@/logic/bookmark/api')['findBookmarksBarFromTree']

  describe('Chrome 环境', () => {
    beforeEach(async () => {
      vi.resetModules()

      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getSubTree: vi.fn(async (id: string) => {
          if (id === '1') {
            return [
              {
                id: '1',
                title: 'Bookmarks Bar',
                children: [
                  { id: '10', title: 'Google', url: 'https://google.com' },
                  {
                    id: '11',
                    title: 'Work',
                    children: [{ id: '110', title: 'Jira', url: 'https://jira.example.com' }],
                  },
                ],
              },
            ]
          }
          return []
        }),
      }

      const mod = await import('@/logic/bookmark/api')
      getBrowserBookmark = mod.getBrowserBookmark
      findBookmarksBarFromTree = mod.findBookmarksBarFromTree
    })

    it('returns bookmarks bar content via getSubTree("1") for Chrome', async () => {
      const result = await getBrowserBookmark()
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Google')
      expect(result[1].title).toBe('Work')
    })

    it('calls chrome.bookmarks.getSubTree with "1"', async () => {
      await getBrowserBookmark()
      expect(chrome.bookmarks.getSubTree).toHaveBeenCalledWith('1')
    })

    it('findBookmarksBarFromTree returns node with id="1" for Chrome', () => {
      const tree = [{ id: '0', children: [
        { id: '1', title: 'Bookmarks Bar' },
        { id: '2', title: 'Other Bookmarks' },
      ]}]
      const bar = findBookmarksBarFromTree(tree)
      expect(bar?.id).toBe('1')
    })

    it('findBookmarksBarFromTree falls back to children[0] for Chrome', () => {
      const tree = [{ id: '0', children: [
        { id: '99', title: 'Some Folder' },
      ]}]
      const bar = findBookmarksBarFromTree(tree)
      expect(bar?.title).toBe('Some Folder')
    })

    it('returns empty array when getSubTree returns empty children', async () => {
      vi.resetModules()
      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getSubTree: vi.fn(async () => [{ id: '1', title: 'Bookmarks Bar' }]),
        getTree: vi.fn(async () => [{ id: '0', title: '', children: [
          { id: '1', title: 'Bookmarks Bar', children: [] },
        ]}]),
      }

      const { getBrowserBookmark: fn } = await import('@/logic/bookmark/api')
      const result = await fn()
      expect(result).toEqual([])
    })
  })

  describe('Firefox 环境', () => {
    beforeEach(async () => {
      vi.resetModules()

      vi.doMock('@/env', () => ({
        isChrome: false,
        isFirefox: true,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getSubTree: vi.fn(async (id: string) => {
          if (id === 'toolbar_____') {
            return [
              {
                id: 'toolbar_____',
                title: 'Bookmarks Toolbar',
                children: [
                  { id: '20', title: 'Mozilla', url: 'https://mozilla.org' },
                ],
              },
            ]
          }
          return []
        }),
      }

      const mod = await import('@/logic/bookmark/api')
      getBrowserBookmark = mod.getBrowserBookmark
      findBookmarksBarFromTree = mod.findBookmarksBarFromTree
    })

    it('returns bookmarks toolbar content via getSubTree("toolbar_____") for Firefox', async () => {
      const result = await getBrowserBookmark()
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Mozilla')
    })

    it('calls chrome.bookmarks.getSubTree with toolbar GUID', async () => {
      await getBrowserBookmark()
      expect(chrome.bookmarks.getSubTree).toHaveBeenCalledWith('toolbar_____')
    })

    it('findBookmarksBarFromTree returns node with id="toolbar_____" for Firefox', () => {
      const tree = [{ id: 'root', children: [
        { id: 'menu', title: 'Bookmarks Menu' },
        { id: 'toolbar_____', title: 'Bookmarks Toolbar' },
        { id: 'unfiled', title: 'Other Bookmarks' },
      ]}]
      const bar = findBookmarksBarFromTree(tree)
      expect(bar?.id).toBe('toolbar_____')
    })

    it('findBookmarksBarFromTree falls back to children[1] for Firefox', () => {
      const tree = [{ id: 'root', children: [
        { id: 'menu', title: 'Bookmarks Menu' },
        { id: 'custom', title: 'Bookmarks Toolbar' },
        { id: 'unfiled', title: 'Other Bookmarks' },
      ]}]
      const bar = findBookmarksBarFromTree(tree)
      expect(bar?.id).toBe('custom')
    })

    it('returns empty array when toolbar has no children', async () => {
      vi.resetModules()
      vi.doMock('@/env', () => ({
        isChrome: false,
        isFirefox: true,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getSubTree: vi.fn(async () => [{ id: 'toolbar_____', title: 'Bookmarks Toolbar' }]),
      }

      const { getBrowserBookmark: fn } = await import('@/logic/bookmark/api')
      const result = await fn()
      expect(result).toEqual([])
    })
  })

  describe('chrome.bookmarks API 不可用', () => {
    it('rejects when chrome.bookmarks is undefined', async () => {
      vi.resetModules()
      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      const origBookmarks = (globalThis as any).chrome.bookmarks
      delete (globalThis as any).chrome.bookmarks

      const { getBrowserBookmark: fn } = await import('@/logic/bookmark/api')
      await expect(fn()).rejects.toThrow('chrome.bookmarks API not available')

      ;(globalThis as any).chrome.bookmarks = origBookmarks
    })
  })
})

describe('getFaviconFromUrl', () => {
  let getFaviconFromUrl: typeof import('@/logic/bookmark/api')['getFaviconFromUrl']

  describe('Chrome 环境', () => {
    beforeEach(async () => {
      vi.resetModules()

      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.runtime as any).id = 'test-extension-id'

      const mod = await import('@/logic/bookmark/api')
      getFaviconFromUrl = mod.getFaviconFromUrl
    })

    it('returns chrome-extension favicon URL', () => {
      const result = getFaviconFromUrl('https://google.com')
      expect(result).toContain('chrome-extension://')
      expect(result).toContain('test-extension-id')
      expect(result).toContain('pageUrl=https%3A%2F%2Fgoogle.com')
      expect(result).toContain('size=128')
    })

    it('uses custom size parameter', () => {
      const result = getFaviconFromUrl('https://google.com', 32)
      expect(result).toContain('size=32')
    })

    it('returns empty string for empty URL', () => {
      expect(getFaviconFromUrl('')).toBe('')
      expect(getFaviconFromUrl('')).toBe('')
    })

    it('returns URL even for unusual input (Chrome path does not validate)', () => {
      // Chrome 路径直接拼接，不会校验 URL 合法性
      const result = getFaviconFromUrl('not-a-valid-url')
      expect(result).toContain('chrome-extension://')
      expect(result).toContain('pageUrl=not-a-valid-url')
    })
  })

  describe('非 Chrome 环境（Firefox / Safari）', () => {
    beforeEach(async () => {
      vi.resetModules()

      vi.doMock('@/env', () => ({
        isChrome: false,
        isFirefox: true,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      const mod = await import('@/logic/bookmark/api')
      getFaviconFromUrl = mod.getFaviconFromUrl
    })

    it('returns Google favicon API URL', () => {
      const result = getFaviconFromUrl('https://example.com/path')
      expect(result).toBe('https://www.google.com/s2/favicons?domain=https://example.com&sz=128')
    })

    it('uses custom size parameter', () => {
      const result = getFaviconFromUrl('https://example.com', 64)
      expect(result).toContain('sz=64')
    })

    it('returns empty string for invalid URL', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = getFaviconFromUrl('invalid')
      expect(result).toBe('')
      consoleSpy.mockRestore()
    })

    it('returns empty string for empty URL', () => {
      expect(getFaviconFromUrl('')).toBe('')
    })
  })
})
