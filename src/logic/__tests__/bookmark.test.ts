/**
 * bookmark.test.ts — 测试 bookmark/api.ts 中的书签相关工具函数
 *
 * 测试目标：
 * - getBrowserBookmark: 跨浏览器书签树解析（Chrome / Firefox）
 * - getFaviconFromUrl: favicon URL 生成（Chrome / 其他浏览器）
 *
 * Mock 策略：
 * - @/env 使用 vi.doMock() + vi.resetModules() 控制 isChrome / isFirefox
 * - chrome.bookmarks.getTree 通过 test/setup.ts 已注入的全局 chrome mock 扩展
 */

describe('getBrowserBookmark', () => {
  let getBrowserBookmark: typeof import('@/logic/bookmark/api')['getBrowserBookmark']

  describe('Chrome 环境（默认）', () => {
    beforeEach(async () => {
      vi.resetModules()

      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      // 模拟 Chrome 书签树结构：root → children[0](Bookmarks Bar) → 子书签
      ;(chrome.bookmarks as any) = {
        getTree: vi.fn((cb) => {
          cb([
            {
              id: '0',
              title: '',
              children: [
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
                { id: '2', title: 'Other Bookmarks', children: [] },
              ],
            },
          ])
        }),
      }

      const mod = await import('@/logic/bookmark/api')
      getBrowserBookmark = mod.getBrowserBookmark
    })

    it('returns the first root children (Bookmarks Bar) for Chrome', async () => {
      const result = await getBrowserBookmark()
      // Chrome 路径：res[0].children[0].children = 书签栏的直接子项
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Google')
      expect(result[1].title).toBe('Work')
    })

    it('calls chrome.bookmarks.getTree', async () => {
      await getBrowserBookmark()
      expect(chrome.bookmarks.getTree).toHaveBeenCalled()
    })

    it('returns empty array when root has no children', async () => {
      vi.resetModules()
      vi.doMock('@/env', () => ({
        isChrome: true,
        isFirefox: false,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getTree: vi.fn((cb) => {
          cb([{ id: '0', title: '' }])
        }),
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

      // Firefox 书签结构：root → children[1] 才是用户书签
      ;(chrome.bookmarks as any) = {
        getTree: vi.fn((cb) => {
          cb([
            {
              id: 'root',
              title: '',
              children: [
                { id: 'menu', title: 'menu', children: [] },
                {
                  id: 'toolbar',
                  title: 'toolbar',
                  children: [
                    { id: '20', title: 'Mozilla', url: 'https://mozilla.org' },
                  ],
                },
              ],
            },
          ])
        }),
      }

      const mod = await import('@/logic/bookmark/api')
      getBrowserBookmark = mod.getBrowserBookmark
    })

    it('returns children[1] (toolbar) bookmarks for Firefox', async () => {
      const result = await getBrowserBookmark()
      // Firefox 路径：res[0].children[1].children = toolbar 的子项
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Mozilla')
    })

    it('returns empty array when children[1] is missing', async () => {
      vi.resetModules()
      vi.doMock('@/env', () => ({
        isChrome: false,
        isFirefox: true,
        isEdge: false,
        isMacOS: false,
        isForbiddenUrl: vi.fn(),
      }))

      ;(chrome.bookmarks as any) = {
        getTree: vi.fn((cb) => {
          cb([{ id: 'root', title: '', children: [] }])
        }),
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
