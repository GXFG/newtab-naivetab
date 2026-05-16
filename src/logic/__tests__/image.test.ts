import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * image.test.ts — 测试 image.ts 中可独立验证的导出函数
 *
 * 覆盖率未显著提升原因：
 * 核心方法 renderRawBackgroundImage 深度耦合浏览器 API：
 * new Image() → img.decode() → URL.createObjectURL/revokeObjectURL →
 * requestAnimationFrame 时序控制。这些 API 在 jsdom 中不可用或行为不完整，
 * mock 成本极高且不稳定。
 *
 * initBackgroundImage / storeLocalBackgroundImage 等函数同样依赖 IndexedDB
 * 和 DOM 元素选择器，无法在纯测试环境中覆盖。
 *
 * 策略：mock 所有依赖，仅测试 getImageUrlFromName（URL 构造）和
 * downloadCurrentWallpaper 的分支路径、模块导出结构。
 * 如需进一步提升 coverage，需引入 jsdom 的 Image/decode mock 方案。
 */

vi.mock('@/logic/utils/util', () => ({
  log: vi.fn(),
}))

vi.mock('@/logic/image/utils', async () => {
  const actual = await vi.importActual('@/logic/image/utils')
  return {
    ...actual,
    urlToFile: vi.fn().mockResolvedValue(new File([''], 'test.jpg', { type: 'image/jpeg' })),
    compressedImageUrlToBase64: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
    downloadImageByUrl: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/logic/utils/database', () => ({
  databaseStore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/logic/config/state', () => ({
  localConfig: {
    general: {
      isBackgroundImageEnabled: true,
      backgroundImageSource: 1, // NETWORK
      backgroundImageList: [
        { networkSourceType: 1, name: 'TestName_ZH-CN123' },
        { networkSourceType: 1, name: 'TestNameDark_ZH-CN456' },
      ],
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

vi.mock('@/logic/image/constants', () => ({
  IMAGE_NETWORK_SOURCE: { BING: 1, PEXELS: 2 },
  BACKGROUND_IMAGE_SOURCE: { LOCAL: 0, NETWORK: 1, BING_PHOTO: 2 },
}))

describe('getImageUrlFromName', () => {
  let getImageUrlFromName: typeof import('@/logic/image/utils')['getImageUrlFromName']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/image/utils')
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
  let downloadCurrentWallpaper: typeof import('@/logic/image/service')['downloadCurrentWallpaper']
  let localConfig: any

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const storeMod = await import('@/logic/config/state')
    ;({ localConfig } = storeMod)
    localConfig.general.isBackgroundImageEnabled = true

    const mod = await import('@/logic/image/service')
    downloadCurrentWallpaper = mod.downloadCurrentWallpaper
  })

  it('does nothing when background image is disabled', async () => {
    localConfig.general.isBackgroundImageEnabled = false
    await downloadCurrentWallpaper()
    expect(vi.mocked(await import('@/logic/image/utils')).downloadImageByUrl).not.toHaveBeenCalled()
  })

  it('downloads from URL for network source', async () => {
    localConfig.general.backgroundImageSource = 1 // NETWORK
    localConfig.general.backgroundImageList = [
      { networkSourceType: 1, name: 'TestName' },
      { networkSourceType: 1, name: '' },
    ]
    localConfig.general.backgroundImageHighQuality = false

    await downloadCurrentWallpaper()

    const utilMod = await import('@/logic/image/utils')
    expect(vi.mocked(utilMod.downloadImageByUrl).mock.calls[0][0]).toContain('cn.bing.com')
  })

  it('downloads from URL for BING_PHOTO source', async () => {
    localConfig.general.backgroundImageSource = 2 // BING_PHOTO
    localConfig.general.backgroundImageHighQuality = true

    await downloadCurrentWallpaper()

    const utilMod = await import('@/logic/image/utils')
    expect(vi.mocked(utilMod.downloadImageByUrl)).toHaveBeenCalled()
  })

  it('returns early when name is empty for network source', async () => {
    localConfig.general.backgroundImageSource = 1
    localConfig.general.backgroundImageList = [
      { networkSourceType: 1, name: '' },
      { networkSourceType: 1, name: '' },
    ]
    localConfig.general.backgroundImageHighQuality = false

    await downloadCurrentWallpaper()

    const utilMod = await import('@/logic/image/utils')
    expect(vi.mocked(utilMod.downloadImageByUrl)).not.toHaveBeenCalled()
  })
})

describe('imageState exports', () => {
  it('has expected fields', async () => {
    const mod = await import('@/logic/image/state')
    expect(mod.imageState).toHaveProperty('currBackgroundImageFileName')
    expect(mod.imageState).toHaveProperty('previewImageUrl')
    expect(mod.imageState).toHaveProperty('fullImageUrl')
  })
})

describe('imageLocalState exports', () => {
  it('has bing and pexels sub-states', async () => {
    const mod = await import('@/logic/image/state')
    expect(mod.imageLocalState.value).toHaveProperty('bing')
    expect(mod.imageLocalState.value).toHaveProperty('pexels')
    expect(mod.imageLocalState.value.bing).toHaveProperty('list')
  })
})

describe('previewImageListMap', () => {
  it('returns computed with favorite, bing, pexels keys', async () => {
    const mod = await import('@/logic/image/gallery')
    const map = mod.previewImageListMap.value
    expect(map).toHaveProperty('favorite')
    expect(map).toHaveProperty('bing')
    expect(map).toHaveProperty('pexels')
  })
})

describe('isImageLoading', () => {
  it('is a ref', async () => {
    const mod = await import('@/logic/image/state')
    expect(mod.isImageLoading).toHaveProperty('value')
  })
})

describe('isImageGalleryLoading', () => {
  it('is a ref', async () => {
    const mod = await import('@/logic/image/state')
    expect(mod.isImageGalleryLoading).toHaveProperty('value')
  })
})
