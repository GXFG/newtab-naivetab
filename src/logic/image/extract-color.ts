/**
 * @module image/extract-color
 * @description 从壁纸图片或幻彩色板中提取主题色和背景色。
 *
 *   主题色 — 静态图片：Palette 画像式提取（对标 Android Palette Vibrant 画像）。
 *     在可读性区间内直接找最高频颜色，无需"先挑再钳"的两步矛盾。
 *   主题色 — 幻彩色板：在对应 Vibrant 画像区间内选饱和度最高的颜色。
 *   背景色 — 静态图片：全局 RGB 均值法，取壁纸整体氛围，钳制为舒适的阅读基底。
 *   背景色 — 幻彩色板：浅色模式取最亮色、深色模式取最暗色，再钳制为阅读基底。
 *
 * @dependencies 无外部依赖（仅浏览器 Canvas API）
 * @consumers image/service.ts（decodeAndApplyImage 中调用，幻彩 watcher 中调用）
 * @pitfalls
 *   - 提取操作在 decode 成功后执行，不阻塞首屏渲染
 *   - 输入必须是已解码的 HTMLImageElement（img.decode() 完成后的实例）
 *   - 输出格式为 rgba(r, g, b, 1)，与 primaryColor 配置格式一致
 */

// ═══════════════════════════════════════════════════════════════
// 可调参数 — 修改此处即可调整提取效果，无需改动函数体
// ═══════════════════════════════════════════════════════════════

/**
 * 主题色 Vibrant 画像（对标 Android Palette Vibrant 画像）
 *
 * 直接在 HSL 空间中框定一个"可读 + 鲜艳"的区间，
 * 在此区间内取频率最高的颜色作为主题色。
 * 选出的结果天然在区间内，无需二次钳制。
 *
 * 浅色模式：主题色用于浅色背景上的交互控件。
 *   亮度向下偏移（更暗），确保与浅色背景形成足够对比。
 *   LIGHT_VIBRANT_MIN_L — 下限，防止暗色壁纸出近黑色。
 *   LIGHT_VIBRANT_MAX_L — 上限，防止亮色壁纸出近白色。
 *
 * 深色模式：主题色用于深色背景上的交互控件。
 *   亮度向上偏移（更亮），确保与深色背景形成足够对比。
 *   DARK_VIBRANT_MIN_L — 下限，防止暗色壁纸出近黑色。
 *   DARK_VIBRANT_MAX_L — 上限，防止亮色壁纸出近白色。
 *
 * VIBRANT_MIN_S — 最低饱和度，过滤灰色调。
 */
const LIGHT_VIBRANT_MIN_L = 0.3 // 浅色主题色最小亮度
const LIGHT_VIBRANT_MAX_L = 0.6 // 浅色主题色最大亮度
const DARK_VIBRANT_MIN_L = 0.45 // 深色主题色最小亮度
const DARK_VIBRANT_MAX_L = 0.7 // 深色主题色最大亮度
const VIBRANT_MIN_S = 0.3 // 主题色最低饱和度

/**
 * 浅色模式下主题色的低可读性色相区间。
 *
 * 黄色系（40-80°）和青色系（160-200°）在白色/浅色背景上天生对比度不足，
 * 即使调整亮度也难以辨认——这是 HSL 色相本身的生理视觉特性，非算法缺陷。
 * Material You 通过 Score + Dislike 模块解决同类问题，我们简化为区间排除。
 *
 * 深色模式不受影响：所有色相在暗色背景上均可读。
 */
const LIGHT_MODE_LOW_READABILITY_HUE_RANGES = [
  [40, 80], // 黄色系（金黄 → 柠檬绿）
  [160, 200], // 青色系（青 → 浅蓝）
]

/**
 * 全局过滤 — 先快速排除极端像素，减少后续统计量。
 *
 * 过滤条件极宽松（只要不是近乎纯黑/纯白/纯灰），
 * 真正的可读性过滤由上方 Vibrant 画像负责。
 */
const MIN_LIGHTNESS_GLOBAL = 0.08 // 全局最低亮度
const MAX_LIGHTNESS_GLOBAL = 0.95 // 全局最高亮度
const MIN_SATURATION_GLOBAL = 0.08 // 全局最低饱和度

/**
 * 背景色可读性参数
 *
 * 背景色是页面阅读基底，在 RGB 均值基础上钳制为接近白/接近黑
 * 但保留壁纸的微弱色调。
 */
const LIGHT_BG_MIN_L = 0.88 // 浅色背景最小亮度
const LIGHT_BG_MAX_L = 0.94 // 浅色背景最大亮度
const LIGHT_BG_MIN_S = 0.05 // 浅色背景最低饱和度
const LIGHT_BG_MAX_S = 0.15 // 浅色背景最高饱和度

const DARK_BG_MIN_L = 0.08 // 深色背景最小亮度
const DARK_BG_MAX_L = 0.15 // 深色背景最大亮度
const DARK_BG_MIN_S = 0.03 // 深色背景最低饱和度
const DARK_BG_MAX_S = 0.1 // 深色背景最高饱和度

/**
 * 采样分辨率
 */
const PRIMARY_SAMPLE_SIZE = 200 // 主题色采样长边最大像素
const BG_SAMPLE_SIZE = 50 // 背景色采样长边最大像素

/**
 * 颜色量化精度 — 每通道划分的 bucket 数。
 * 16 → 4096 级量化，对标 Palette 精度。
 */
const QUANTIZE_PRECISION = 16

/**
 * 中心加权 — σ 倍率。
 *
 * 壁纸主体通常在画面中心区域，边缘往往是虚化的天空/地面。
 * 对像素施加高斯衰减加权：中心像素权重 ~1.0，边缘像素 ~0.5。
 * σ 越大衰减越平缓（边缘权重越高），越小边缘越被抑制。
 */
const CENTER_WEIGHT_SIGMA = 0.45

// ═══════════════════════════════════════════════════════════════
// 通用工具
// ═══════════════════════════════════════════════════════════════

/** HSL 颜色 */
interface HSLColor {
  h: number // 0-360
  s: number // 0-1
  l: number // 0-1
}

/** RGB → HSL */
function rgbToHsl(r: number, g: number, b: number): HSLColor {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6

  return { h: h * 360, s, l }
}

/** HSL → RGB */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (h % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = l - c / 2

  let r = 0,
    g = 0,
    b = 0
  if (hp < 1) {
    r = c
    g = x
  } else if (hp < 2) {
    r = x
    g = c
  } else if (hp < 3) {
    g = c
    b = x
  } else if (hp < 4) {
    g = x
    b = c
  } else if (hp < 5) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

/** 解析 rgba(r, g, b, a) → [r, g, b] */
function parseRgba(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null
}

/** 量化 RGB 颜色到指定精度，用于直方图分桶 */
function quantizeColor(
  r: number,
  g: number,
  b: number,
  precision: number,
): string {
  const step = 256 / precision
  return `${Math.floor(r / step) * step},${Math.floor(g / step) * step},${Math.floor(b / step) * step}`
}

/**
 * 判断颜色是否通过全局初筛。
 *
 * 过滤规则极宽松，只排除近乎纯黑、纯白、纯灰的像素。
 * 真正的可读性筛选由 Vibrant 画像区间完成。
 */
function passesGlobalFilter(hsl: HSLColor): boolean {
  return (
    hsl.l >= MIN_LIGHTNESS_GLOBAL &&
    hsl.l <= MAX_LIGHTNESS_GLOBAL &&
    hsl.s >= MIN_SATURATION_GLOBAL
  )
}

/**
 * 判断颜色是否属于浅色 Vibrant 画像。
 *
 * 浅色模式下，主题色应该较暗（与浅色背景形成对比），同时保持鲜艳。
 */
function isLightVibrant(hsl: HSLColor): boolean {
  return (
    hsl.s >= VIBRANT_MIN_S &&
    hsl.l >= LIGHT_VIBRANT_MIN_L &&
    hsl.l <= LIGHT_VIBRANT_MAX_L
  )
}

/**
 * 判断颜色是否属于深色 Vibrant 画像。
 *
 * 深色模式下，主题色应该较亮（与深色背景形成对比），同时保持鲜艳。
 */
function isDarkVibrant(hsl: HSLColor): boolean {
  return (
    hsl.s >= VIBRANT_MIN_S &&
    hsl.l >= DARK_VIBRANT_MIN_L &&
    hsl.l <= DARK_VIBRANT_MAX_L
  )
}

// ═══════════════════════════════════════════════════════════════
// 采样 & 直方图构建
// ═══════════════════════════════════════════════════════════════

/**
 * 将图片绘制到离屏 Canvas，返回像素数据和画布尺寸。
 *
 * 采样分辨率由 maxDimension 控制，长边不超过该值。
 */
function sampleImage(
  img: HTMLImageElement,
  maxDimension: number,
): { pixels: Uint8ClampedArray; width: number; height: number } | null {
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  return {
    pixels: imageData.data,
    width: canvas.width,
    height: canvas.height,
  }
}

/**
 * 构建颜色直方图，可选中心加权。
 *
 * 中心加权：对靠近画面中心的像素施加更高权重。
 * 壁纸主体（人物、建筑等）通常在中心区域，天空/地面等大面积背景在边缘。
 * 权重计算使用高斯函数：w = exp(-d² / (2σ²))，d 为像素到中心的归一化距离。
 *
 * @param centerWeighted 是否启用中心加权（主题色启用，背景色不启用）
 */
function buildHistogram(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  precision: number,
  centerWeighted: boolean,
): Map<string, number> {
  const hist = new Map<string, number>()
  const cx = (width - 1) / 2 // 中心 x
  const cy = (height - 1) / 2 // 中心 y
  const maxDist = Math.sqrt(cx * cx + cy * cy) // 中心到角落的距离
  const twoSigmaSq = 2 * CENTER_WEIGHT_SIGMA * CENTER_WEIGHT_SIGMA

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 128) continue // 跳过透明像素

    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2]

    // 全局初筛：排除极端暗/亮/灰像素，减少 HSL 转换量
    const hsl = rgbToHsl(r, g, b)
    if (!passesGlobalFilter(hsl)) continue

    const key = quantizeColor(r, g, b, precision)

    if (centerWeighted) {
      // 中心加权：像素越靠近中心权重越高
      const px = (i / 4) % width
      const py = Math.floor(i / 4 / width)
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) / maxDist
      const weight = Math.exp(-(dist * dist) / twoSigmaSq)
      hist.set(key, (hist.get(key) || 0) + weight)
    } else {
      hist.set(key, (hist.get(key) || 0) + 1)
    }
  }

  return hist
}

// ═══════════════════════════════════════════════════════════════
// 主题色提取（Palette 画像式）
// ═══════════════════════════════════════════════════════════════

/**
 * 从已解码的图片中提取主题色。
 *
 * 算法（对标 Android Palette Vibrant 画像）：
 * 1. Canvas 采样到 ~200px
 * 2. 构建中心加权直方图（4096 桶）
 * 3. 在 Vibrant 画像区间内找加权频率最高的颜色
 * 4. 输出 rgba() 格式
 *
 * 此函数仅做全局饱和度过滤（最低饱和度 VIBRANT_MIN_S），选出加权频率最高的颜色。
 * 不做 Vibrant 画像（亮度区间）过滤——该步骤由 extractAndApplyPrimaryColor 中的
 * pickByProfile 完成，因为浅色/深色模式的可读亮度区间不同，需要在调用层区分。
 * 生产代码中应使用 extractAndApplyPrimaryColor，此函数主要用于测试和单步调试。
 *
 * 与旧版的区别：
 * - 旧版：全局统计 → 自定义权重排序 → 钳进可读区间（两步矛盾）
 * - 新版：全局饱和度过滤 → 频率排序 → 画像亮度过滤（分层清晰）
 *
 * @returns 主题色字符串 rgba(r, g, b, 1)，提取失败返回空字符串
 */
export function extractPrimaryColor(img: HTMLImageElement): string {
  try {
    const sample = sampleImage(img, PRIMARY_SAMPLE_SIZE)
    if (!sample) return ''

    const hist = buildHistogram(
      sample.pixels,
      sample.width,
      sample.height,
      QUANTIZE_PRECISION,
      true,
    )
    if (hist.size === 0) return ''

    // 全局最高频（仅经过饱和度过滤，未做 Vibrant 画像亮度过滤）。
    // 画像亮度过滤由 extractAndApplyPrimaryColor 中的 pickByProfile 完成，
    // 因为浅色/深色模式的可读亮度区间不同，需在调用层区分。
    let bestKey = '',
      bestWeight = 0
    for (const [key, weight] of hist) {
      if (weight > bestWeight) {
        bestWeight = weight
        bestKey = key
      }
    }

    if (!bestKey) return ''
    const [r, g, b] = bestKey.split(',').map(Number)
    return `rgba(${r}, ${g}, ${b}, 1)`
  } catch {
    return ''
  }
}

/**
 * 从直方图中按指定画像筛选最高频颜色。
 *
 * 核心思路：不在全局找"最好"的颜色然后钳制，
 * 而是直接在目标画像区间内找最突出的颜色——天然合规，无需二次调整。
 *
 * @returns 选中颜色的 RGB，无匹配时返回 null
 */
function pickByProfile(
  hist: Map<string, number>,
  profileFilter: (hsl: HSLColor) => boolean,
): [number, number, number] | null {
  let bestKey = '',
    bestWeight = 0
  for (const [key, weight] of hist) {
    if (weight <= bestWeight) continue
    const [r, g, b] = key.split(',').map(Number)
    if (profileFilter(rgbToHsl(r, g, b))) {
      bestWeight = weight
      bestKey = key
    }
  }
  if (!bestKey) return null
  const [r, g, b] = bestKey.split(',').map(Number)
  return [r, g, b]
}

/**
 * 从已解码的图片中提取主题色并应用到对应外观码。
 *
 * 流程：
 * 1. 采样 + 构建中心加权直方图
 * 2. 按目标外观码选择 Vibrant 画像（浅色 isLightVibrant / 深色 isDarkVibrant）
 * 3. 在画像区间内取频率最高的颜色 → 天然在可读区间内
 * 4. 写回 primaryColorRef[targetAppearanceCode]
 *
 * 提取失败时不修改原值。
 */
export function extractAndApplyPrimaryColor(
  img: HTMLImageElement,
  targetAppearanceCode: number,
  primaryColorRef: string[],
): void {
  try {
    const sample = sampleImage(img, PRIMARY_SAMPLE_SIZE)
    if (!sample) return

    const hist = buildHistogram(
      sample.pixels,
      sample.width,
      sample.height,
      QUANTIZE_PRECISION,
      true,
    )
    if (hist.size === 0) return

    const profile = targetAppearanceCode === 0 ? isLightVibrant : isDarkVibrant
    const rgb = pickByProfile(hist, profile)
    if (!rgb) return

    primaryColorRef[targetAppearanceCode] =
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`
  } catch {
    // 静默降级
  }
}

// ═══════════════════════════════════════════════════════════════
// 背景色提取（均值法 — 取壁纸整体氛围）
// ═══════════════════════════════════════════════════════════════

/**
 * 从已解码的图片中提取整体氛围色（RGB 均值，不做中心加权）。
 *
 * 背景色需要反映壁纸的整体色调，而非最突出的颜色，
 * 因此使用简单的 RGB 均值，不对中心区域加偏。
 */
function extractAverageColor(img: HTMLImageElement): string {
  try {
    const sample = sampleImage(img, BG_SAMPLE_SIZE)
    if (!sample) return ''

    const { pixels, width, height } = sample
    const totalPixels = width * height
    if (totalPixels === 0) return ''

    let sumR = 0,
      sumG = 0,
      sumB = 0,
      count = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue
      sumR += pixels[i]
      sumG += pixels[i + 1]
      sumB += pixels[i + 2]
      count++
    }

    if (count === 0) return ''
    return `rgba(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)}, 1)`
  } catch {
    return ''
  }
}

/**
 * 按外观模式调整背景色，确保舒适可读。
 *
 * 在 RGB 均值基础上，钳制亮度和饱和度为舒适的阅读基底。
 *
 * 浅色模式：极亮但不纯白，保留微弱的壁纸色调。
 * 深色模式：极暗但不纯黑，保留微弱的壁纸色调。
 */
function adjustBackgroundForReadability(
  hsl: HSLColor,
  targetAppearanceCode: number,
): HSLColor {
  if (targetAppearanceCode === 0) {
    return {
      h: hsl.h,
      s: Math.min(Math.max(hsl.s, LIGHT_BG_MIN_S), LIGHT_BG_MAX_S),
      l: Math.min(Math.max(hsl.l, LIGHT_BG_MIN_L), LIGHT_BG_MAX_L),
    }
  }
  return {
    h: hsl.h,
    s: Math.min(Math.max(hsl.s, DARK_BG_MIN_S), DARK_BG_MAX_S),
    l: Math.min(Math.max(hsl.l, DARK_BG_MIN_L), DARK_BG_MAX_L),
  }
}

/**
 * 从已解码的图片中提取背景色并应用到对应外观码。
 *
 * 流程：
 * 1. extractAverageColor() 均值法获取壁纸整体氛围色
 * 2. adjustBackgroundForReadability() 钳制饱和度+亮度为舒适的阅读基底
 * 3. 写回 backgroundColorRef[targetAppearanceCode]
 *
 * 提取失败时不修改原值。
 */
export function extractAndApplyBackgroundColor(
  img: HTMLImageElement,
  targetAppearanceCode: number,
  backgroundColorRef: string[],
): void {
  const extracted = extractAverageColor(img)
  if (!extracted) return

  const rgb = parseRgba(extracted)
  if (!rgb) return

  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
  const adjusted = adjustBackgroundForReadability(hsl, targetAppearanceCode)
  const [r, g, b] = hslToRgb(adjusted.h, adjusted.s, adjusted.l)

  backgroundColorRef[targetAppearanceCode] = `rgba(${r}, ${g}, ${b}, 1)`
}

// ═══════════════════════════════════════════════════════════════
// 幻彩色板取色（无 Canvas 依赖，纯 HSL 运算）
// ═══════════════════════════════════════════════════════════════

/**
 * hex 色值 → RGB 三元组。
 * 支持 `#RGB`、`#RRGGBB` 两种格式。
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return null
  let r: number, g: number, b: number
  if (m[1].length === 3) {
    r = parseInt(m[1][0] + m[1][0], 16)
    g = parseInt(m[1][1] + m[1][1], 16)
    b = parseInt(m[1][2] + m[1][2], 16)
  } else {
    r = parseInt(m[1].slice(0, 2), 16)
    g = parseInt(m[1].slice(2, 4), 16)
    b = parseInt(m[1].slice(4, 6), 16)
  }
  return [r, g, b]
}

/**
 * 从幻彩色板中智能选取主题色。
 *
 * 策略：在对应 Vibrant 画像区间内选饱和度最高的颜色。
 * 浅色模式下额外排除低可读性色相（LIGHT_MODE_LOW_READABILITY_HUE_RANGES）——
 * 黄色系和青色系在浅色背景上天生对比度不足，即使钳制亮度也会显得模糊。
 * 若所有颜色都在低可读性色相区间内，退回全量候选。
 *
 * @param palette hex 色值数组，通常 6 色
 * @param targetAppearanceCode 0=浅色 1=深色
 * @returns rgba() 格式主题色，失败返回空字符串
 */
export function extractPrimaryColorFromPalette(
  palette: string[],
  targetAppearanceCode: number,
): string {
  try {
    const hslList = palette
      .map((hex) => {
        const rgb = hexToRgb(hex)
        if (!rgb) return null
        return { hsl: rgbToHsl(rgb[0], rgb[1], rgb[2]) }
      })
      .filter((c): c is { hsl: HSLColor } => c !== null)

    if (hslList.length === 0) return ''

    // 浅色模式：排除天生低可读性的色相（黄系、青系）
    // 深色模式：所有色相在深色背景上均可读，不加限制
    const candidates =
      targetAppearanceCode === 0
        ? hslList.filter((c) =>
            LIGHT_MODE_LOW_READABILITY_HUE_RANGES.every(
              ([lo, hi]) => c.hsl.h < lo || c.hsl.h > hi,
            ),
          )
        : hslList
    // 若过滤后无候选，退回到全量
    const pool = candidates.length > 0 ? candidates : hslList

    const profile = targetAppearanceCode === 0 ? isLightVibrant : isDarkVibrant

    // 优先：在画像区间内选饱和度最高的
    let best = pool
      .filter((c) => profile(c.hsl))
      .reduce<{
        hsl: HSLColor
      } | null>((a, b) => (!a || b.hsl.s > a.hsl.s ? b : a), null)

    // 退而求其次：选饱和度最高的，钳制亮度到画像边界
    if (!best) {
      best = pool.reduce((a, b) => (b.hsl.s > a.hsl.s ? b : a))
      const bounds =
        targetAppearanceCode === 0
          ? { minL: LIGHT_VIBRANT_MIN_L, maxL: LIGHT_VIBRANT_MAX_L }
          : { minL: DARK_VIBRANT_MIN_L, maxL: DARK_VIBRANT_MAX_L }
      best = {
        hsl: {
          ...best.hsl,
          s: Math.max(best.hsl.s, VIBRANT_MIN_S),
          l: Math.min(Math.max(best.hsl.l, bounds.minL), bounds.maxL),
        },
      }
    }

    const [r, g, b] = hslToRgb(best.hsl.h, best.hsl.s, best.hsl.l)
    return `rgba(${r}, ${g}, ${b}, 1)`
  } catch {
    return ''
  }
}

/**
 * 从幻彩色板中智能选取背景色。
 *
 * 策略：浅色模式取最亮色、深色模式取最暗色，
 * 再通过 adjustBackgroundForReadability 钳制为舒适的阅读基底。
 *
 * @param palette hex 色值数组，通常 6 色
 * @param targetAppearanceCode 0=浅色 1=深色
 * @returns rgba() 格式背景色，失败返回空字符串
 */
export function extractBackgroundColorFromPalette(
  palette: string[],
  targetAppearanceCode: number,
): string {
  try {
    const hslList = palette
      .map((hex) => {
        const rgb = hexToRgb(hex)
        if (!rgb) return null
        return { hsl: rgbToHsl(rgb[0], rgb[1], rgb[2]) }
      })
      .filter((c): c is { hsl: HSLColor } => c !== null)

    if (hslList.length === 0) return ''

    // 浅色模式取最亮、深色模式取最暗
    const best =
      targetAppearanceCode === 0
        ? hslList.reduce((a, b) => (b.hsl.l > a.hsl.l ? b : a))
        : hslList.reduce((a, b) => (b.hsl.l < a.hsl.l ? b : a))

    const adjusted = adjustBackgroundForReadability(
      best.hsl,
      targetAppearanceCode,
    )
    const [r, g, b] = hslToRgb(adjusted.h, adjusted.s, adjusted.l)
    return `rgba(${r}, ${g}, ${b}, 1)`
  } catch {
    return ''
  }
}
