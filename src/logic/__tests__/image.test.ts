import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * image.test.ts — 测试 image.ts 中可独立验证的导出函数
 *
 * image.ts 有大量模块级副作用（watchers、DOM 操作、IndexedDB），
 * 因此测试策略是 mock 所有依赖，仅测试纯/近纯函数。
 */

vi.mock('@/logic/util', () => ({
  log: vi.fn(),
  urlToFile: vi.fn().mockResolvedValue(new File([''], 'test.jpg', { type: 'image/jpeg' })),
  compressedImageUrlToBase64: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
  downloadImageByUrl: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/logic/database', () => ({
  databaseStore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/logic/store', () => ({
  localConfig: {
    general: {
      isBackgroundImageEnabled: true,
      backgroundImageSource: 1, // NETWORK
      backgroundNetworkSourceType: 1, // BING
      backgroundImageNames: ['TestName_ZH-CN123', 'TestNameDark_ZH-CN456'],
      backgroundImageHighQuality: false,
      isBackgroundImageCustomUrlEnabled: false,
      backgroundImageCustomUrls: ['', ''],
      favoriteImageList: [],
    },
  },
  localState: { value: { currAppearanceCode: 0 } },
}))

vi.mock('@/composables/useStorageLocal', () => ({
  useStorageLocal: vi.fn(() => ({
    value: {
      bing: { syncTime: 0, list: [{ name: 'BingTest', desc: 'Bing Desc' }] },
      pexels: { syncTime: 0, list: [], currentPage: 1 },
    },
  })),
}))

vi.mock('@/api', () => ({
  getBingImagesData: vi.fn(),
  getPexelsImagesData: vi.fn(),
}))

vi.mock('@/logic/constants/image', () => ({
  IMAGE_NETWORK_SOURCE: { BING: 1, PEXELS: 2 },
  BACKGROUND_IMAGE_SOURCE: { LOCAL: 0, NETWORK: 1, BING_PHOTO: 2 },
}))

describe('getImageUrlFromName', () => {
  let getImageUrlFromName: typeof import('@/logic/image')['getImageUrlFromName']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/image')
    getImageUrlFromName = mod.getImageUrlFromName
  })

  it('returns Bing URL for BING source', () => {
    const url = getImageUrlFromName(1, 'YurisNight_ZH-CN5738817931', 'low')
    expect(url).toContain('cn.bing.com')
    expect(url).toContain('OHR.YurisNight_ZH-CN5738817931')
    expect(url).toContain('1366x768')
  })

  it('returns Pexels URL for PEXELS source', () => {
    const url = getImageUrlFromName(2, '19065473', 'medium')
    expect(url).toContain('images.pexels.com')
    expect(url).toContain('19065473')
    expect(url).toContain('h=1080')
  })

  it('returns empty string for unknown source', () => {
    const url = getImageUrlFromName(99 as any, 'test', 'low')
    expect(url).toBe('')
  })

  it('uses high quality for Bing (UHD)', () => {
    const url = getImageUrlFromName(1, 'TestName', 'high')
    expect(url).toContain('UHD')
  })

  it('uses low quality for Pexels (small dimensions)', () => {
    const url = getImageUrlFromName(2, '12345', 'low')
    expect(url).toContain('h=192')
    expect(url).toContain('w=341')
  })
})

describe('downloadCurrentWallpaper', () => {
  let downloadCurrentWallpaper: typeof import('@/logic/image')['downloadCurrentWallpaper']
  let { localConfig } = typeof import('@/logic/store')

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const utilMocks = (await import('@/logic/util'))
    utilMocks.downloadImageByUrl = vi.fn().mockResolvedValue(undefined)

    const storeMod = await import('@/logic/store')
    ;({ localConfig } = storeMod)
    localConfig.general.isBackgroundImageEnabled = true

    const mod = await import('@/logic/image')
    downloadCurrentWallpaper = mod.downloadCurrentWallpaper
  })

  it('does nothing when background image is disabled', async () => {
    localConfig.general.isBackgroundImageEnabled = false
    await downloadCurrentWallpaper()
    expect(vi.mocked(await import('@/logic/util')).downloadImageByUrl).not.toHaveBeenCalled()
  })

  it('downloads from URL for network source', async () => {
    localConfig.general.backgroundImageSource = 1 // NETWORK
    localConfig.general.backgroundNetworkSourceType = 1 // BING
    localConfig.general.backgroundImageNames = ['TestName', '']
    localConfig.general.backgroundImageHighQuality = false

    await downloadCurrentWallpaper()

    const utilMod = await import('@/logic/util')
    expect(vi.mocked(utilMod.downloadImageByUrl).mock.calls[0][0]).toContain('cn.bing.com')
  })
})
