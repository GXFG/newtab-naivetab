/**
 * @module style
 * @description 样式工具 — getStyleField 配置值读取、colorMixWithAlpha 颜色混合、字体选择渲染。
 *
 * ## 缩放设计（vmin / px 三层分类）
 *
 * Widget 尺寸属性按视觉语义分为三层，getStyleField 据此选择单位：
 *
 * | 层级 | 属性 | 单位 | 原因 |
 * |------|------|------|------|
 * | 主体尺寸 | fontSize, width, height, padding | vmin | 定义 Widget 视觉体量，随屏幕等比缩放 |
 * | 比例属性 | borderRadius, blockMargin | vmin | 与主体尺寸保持比例，换屏幕不失调 |
 * | 物理细节 | borderWidth, backgroundBlur, cardGap | px | 1px 边框永远是 1px，模糊永远是 N 像素 |
 *
 * ## 阻尼缩放（auto 模式）
 *
 * vmin 线性缩放导致 4K 屏幕元素过大（2x），引入阻尼公式：
 *
 *   CSS:  calc(base × 0.07vmin + base × 0.54px)
 *   数值: base × 0.07 × (vmin_px) + base × 0.54
 *
 * 其中 base = value × 0.1。vmin 部分占 70%，px 锚定部分占 30%（以 1080p 为基准）。
 * 效果：1080p 与现状一致，4K 放大约 1.7x（vs 原 2.0x），大屏不再过度放大。
 *
 * ## scaleMode 开关
 *
 * 用户可通过 `general.scaleMode` 切换缩放策略：
 * - `'auto'`（默认）：阻尼缩放，Dashboard/海报风格
 * - `'fixed'`：vmin 转为 px，所有屏幕统一尺寸，App/文档风格
 * - px 单位不受 scaleMode 影响（物理细节永远固定）
 *
 * @dependencies config/state.ts（localConfig/localState）、./state.ts（globalState）
 * @consumers 各 Widget 组件的 :style 绑定、Setting 面板中的字体选择器
 * @pitfalls
 *   - getStyleField 返回的是 computed，调用时不需要再包 computed
 *   - 双元素数组 [浅色, 深色] 由 getStyleField 自动根据 currAppearanceCode 取对应值
 *   - colorMixWithAlpha 使用 color-mix() CSS 函数，解决 rgba() 不支持 var() 的问题
 * @see docs/architecture/config.md#主题与颜色系统
 */
import type { WidgetCodes } from '@/common/widget-constants'
import { SETTING_KEYBOARD_BASE_SIZE } from '@/common/keyboard'
import { localConfig, localState } from '@/logic/config/state'
import { globalState } from './state'

/**
 * vmin 阻尼缩放参数。
 *
 * auto 模式下，vmin 线性缩放导致 4K 屏幕元素过大（2×），
 * 阻尼公式将渲染值拆为 vmin 动态部分 + px 固定锚定部分：
 *
 *   calc(value × VMIN_COEFF × VMIN_DAMPING vmin  +  value × VMIN_COEFF × BASELINE_VMIN_PX × (1 - VMIN_DAMPING) px)
 *       \________________________/                        \__________________________________________________/
 *             vmin 动态部分（50%）                                  px 锚定部分（50%）
 *
 * - VMIN_COEFF = 0.1：让 config 值在 1080p ≈ px（fontSize: 18 → 1.8vmin ≈ 19px）
 * - VMIN_DAMPING = 0.5：vmin 部分权重。0.5 时 4K 放大约 1.5x（vs 原 2.0x）
 * - BASELINE_VMIN_PX = 10.8：1080p 基准 1vmin = 10.8px，用于 px 锚定计算
 *
 * 1080p 效果与旧公式 value × 0.1vmin 完全一致，大屏自动温和衰减。
 */
const VMIN_COEFF = 0.1
const VMIN_DAMPING = 0.5
const BASELINE_VMIN_PX = 10.8

/**
 * 设置面板中键盘组件的基准尺寸：options 页面更宽，放大 40%
 */
export const getSettingKeyboardSize = (): number => {
  return globalState.settingMode === 'options'
    ? Math.round(SETTING_KEYBOARD_BASE_SIZE * 1.4)
    : SETTING_KEYBOARD_BASE_SIZE
}

/**
 * 将数值按单位规则转为 CSS 尺寸字符串。供 getStyleField 和 useKeyboardStyle 共用，
 * 确保 scaleMode 行为在所有调用方一致。
 *
 * - vmin + auto 模式：阻尼缩放 calc(vmin + px)，1080p 效果不变，大屏温和衰减
 * - vmin + fixed 模式：value → px（所有屏幕固定尺寸）
 * - 其他单位：直接拼接
 */
export const toCssUnit = (value: number, unit: string): string => {
  if (unit === 'vmin' && localConfig.general.scaleMode === 'fixed') {
    return `${value}px`
  }
  if (unit === 'vmin') {
    const base = value * VMIN_COEFF
    const vminPart = base * VMIN_DAMPING
    const pxPart = base * BASELINE_VMIN_PX * (1 - VMIN_DAMPING)
    return `calc(${vminPart.toFixed(2)}vmin + ${pxPart.toFixed(2)}px)`
  }
  return `${value}${unit}`
}

/**
 * 将数值转为实际 px 数值（非 CSS 字符串）。与 toCssUnit 共享同一阻尼公式，
 * 供需要数值计算的场景使用（拖拽坐标换算、键盘单位 → 像素映射）。
 *
 * - vmin + auto 模式：阻尼缩放（与 toCssUnit 一致）
 * - vmin + fixed 模式：value → px（1:1 映射）
 * - 其他单位：value → px（原样返回）
 */
export const unitToPx = (value: number, unit: string): number => {
  if (unit === 'vmin' && localConfig.general.scaleMode === 'fixed') {
    return value
  }
  if (unit === 'vmin') {
    const base = value * VMIN_COEFF
    const vminPx =
      (base * VMIN_DAMPING * Math.min(window.innerWidth, window.innerHeight)) /
      100
    const anchorPx = base * BASELINE_VMIN_PX * (1 - VMIN_DAMPING)
    return vminPx + anchorPx
  }
  return value
}

/**
 * 从 localConfig 中读取配置值并返回 computed ref，供 :style 绑定使用。
 *
 * ## 行为
 * - 数组值（如 [浅色, 深色]）→ 按 currAppearanceCode 取对应索引
 * - 数字值 + unit → 通过 toCssUnit 拼接 CSS 单位字符串
 * - ratio 参数在单位转换前应用（用于相对缩放，如 subFontSize = fontSize × 0.9）
 *
 * @example getStyleField('date', 'unit.fontSize', 'px', 1.2)
 * @example getStyleField('search', 'fontSize', 'vmin')  // auto → '1.8vmin', fixed → '18px'
 */
export const getStyleField = (
  configCode: ConfigField,
  field: string,
  unit?: string,
  ratio?: number,
) => {
  return computed(() => {
    const fieldList = field.split('.')
    let targetValue: any = fieldList.reduce(
      (r: any, c) => r[c],
      localConfig[configCode],
    )

    if (Array.isArray(targetValue)) {
      return targetValue[localState.value.currAppearanceCode]
    }

    if (typeof targetValue !== 'number') {
      return targetValue
    }

    if (ratio) {
      targetValue *= ratio
    }
    if (unit) {
      targetValue = toCssUnit(targetValue, unit)
    }
    return targetValue
  })
}

/**
 * 生成 color-mix 半透明颜色表达式。
 */
export const colorMixWithAlpha = (color: string, alpha: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`

export const customPrimaryColor = getStyleField('general', 'primaryColor')

export const getIsWidgetRender = (widgetCode: WidgetCodes) =>
  computed(() => localConfig[widgetCode].enabled)

export const availableFontOptions = computed(() => {
  const otherFonts = globalState.availableFontList.filter(
    (font) => font !== 'system',
  )
  return [
    { label: 'System Default', value: 'system' },
    ...otherFonts.map((font: string) => ({
      label: font,
      value: font,
    })),
  ]
})
