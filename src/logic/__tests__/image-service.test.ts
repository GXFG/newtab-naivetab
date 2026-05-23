/**
 * image-service.test.ts — 测试 image/service.ts 中的纯函数和可独立验证的逻辑
 *
 * 测试目标：
 * - getOppositeAppearanceCode: 外观码互反（纯函数）
 * - getCurrBackgroundImageStoreName: 根据来源返回 DB 表名
 * - getCurrNetworkBackgroundImageUrl: 网络图片 URL 构造逻辑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, reactive } from 'vue'

const BACKGROUND_IMAGE_SOURCE = {
  LOCAL: 0,
  NETWORK: 1,
  BING_PHOTO: 2,
} as const

const IMAGE_NETWORK_SOURCE = {
  BING: 1,
  PEXELS: 2,
} as const

/** 统一 mock 辅助函数 */
async function loadService(overrides: {
  backgroundImageSource?: number
  bingList?: any[]
  backgroundImageList?: any[]
  backgroundImageHighQuality?: boolean
  currAppearanceCode?: number
} = {}) {
  vi.resetModules()

  const mockBingList = overrides.bingList || []
  const mockBackgroundImageList = overrides.backgroundImageList || []

  vi.doMock('@/logic/image/utils', async () => {
    const actual = await vi.importActual('@/logic/image/utils')
    return {
      ...actual,
      urlToFile: vi.fn().mockResolvedValue(new File([''], 'test.jpg')),
      compressedImageUrlToBase64: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
      downloadImageByUrl: vi.fn().mockResolvedValue(undefined),
    }
  })
  vi.doMock('@/logic/utils/database', () => ({ databaseStore: vi.fn() }))
  vi.doMock('@/logic/config/state', () => ({
    localConfig: {
      general: {
        backgroundImageSource: overrides.backgroundImageSource ?? BACKGROUND_IMAGE_SOURCE.NETWORK,
        backgroundImageList: mockBackgroundImageList,
        backgroundImageHighQuality: overrides.backgroundImageHighQuality ?? false,
      },
    },
    localState: { value: { currAppearanceCode: overrides.currAppearanceCode ?? 0 } },
  }))
  vi.doMock('@/logic/image/state', () => ({
    imageState: reactive({ fullImageUrl: '', previewImageUrl: '', currBackgroundImageFileName: '' }),
    imageLocalState: {
      value: {
        bing: { list: mockBingList },
        pexels: { list: [], currentPage: 1 },
      },
    },
    isImageLoading: ref(false),
  }))
  vi.doMock('@/logic/image/gallery', () => ({ updateBingImages: vi.fn() }))
  vi.doMock('@/logic/utils/gtag', () => ({ gaProxy: vi.fn() }))
  vi.doMock('@/logic/utils/util', () => ({ log: vi.fn() }))

  return import('@/logic/image/service')
}

// ── getOppositeAppearanceCode ──

describe('getOppositeAppearanceCode', () => {
  let getOppositeAppearanceCode: (code: number) => number

  beforeEach(async () => {
    const mod = await loadService()
    getOppositeAppearanceCode = mod.getOppositeAppearanceCode
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('输入 0 返回 1', () => {
    expect(getOppositeAppearanceCode(0)).toBe(1)
  })

  it('输入 1 返回 0', () => {
    expect(getOppositeAppearanceCode(1)).toBe(0)
  })
})

// ── getCurrBackgroundImageStoreName ──

describe('getCurrBackgroundImageStoreName', () => {
  let getCurrBackgroundImageStoreName: () => string

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('LOCAL 来源返回 localBackgroundImages', async () => {
    const mod = await loadService({ backgroundImageSource: BACKGROUND_IMAGE_SOURCE.LOCAL })
    getCurrBackgroundImageStoreName = mod.getCurrBackgroundImageStoreName
    expect(getCurrBackgroundImageStoreName()).toBe('localBackgroundImages')
  })

  it('NETWORK 来源返回 currBackgroundImages', async () => {
    const mod = await loadService({ backgroundImageSource: BACKGROUND_IMAGE_SOURCE.NETWORK })
    getCurrBackgroundImageStoreName = mod.getCurrBackgroundImageStoreName
    expect(getCurrBackgroundImageStoreName()).toBe('currBackgroundImages')
  })

  it('BING_PHOTO 来源返回 currBackgroundImages', async () => {
    const mod = await loadService({ backgroundImageSource: BACKGROUND_IMAGE_SOURCE.BING_PHOTO })
    getCurrBackgroundImageStoreName = mod.getCurrBackgroundImageStoreName
    expect(getCurrBackgroundImageStoreName()).toBe('currBackgroundImages')
  })
})

// ── getCurrNetworkBackgroundImageUrl ──

describe('getCurrNetworkBackgroundImageUrl', () => {
  let getCurrNetworkBackgroundImageUrl: (code?: number) => string

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('BING_PHOTO 有今日图片 → 返回 bing URL', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.BING_PHOTO,
      bingList: [{ name: 'TestBing_ZH-CN001' }],
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    const url = getCurrNetworkBackgroundImageUrl()
    expect(url).toContain('TestBing_ZH-CN001')
    expect(url).toContain('1920x1080')
  })

  it('BING_PHOTO 无今日图片 → 返回空字符串', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.BING_PHOTO,
      bingList: [],
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    expect(getCurrNetworkBackgroundImageUrl()).toBe('')
  })

  it('NETWORK 有配置图片 → 返回对应 URL', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.NETWORK,
      backgroundImageList: [
        { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: 'PexelsName_001' },
        { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: 'PexelsName_002' },
      ],
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    const url = getCurrNetworkBackgroundImageUrl(0)
    expect(url).toContain('PexelsName_001')
  })

  it('NETWORK 无配置图片 → 返回空字符串', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.NETWORK,
      backgroundImageList: [],
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    expect(getCurrNetworkBackgroundImageUrl(0)).toBe('')
  })

  it('highQuality 开启时 URL 包含 high 参数', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.BING_PHOTO,
      bingList: [{ name: 'HQTest_ZH-CN001' }],
      backgroundImageHighQuality: true,
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    const url = getCurrNetworkBackgroundImageUrl()
    expect(url).toContain('UHD')
  })

  it('指定 applyToAppearanceCode 时使用对应外观的配置', async () => {
    const mod = await loadService({
      backgroundImageSource: BACKGROUND_IMAGE_SOURCE.NETWORK,
      backgroundImageList: [
        { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: 'Name0_ZH-CN001' },
        { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: 'Name1_ZH-CN002' },
      ],
    })
    getCurrNetworkBackgroundImageUrl = mod.getCurrNetworkBackgroundImageUrl
    const url = getCurrNetworkBackgroundImageUrl(1)
    expect(url).toContain('Name1_ZH-CN002')
  })
})
