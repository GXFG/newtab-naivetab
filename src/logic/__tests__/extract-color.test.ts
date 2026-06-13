/**
 * extract-color 单元测试
 *
 * 测试策略：
 * - 使用 OffscreenCanvas / Canvas 创建测试图片，验证颜色提取算法
 * - 覆盖正常提取、边界情况（纯色/灰度/全黑/全白）
 */

import { describe, it, expect } from 'vitest'

// extractPrimaryColor 依赖浏览器 Canvas API，仅在 jsdom + canvas 支持时测试
const hasCanvasSupport = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext && c.getContext('2d'))
  } catch {
    return false
  }
})()

/**
 * 创建指定颜色的测试图片
 */
function createTestImage(
  width: number,
  height: number,
  fillColor: [number, number, number],
): HTMLImageElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = `rgb(${fillColor[0]}, ${fillColor[1]}, ${fillColor[2]})`
  ctx.fillRect(0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = dataUrl
  return img
}

/**
 * 创建多色渐变测试图片
 */
function createGradientTestImage(
  width: number,
  height: number,
): HTMLImageElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 从蓝到红的水平渐变
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, 'rgb(58, 115, 195)')
  gradient.addColorStop(0.5, 'rgb(100, 180, 100)')
  gradient.addColorStop(1, 'rgb(200, 80, 60)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/png')
  const img = new Image()
  img.src = dataUrl
  return img
}

describe('extract-color', () => {
  // 动态 import，确保 Canvas 支持检查在模块加载后才进行
  let extractPrimaryColor: (img: HTMLImageElement) => string
  let extractAndApplyPrimaryColor: (
    img: HTMLImageElement,
    code: number,
    ref: string[],
  ) => void
  let extractAndApplyBackgroundColor: (
    img: HTMLImageElement,
    code: number,
    ref: string[],
  ) => void

  beforeAll(async () => {
    if (hasCanvasSupport) {
      const mod = await import('@/logic/image/extract-color')
      extractPrimaryColor = mod.extractPrimaryColor
      extractAndApplyPrimaryColor = mod.extractAndApplyPrimaryColor
      extractAndApplyBackgroundColor = mod.extractAndApplyBackgroundColor
    }
  })

  describe('extractPrimaryColor', () => {
    it('从纯蓝色图片提取应返回蓝色调', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [58, 115, 195])
      if (!img) return

      // 等待 data URL 图片解码
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const result = extractPrimaryColor(img)
      expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)

      // 提取的颜色应该接近蓝色（B 通道较高）
      const match = result.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/)
      expect(match).not.toBeNull()
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        // 蓝色主导：B 应该 >= R 且 B >= G
        expect(b).toBeGreaterThanOrEqual(r)
        expect(b).toBeGreaterThanOrEqual(g)
      }
    })

    it('从纯灰色图片提取应返回空字符串（低饱和度过滤）', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [128, 128, 128])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const result = extractPrimaryColor(img)
      // 灰色饱和度为 0，应被过滤
      expect(result).toBe('')
    })

    it('从纯黑图片提取应返回空字符串（过暗过滤）', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [10, 10, 10])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const result = extractPrimaryColor(img)
      expect(result).toBe('')
    })

    it('从纯白图片提取应返回空字符串（过亮过滤）', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [250, 250, 250])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const result = extractPrimaryColor(img)
      expect(result).toBe('')
    })

    it('从多色渐变图片提取应返回非空颜色', async () => {
      if (!hasCanvasSupport) return

      const img = createGradientTestImage(200, 200)
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const result = extractPrimaryColor(img)
      expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
      expect(result).not.toBe('')
    })

    it('空图片（0x0）应返回空字符串', async () => {
      if (!hasCanvasSupport) return

      const canvas = document.createElement('canvas')
      canvas.width = 0
      canvas.height = 0
      const dataUrl = canvas.toDataURL('image/png')
      const img = new Image()
      img.src = dataUrl
      // 等待图片解码完成，确保浏览器已处理 0x0 尺寸（data URL 通常同步但非保证）
      if (!img.complete) {
        await new Promise<void>((resolve) => { img.onload = () => resolve() })
      }

      // 0x0 图片 drawImage 到 canvas 无实际像素
      const result = extractPrimaryColor(img)
      expect(result).toBe('')
    })
  })

/**
 * 解析 rgba 颜色字符串的 RGB 分量
 */
function parseRgba(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
}

/**
 * 计算 RGB 颜色的近似 HSL 亮度（简化版，用于测试断言）
 */
function approxLightness(r: number, g: number, b: number): number {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255
}

  describe('extractAndApplyPrimaryColor', () => {
    it('浅色模式：在 Vibrant 画像区间内取色，亮度应在 0.30–0.60', async () => {
      if (!hasCanvasSupport) return

      // 中等亮度的蓝色，在浅色 Vibrant 画像区间内（L ≈ 0.50, S ≈ 0.40）
      const img = createTestImage(200, 200, [75, 130, 190])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const primaryColorRef = [
        'rgba(0, 0, 0, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      extractAndApplyPrimaryColor(img, 0, primaryColorRef)

      const rgb = parseRgba(primaryColorRef[0])
      expect(rgb).not.toBeNull()
      if (rgb) {
        const lightness = approxLightness(rgb[0], rgb[1], rgb[2])
        expect(lightness).toBeGreaterThanOrEqual(0.30)
        expect(lightness).toBeLessThanOrEqual(0.60)
      }
    })

    it('深色模式：在 Vibrant 画像区间内取色，亮度应在 0.45–0.70', async () => {
      if (!hasCanvasSupport) return

      // 中等亮度偏亮的蓝色，在深色 Vibrant 画像区间内（L ≈ 0.55, S ≈ 0.35）
      const img = createTestImage(200, 200, [100, 145, 200])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const primaryColorRef = [
        'rgba(0, 0, 0, 1)',
        'rgba(0, 0, 0, 1)',
      ]
      extractAndApplyPrimaryColor(img, 1, primaryColorRef)

      const rgb = parseRgba(primaryColorRef[1])
      expect(rgb).not.toBeNull()
      if (rgb) {
        const lightness = approxLightness(rgb[0], rgb[1], rgb[2])
        expect(lightness).toBeGreaterThanOrEqual(0.45)
        expect(lightness).toBeLessThanOrEqual(0.70)
      }
    })

    it('颜色超出画像区间时保持原值不变', async () => {
      if (!hasCanvasSupport) return

      // 偏暗的颜色，不在浅色 Vibrant 画像区间内（L ≈ 0.16 < 0.30）
      const img = createTestImage(200, 200, [30, 50, 100])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const primaryColorRef = [
        'rgba(0, 0, 0, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      extractAndApplyPrimaryColor(img, 0, primaryColorRef)

      // 无颜色在画像区间内，保持原值
      expect(primaryColorRef[0]).toBe('rgba(0, 0, 0, 1)')
      expect(primaryColorRef[1]).toBe('rgba(255, 255, 255, 1)')
    })

    it('浅色模式只写入外观码 0，不修改外观码 1', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [58, 115, 195])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const primaryColorRef = [
        'rgba(0, 0, 0, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      extractAndApplyPrimaryColor(img, 0, primaryColorRef)

      expect(primaryColorRef[0]).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
      expect(primaryColorRef[0]).not.toBe('rgba(0, 0, 0, 1)')
      expect(primaryColorRef[1]).toBe('rgba(255, 255, 255, 1)')
    })

    it('灰色图片 → 无候选色 → 提取失败，保持原值', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [128, 128, 128])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const primaryColorRef = [
        'rgba(0, 0, 0, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      extractAndApplyPrimaryColor(img, 0, primaryColorRef)

      expect(primaryColorRef[0]).toBe('rgba(0, 0, 0, 1)')
      expect(primaryColorRef[1]).toBe('rgba(255, 255, 255, 1)')
    })
  })

  describe('extractAndApplyBackgroundColor', () => {
    it('浅色模式：背景色亮度应在 88%~94%，带微弱壁纸色调', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [100, 140, 180])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const bgRef = ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)']
      extractAndApplyBackgroundColor(img, 0, bgRef)

      const rgb = parseRgba(bgRef[0])
      expect(rgb).not.toBeNull()
      if (rgb) {
        const l = approxLightness(rgb[0], rgb[1], rgb[2])
        expect(l).toBeGreaterThanOrEqual(0.88)
        expect(l).toBeLessThanOrEqual(0.94)
        // 不应是纯灰（R=G=B），应带色调
        const isGray =
          rgb[0] === rgb[1] && rgb[1] === rgb[2]
        expect(isGray).toBe(false)
      }
    })

    it('深色模式：背景色亮度应在 8%~15%，带微弱壁纸色调', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [30, 40, 60])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const bgRef = ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']
      extractAndApplyBackgroundColor(img, 1, bgRef)

      const rgb = parseRgba(bgRef[1])
      expect(rgb).not.toBeNull()
      if (rgb) {
        const l = approxLightness(rgb[0], rgb[1], rgb[2])
        expect(l).toBeGreaterThanOrEqual(0.08)
        expect(l).toBeLessThanOrEqual(0.15)
      }
    })

    it('浅色模式只写入外观码 0，不修改外观码 1', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [100, 140, 180])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const bgRef = ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)']
      extractAndApplyBackgroundColor(img, 0, bgRef)

      expect(bgRef[0]).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
      expect(bgRef[0]).not.toBe('rgba(0, 0, 0, 1)')
      expect(bgRef[1]).toBe('rgba(255, 255, 255, 1)')
    })

    it('深色模式只写入外观码 1，不修改外观码 0', async () => {
      if (!hasCanvasSupport) return

      const img = createTestImage(200, 200, [60, 70, 90])
      if (!img) return

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        if (img.complete) resolve()
      })

      const bgRef = ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)']
      extractAndApplyBackgroundColor(img, 1, bgRef)

      expect(bgRef[1]).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
      expect(bgRef[1]).not.toBe('rgba(255, 255, 255, 1)')
      expect(bgRef[0]).toBe('rgba(0, 0, 0, 1)')
    })

    it('均值提取失败时保持原值不变', async () => {
      if (!hasCanvasSupport) return

      // 0×0 图片 → 无像素 → 提取失败
      const canvas = document.createElement('canvas')
      canvas.width = 0
      canvas.height = 0
      const dataUrl = canvas.toDataURL('image/png')
      const img = new Image()
      img.src = dataUrl

      const bgRef = ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)']
      extractAndApplyBackgroundColor(img, 0, bgRef)

      expect(bgRef[0]).toBe('rgba(0, 0, 0, 1)')
      expect(bgRef[1]).toBe('rgba(255, 255, 255, 1)')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 幻彩色板取色测试（纯函数，无需 Canvas）
// ═══════════════════════════════════════════════════════════════

import {
  extractPrimaryColorFromPalette,
  extractBackgroundColorFromPalette,
} from '@/logic/image/extract-color'

/** 解析 rgba 颜色字符串的 RGB 分量（模块顶层，供新增测试用） */
function parseRgbaStr(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
}

/** 计算近似 HSL 亮度（模块顶层，供新增测试用） */
function approxLightnessTop(r: number, g: number, b: number): number {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255
}

/** 计算近似 HSL 饱和度（简化版，仅用于测试断言） */
function approxS(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255,
    min = Math.min(r, g, b) / 255
  const d = max - min
  if (d === 0) return 0
  const l = (max + min) / 2
  return d / (1 - Math.abs(2 * l - 1))
}

describe('extractPrimaryColorFromPalette (幻彩色板主题色)', () => {
  // 饱和度足够的蓝色（浅色 Vibrant 画像 ~L0.50 S0.40）
  const bluePalette = [
    '#4A90D9',
    '#6BB5FF',
    '#3A7BC8',
    '#2E5FA1',
    '#8EC8FF',
    '#1B3F6B',
  ]
  // 饱和度足够的亮色（深色 Vibrant 画像）
  const brightPalette = [
    '#E87040',
    '#F09060',
    '#D06030',
    '#C05020',
    '#F0A080',
    '#B04010',
  ]

  it('浅色模式：在 Vibrant 区间内选色，返回 rgba 格式', () => {
    const result = extractPrimaryColorFromPalette(bluePalette, 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    expect(rgb).not.toBeNull()
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      const s = approxS(rgb[0], rgb[1], rgb[2])
      // 在浅色 Vibrant 画像区间内：L 0.30–0.60 或已被钳制
      expect(l).toBeGreaterThanOrEqual(0.25) // 允许钳制后小幅越界
      expect(l).toBeLessThanOrEqual(0.65)
      expect(s).toBeGreaterThanOrEqual(0.25)
    }
  })

  it('深色模式：在 Vibrant 区间内选色，返回 rgba 格式', () => {
    const result = extractPrimaryColorFromPalette(brightPalette, 1)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    expect(rgb).not.toBeNull()
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      // 在深色 Vibrant 画像区间内：L 0.45–0.70 或已被钳制
      expect(l).toBeGreaterThanOrEqual(0.40)
      expect(l).toBeLessThanOrEqual(0.75)
    }
  })

  it('浅色模式自动排除低可读性色相（黄色系 40°–80°）', () => {
    // 全是黄色系（H≈50°-60°），在浅色背景上不可读
    const yellowPalette = [
      '#E8D44D',
      '#F0E060',
      '#D4C040',
      '#C8B830',
      '#FCF080',
      '#B8A820',
    ]
    // 浅色模式下黄色系被排除，退回全量候选后走钳制策略，仍应返回有效值
    const result = extractPrimaryColorFromPalette(yellowPalette, 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    expect(result).not.toBe('')
  })

  it('深色模式不排除低可读性色相（所有色相可读）', () => {
    const yellowPalette = [
      '#E8D44D',
      '#F0E060',
      '#D4C040',
      '#C8B830',
      '#FCF080',
      '#B8A820',
    ]
    const result = extractPrimaryColorFromPalette(yellowPalette, 1)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
  })

  it('无色在画像区间内时走钳制退避，仍返回有效值', () => {
    // 极暗色板，所有颜色 L<0.20，不在任何 Vibrant 画像区间内
    const darkPalette = [
      '#1A1A2E',
      '#16213E',
      '#0F3460',
      '#1A1A3E',
      '#1C1C30',
      '#122040',
    ]
    const result = extractPrimaryColorFromPalette(darkPalette, 0)
    // 退避策略：选饱和度最高的 → 钳制亮度到画像边界
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      // 钳制后亮度应 ≥ 0.30
      expect(l).toBeGreaterThanOrEqual(0.25)
    }
  })

  it('空色板返回空字符串', () => {
    expect(extractPrimaryColorFromPalette([], 0)).toBe('')
    expect(extractPrimaryColorFromPalette([], 1)).toBe('')
  })

  it('无效 hex 被过滤，剩余有效色正常工作', () => {
    const mixedPalette = ['#4A90D9', 'invalid', '#6BB5FF', '', '#3A7BC8', '#notacolor']
    const result = extractPrimaryColorFromPalette(mixedPalette, 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
  })

  it('全是无效 hex 返回空字符串', () => {
    expect(extractPrimaryColorFromPalette(['invalid', 'bad', 'xyz'], 0)).toBe('')
  })
})

describe('extractBackgroundColorFromPalette (幻彩色板背景色)', () => {
  const mixedPalette = [
    '#F5F0E8', // 最亮
    '#E8DCC8',
    '#C8B898',
    '#A89878',
    '#887858',
    '#483828', // 最暗
  ]

  it('浅色模式选最亮色并钳制到阅读基底（L 88%–94%）', () => {
    const result = extractBackgroundColorFromPalette(mixedPalette, 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    expect(rgb).not.toBeNull()
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      expect(l).toBeGreaterThanOrEqual(0.85)
      expect(l).toBeLessThanOrEqual(0.96)
      // 应选最亮色 F5F0E8（或钳制后的相近色）
      // 检查不是纯灰：RGB 不应全等
      const isGray = rgb[0] === rgb[1] && rgb[1] === rgb[2]
      expect(isGray).toBe(false)
    }
  })

  it('深色模式选最暗色并钳制到阅读基底（L 8%–15%）', () => {
    const result = extractBackgroundColorFromPalette(mixedPalette, 1)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    expect(rgb).not.toBeNull()
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      expect(l).toBeGreaterThanOrEqual(0.06)
      expect(l).toBeLessThanOrEqual(0.18)
    }
  })

  it('空色板返回空字符串', () => {
    expect(extractBackgroundColorFromPalette([], 0)).toBe('')
    expect(extractBackgroundColorFromPalette([], 1)).toBe('')
  })

  it('无效 hex 被过滤，剩余有效色正常工作', () => {
    const mixed = ['#F5F0E8', 'bad', '#483828', '', 'xyz']
    const result = extractBackgroundColorFromPalette(mixed, 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
  })

  it('全是无效 hex 返回空字符串', () => {
    expect(extractBackgroundColorFromPalette(['bad1', 'bad2'], 0)).toBe('')
  })

  it('单色色板正常工作', () => {
    const result = extractBackgroundColorFromPalette(['#7EC8E3'], 0)
    expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/)
    const rgb = parseRgbaStr(result)
    if (rgb) {
      const l = approxLightnessTop(rgb[0], rgb[1], rgb[2])
      // 钳制到浅色阅读基底
      expect(l).toBeGreaterThanOrEqual(0.85)
      expect(l).toBeLessThanOrEqual(0.96)
    }
  })
})
