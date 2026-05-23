/**
 * image-gallery.test.ts — 测试 image/gallery.ts 中的刷新间隔逻辑和数据汇总
 *
 * 测试目标：
 * - updateBingImages: 3 小时刷新间隔判断
 * - updatePexelsImages: 3 小时刷新间隔 + 清空列表 + 重置页码
 * - previewImageListMap: 三类图片列表汇总
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

const IMAGE_NETWORK_SOURCE = {
  BING: 1,
  PEXELS: 2,
} as const

/** 统一 mock 辅助函数 */
async function loadGallery(overrides: {
  bingSyncTime?: number
  pexelsSyncTime?: number
  pexelsList?: any[]
  pexelsCurrentPage?: number
  bingList?: any[]
  favoriteImageList?: any[]
} = {}) {
  vi.resetModules()

  const mockBingList = overrides.bingList || []
  const mockPexelsList = overrides.pexelsList || []

  const mockGetBingImagesData = vi.fn().mockResolvedValue({ images: [] })
  const mockGetPexelsImagesData = vi.fn().mockResolvedValue({ photos: [] })

  vi.doMock('@/api', () => ({
    getBingImagesData: mockGetBingImagesData,
    getPexelsImagesData: mockGetPexelsImagesData,
  }))
  vi.doMock('@/logic/image/state', () => ({
    imageLocalState: {
      value: {
        bing: { syncTime: overrides.bingSyncTime ?? 0, list: mockBingList },
        pexels: {
          syncTime: overrides.pexelsSyncTime ?? 0,
          list: mockPexelsList,
          currentPage: overrides.pexelsCurrentPage ?? 1,
        },
      },
    },
    isImageGalleryLoading: ref(false),
  }))
  vi.doMock('@/logic/config/state', () => ({
    localConfig: {
      general: {
        favoriteImageList: overrides.favoriteImageList || [],
      },
    },
  }))
  vi.doMock('@/logic/image/utils', async () => {
    const actual = await vi.importActual('@/logic/image/utils')
    return { ...actual, urlToFile: vi.fn(), downloadImageByUrl: vi.fn() }
  })
  vi.doMock('@/logic/utils/database', () => ({ databaseStore: vi.fn() }))
  vi.doMock('@/logic/utils/gtag', () => ({ gaProxy: vi.fn() }))
  vi.doMock('@/logic/utils/util', () => ({ log: vi.fn() }))

  const mod = await import('@/logic/image/gallery')
  return { ...mod, mockGetBingImagesData, mockGetPexelsImagesData }
}

// ── updateBingImages ──

describe('updateBingImages', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncTime 为 0（首次）→ 调用 API', async () => {
    const { mockGetBingImagesData } = await loadGallery({ bingSyncTime: 0 })
    const mod = await import('@/logic/image/gallery')
    await mod.updateBingImages()
    expect(mockGetBingImagesData).toHaveBeenCalled()
  })

  it('syncTime 超过 3 小时 → 调用 API', async () => {
    const { mockGetBingImagesData } = await loadGallery({
      bingSyncTime: Date.now() - 3600000 * 4,
    })
    const mod = await import('@/logic/image/gallery')
    await mod.updateBingImages()
    expect(mockGetBingImagesData).toHaveBeenCalled()
  })

  it('syncTime 在 3 小时内 → 不调用 API', async () => {
    const { mockGetBingImagesData } = await loadGallery({
      bingSyncTime: Date.now() - 3600000 * 2,
    })
    const mod = await import('@/logic/image/gallery')
    await mod.updateBingImages()
    expect(mockGetBingImagesData).not.toHaveBeenCalled()
  })
})

// ── updatePexelsImages ──

describe('updatePexelsImages', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncTime 超过 3 小时 → 调用 API 且重置页码', async () => {
    const { mockGetPexelsImagesData } = await loadGallery({
      pexelsSyncTime: Date.now() - 3600000 * 4,
      pexelsList: [{ name: 'old' }],
      pexelsCurrentPage: 5,
    })
    const mod = await import('@/logic/image/gallery')
    await mod.updatePexelsImages()
    expect(mockGetPexelsImagesData).toHaveBeenCalledWith({
      page: 1,
      per_page: 80,
    })
  })

  it('syncTime 在 3 小时内 → 提前 return', async () => {
    const { mockGetPexelsImagesData } = await loadGallery({
      pexelsSyncTime: Date.now() - 3600000 * 2,
      pexelsList: [{ name: 'old' }],
      pexelsCurrentPage: 5,
    })
    const mod = await import('@/logic/image/gallery')
    await mod.updatePexelsImages()
    expect(mockGetPexelsImagesData).not.toHaveBeenCalled()
  })
})

// ── previewImageListMap ──

describe('previewImageListMap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(async () => {
    await loadGallery({
      bingList: [{ name: 'BingState1', desc: 'desc1' }],
      pexelsList: [{ name: 'PexelsState1', desc: 'desc1' }],
      favoriteImageList: [{ name: 'Favorite1', desc: 'fav1' }],
    })
  })

  it('返回 { favorite, bing, pexels } 三组', async () => {
    const mod = await import('@/logic/image/gallery')
    const result = mod.previewImageListMap.value
    expect(result).toHaveProperty('favorite')
    expect(result).toHaveProperty('bing')
    expect(result).toHaveProperty('pexels')
  })

  it('bing 列表 = state + localBingList 拼接，每项带 networkSourceType', async () => {
    const mod = await import('@/logic/image/gallery')
    const bingList = mod.previewImageListMap.value.bing
    expect(Array.isArray(bingList)).toBe(true)
    for (const item of bingList) {
      expect(item.networkSourceType).toBe(IMAGE_NETWORK_SOURCE.BING)
    }
    expect(bingList.some((item: any) => item.name === 'BingState1')).toBe(true)
  })

  it('pexels 列表每项带 networkSourceType: PEXELS', async () => {
    const mod = await import('@/logic/image/gallery')
    const pexelsList = mod.previewImageListMap.value.pexels
    for (const item of pexelsList) {
      expect(item.networkSourceType).toBe(IMAGE_NETWORK_SOURCE.PEXELS)
    }
    expect(pexelsList.some((item: any) => item.name === 'PexelsState1')).toBe(
      true,
    )
  })

  it('favorite 直接读取 localConfig.general.favoriteImageList', async () => {
    const mod = await import('@/logic/image/gallery')
    const favoriteList = mod.previewImageListMap.value.favorite
    expect(favoriteList).toHaveLength(1)
    expect(favoriteList[0].name).toBe('Favorite1')
  })
})
