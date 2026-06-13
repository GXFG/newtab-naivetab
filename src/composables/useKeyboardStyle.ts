/**
 * useKeyboardStyle
 *
 * 统一计算键盘键帽 / 外壳 / 定位板所需的所有样式变量。
 * - widget（newtab）使用 `vmin` 单位，baseSize 由 `keycapSize * 0.1` 得到的 vmin 数值
 * - popup 使用固定 `px` 基准（默认 40px），直接传入 baseSize 数字
 * - 受 general.scaleMode 控制：fixed 时 vmin 转为 px
 *
 * 调用方通过 `unit` 参数区分两种场景：
 *   - `'vmin'`：widget 场景，内部乘以 0.1 再拼上 vmin（fixed 模式时跳过缩放用 px）
 *   - `'px'`：popup 场景，直接拼上 px
 *
 * 这样两侧的视觉计算公式完全一致，改一处即可同步更新。
 */

import { TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP } from '@/logic/constants/app'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG } from '@/logic/keyboard/keyboard-constants'
import { currKeyboardConfig } from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/config/state'
import { getStyleField, toCssUnit } from '@/logic/store/style'

type Unit = 'vmin' | 'px'

// ─────────────────────────────────────────────────────────────────────────────
export const useKeyboardStyle = (unit: Unit, baseSizeOverride?: number) => {
  // ── base ──────────────────────────────────────────────────────────────────
  /**
   * 所有尺寸计算的基准值（响应式 computed）：
   * - vmin 模式：读取 localConfig.keyboardCommon.keycapSize，用户调整后所有依赖自动更新
   * - px  模式：使用 baseSizeOverride（默认 40px），固定不变
   */
  const base = computed(() =>
    unit === 'px'
      ? (baseSizeOverride ?? 40)
      : localConfig.keyboardCommon.keycapSize,
  )

  // ── keys 查找辅助 ────────────────────────────────────────────────────────
  /** 按 code 查找键位定义，未找到返回 undefined */
  const findKey = (code: string): TKeyDefinition | undefined =>
    currKeyboardConfig.value.keys.find((k) => k.code === code)

  // ── 颜色 ──────────────────────────────────────────────────────────────────
  // getStyleField 返回 computed ref，自动跟随外观模式（light/dark）切换

  // 键帽主色
  const mainFontColor = getStyleField('keyboardCommon', 'mainFontColor')
  const mainBgColor = getStyleField('keyboardCommon', 'mainBackgroundColor')

  // 强调色 1 / 2
  const emphasisOneFontColor = getStyleField(
    'keyboardCommon',
    'emphasisOneFontColor',
  )
  const emphasisOneBgColor = getStyleField(
    'keyboardCommon',
    'emphasisOneBackgroundColor',
  )
  const emphasisTwoFontColor = getStyleField(
    'keyboardCommon',
    'emphasisTwoFontColor',
  )
  const emphasisTwoBgColor = getStyleField(
    'keyboardCommon',
    'emphasisTwoBackgroundColor',
  )

  // 键帽边框 / 字体
  const keycapBorderColor = getStyleField('keyboardCommon', 'keycapBorderColor')
  const keycapKeyFontFamily = getStyleField(
    'keyboardCommon',
    'keycapKeyFontFamily',
  )
  const keycapBookmarkFontFamily = getStyleField(
    'keyboardCommon',
    'keycapBookmarkFontFamily',
  )
  const faviconSize = getStyleField('keyboardCommon', 'faviconSize')

  // Shell
  const shellColor = getStyleField('keyboardCommon', 'shellColor')
  const shellShadowColor = getStyleField('keyboardCommon', 'shellShadowColor')
  const shellBorderRadiusPx = getStyleField(
    'keyboardCommon',
    'shellBorderRadius',
    'px',
  )
  const shellBackgroundBlurPx = getStyleField(
    'keyboardCommon',
    'shellBackgroundBlur',
    'px',
  )

  // Plate
  const plateColor = getStyleField('keyboardCommon', 'plateColor')
  const plateBorderRadiusPx = getStyleField(
    'keyboardCommon',
    'plateBorderRadius',
    'px',
  )

  // ── 键帽尺寸 ──────────────────────────────────────────────────────────────

  /** 内边距基准（文本区 / 图标区 / stage flat 统一使用 8% base） */
  const keycapInnerPaddingCss = computed(() =>
    toCssUnit(0.08 * base.value, unit),
  )

  const keycapBaseSizeCss = computed(() => toCssUnit(base.value, unit))

  const keycapBorderWidthCss = computed(
    () => `${localConfig.keyboardCommon.keycapBorderWidth}px`,
  )

  const borderRadiusCss = computed(() => {
    const r = localConfig.keyboardCommon.keycapBorderRadius
    const s = localConfig.keyboardCommon.keycapSize
    return toCssUnit((r / s) * base.value, unit)
  })

  const keycapPaddingCss = computed(() => {
    const p = localConfig.keyboardCommon.keycapPadding
    const s = localConfig.keyboardCommon.keycapSize
    return toCssUnit((p / s) * base.value, unit)
  })

  const keycapKeyFontSizeCss = computed(() => {
    const s = localConfig.keyboardCommon.keycapSize
    const fs = localConfig.keyboardCommon.keycapKeyFontSize
    return toCssUnit((fs / s) * base.value, unit)
  })

  const keycapBookmarkFontSizeCss = computed(() => {
    const s = localConfig.keyboardCommon.keycapSize
    const fs = localConfig.keyboardCommon.keycapBookmarkFontSize
    return toCssUnit((fs / s) * base.value, unit)
  })

  // ── Keycap 立体边缘（GMK / DSA 键帽型别）─────────────────────────────────
  // GMK：仿 Cherry 高度，顶面向内收窄，底部边缘较厚
  const GMK_EDGE = 0.03
  const gmkTopBorderCss = computed(() => toCssUnit(GMK_EDGE * base.value, unit))
  const gmkHBorderCss = computed(() =>
    toCssUnit(GMK_EDGE * 6 * base.value, unit),
  )
  const gmkBotBorderCss = computed(() =>
    toCssUnit(GMK_EDGE * 7 * base.value, unit),
  )
  const gmkStageMarginTopCss = computed(() =>
    toCssUnit(GMK_EDGE * 0.3 * base.value, unit),
  )
  const gmkStageMarginLeftCss = computed(() =>
    toCssUnit(GMK_EDGE * 1.5 * base.value, unit),
  )
  const gmkStageHeightCss = computed(() =>
    toCssUnit((1 - GMK_EDGE * 8) * base.value, unit),
  )

  // DSA：球面均等高度，四边等宽边缘
  const DSA_EDGE = 0.18
  const dsaBorderCss = computed(() => toCssUnit(DSA_EDGE * base.value, unit))
  const dsaStageMargCss = computed(() =>
    toCssUnit((DSA_EDGE / 3.8) * base.value, unit),
  )
  const dsaStageHeightCss = computed(() =>
    toCssUnit((1 - DSA_EDGE * 1.7) * base.value, unit),
  )

  // ── Shell 尺寸 ────────────────────────────────────────────────────────────
  const shellVPaddingCss = computed(() => {
    const p = localConfig.keyboardCommon.shellVerticalPadding
    const s = localConfig.keyboardCommon.keycapSize
    return toCssUnit((p / s) * base.value, unit)
  })
  const shellHPaddingCss = computed(() => {
    const p = localConfig.keyboardCommon.shellHorizontalPadding
    const s = localConfig.keyboardCommon.keycapSize
    return toCssUnit((p / s) * base.value, unit)
  })

  // ── Plate 尺寸 ────────────────────────────────────────────────────────────
  const platePaddingCss = computed(() => {
    const p = localConfig.keyboardCommon.platePadding
    const s = localConfig.keyboardCommon.keycapSize
    return toCssUnit((p / s) * base.value, unit)
  })

  // ── 触感凸起尺寸（随 base size 等比缩放，约 4% 基准高度） ──────────────────
  const tactileBumpsHeightCss = computed(
    () => `${(0.04 * base.value).toFixed(2)}px`,
  )
  const tactileBumpsWidthCss = computed(
    () => `${(0.18 * base.value).toFixed(2)}px`,
  )

  // ── 配置读取 helpers ──────────────────────────────────────────────────────
  // 读取自定义配置时，优先使用用户覆盖值，回退到默认配置

  /** 获取键帽显示标签（优先自定义 label） */
  const getCustomLabel = (code: string): string =>
    findKey(code)?.label ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code]?.label ?? code

  /** 获取键帽文字对齐（优先自定义 textAlign） */
  const getCustomTextAlign = (code: string): string =>
    findKey(code)?.textAlign ??
    KEYBOARD_CODE_TO_DEFAULT_CONFIG[code]?.textAlign ??
    'center'

  /** 获取键帽宽度（原始数值，不含单位；用于算术计算） */
  const getKeycapWidthValue = (code: string, addRatio = 0): number => {
    const key = findKey(code)
    const size = key?.w ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code]?.size ?? 1
    return (size + addRatio) * base.value
  }

  /** 获取键帽宽度（CSS 字符串，含单位） */
  const getKeycapWidthCss = (code: string, addRatio = 0): string =>
    toCssUnit(getKeycapWidthValue(code, addRatio), unit)

  /**
   * 计算键盘第一行的总宽度（含 shell 左右 padding + 2px border 补偿）。
   * - 供 popup 动态计算弹窗容器宽度，避免调用方重复内联换算公式。
   */
  const getFirstRowWidth = (): number => {
    const SHELL_BORDER_PX = 2
    let width = 0
    if (localConfig.keyboardCommon.isShellVisible) {
      const s = localConfig.keyboardCommon.keycapSize
      width +=
        (localConfig.keyboardCommon.shellHorizontalPadding / s) * base.value * 2
      width += SHELL_BORDER_PX
    }
    const firstRowKeys = currKeyboardConfig.value.keys
      .filter((k) => k.y === 0)
      .sort((a, b) => a.x - b.x)
    for (const key of firstRowKeys) {
      width += (key.w ?? 1) * base.value
    }
    return width
  }

  // ── 复合内联样式 helpers ──────────────────────────────────────────────────
  // 以下函数返回内联 style 字符串，供模板直接绑定 :style

  /** keycap stage 顶面（GMK / DSA 型别的立体偏移） */
  const getKeycapStageStyle = (code: string): string => {
    const keycapType = localConfig.keyboardCommon.keycapType
    const isSpace = code === 'Space'
    const keyH = findKey(code)?.h ?? 1
    const isVerticallyExpanded = keyH > 1
    const spaceGradient =
      'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit;'
    let style = ''
    if (keycapType === 'gmk') {
      style += `margin-top: -${gmkStageMarginTopCss.value};`
      style += `margin-left: -${gmkStageMarginLeftCss.value};`
      style += `width: ${toCssUnit(getKeycapWidthValue(code, -(GMK_EDGE * 10)), unit)};`
      if (isVerticallyExpanded) {
        // 纵向扩展键：stage 撑满 wrapper 全部高度
        style += `height: calc(100% + ${gmkStageMarginTopCss.value});`
      } else {
        style += `height: ${gmkStageHeightCss.value};`
      }
      if (isSpace) style += `${spaceGradient} border-radius;`
    } else if (keycapType === 'dsa') {
      style += `margin: -${dsaStageMargCss.value};`
      if (isVerticallyExpanded) {
        // 纵向扩展键：stage 撑满 wrapper 全部高度
        style += `width: ${toCssUnit(getKeycapWidthValue(code, -(DSA_EDGE * 1.7)), unit)};`
        style += `height: calc(100% + ${dsaStageMargCss.value} * 2);`
      } else {
        style += `width: ${toCssUnit(getKeycapWidthValue(code, -(DSA_EDGE * 1.7)), unit)};`
        style += `height: ${dsaStageHeightCss.value};`
      }
      if (isSpace) style += spaceGradient
    }
    return style
  }

  /** keycap 文本区（text-align + 非居中时加横向 padding） */
  const getKeycapTextStyle = (code: string): string => {
    const textAlign = getCustomTextAlign(code)
    let style = `text-align: ${textAlign};`
    if (textAlign !== 'center')
      style += `padding: 0 ${keycapInnerPaddingCss.value};`
    return style
  }

  /** keycap 图标区（justify-content + padding，依据是否显示名称分支） */
  const getKeycapIconStyle = (code: string): string => {
    const textAlign = getCustomTextAlign(code)
    const justifyContent =
      TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP[
        textAlign as keyof typeof TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP
      ]
    let style = `justify-content: ${justifyContent};`
    if (localConfig.keyboardCommon.isNameVisible) {
      if (justifyContent !== 'center')
        style += `padding: 0 ${keycapInnerPaddingCss.value};`
    } else {
      style += `padding: ${keycapInnerPaddingCss.value};`
    }
    return style
  }

  /** 获取某个键当前的强调色分组（0=普通 / 1=强调一 / 2=强调二） */
  const getEmphasisGroup = (code: string): 0 | 1 | 2 => {
    const override = localConfig.keyboardCommon.emphasisKeyOverrides?.[code]
    if (override !== undefined) return override
    if (currKeyboardConfig.value.emphasisOneCodes?.includes(code)) return 1
    if (currKeyboardConfig.value.emphasisTwoCodes?.includes(code)) return 2
    return 0
  }

  /** 强调键（emphasisOne / emphasisTwo）底色 + 文字色 */
  const getEmphasisStyle = (code: string): string => {
    const group = getEmphasisGroup(code)
    if (group === 1)
      return `background-color:${emphasisOneBgColor.value};color:${emphasisOneFontColor.value};`
    if (group === 2)
      return `background-color:${emphasisTwoBgColor.value};color:${emphasisTwoFontColor.value};`
    return ''
  }

  /**
   * 计算单个键的绝对定位样式。
   * 返回 { left, top, width, height } 的 CSS 变量字符串，绑定到 :style。
   *
   * 键位定位包含 shell padding 偏移（仅外壳可见时），确保开启外壳时键盘整体居中于容器内。
   */
  const getLayoutKeyStyle = (keyDef: TKeyDefinition): string => {
    const w = keyDef.w ?? 1
    const h = keyDef.h ?? 1
    const isShellVisible = localConfig.keyboardCommon.isShellVisible
    const padX = isShellVisible
      ? localConfig.keyboardCommon.shellHorizontalPadding
      : 0
    const padY = isShellVisible
      ? localConfig.keyboardCommon.shellVerticalPadding
      : 0
    const s = localConfig.keyboardCommon.keycapSize
    const offsetX = (padX / s) * base.value
    const offsetY = (padY / s) * base.value
    const left = keyDef.x * base.value + offsetX
    const top = keyDef.y * base.value + offsetY
    return `left: ${toCssUnit(left, unit)}; top: ${toCssUnit(top, unit)}; width: ${toCssUnit(w * base.value, unit)}; height: ${toCssUnit(h * base.value, unit)};`
  }

  // ── 按压位移（随 base size 等比缩放，约 4.3% 基准） ─────────────────────
  const activeTranslateYCss = computed(
    () => `${(0.043 * base.value).toFixed(2)}px`,
  )

  // ── CSS 变量集合 ───────────────────────────────────────────────────────────
  // 汇总所有 keycap 相关 CSS 变量，通过 :style 注入到 KeyboardKeycapDisplay 根节点

  const keycapCssVars = computed(() => ({
    '--nt-kb-main-font-color': mainFontColor.value,
    '--nt-kb-main-bg-color': mainBgColor.value,
    '--nt-kb-border-radius': borderRadiusCss.value,
    '--nt-kb-key-font-family': keycapKeyFontFamily.value,
    '--nt-kb-key-font-size': keycapKeyFontSizeCss.value,
    '--nt-kb-bookmark-font-size': keycapBookmarkFontSizeCss.value,
    '--nt-kb-favicon-size': faviconSize.value,
    '--nt-kb-stage-flat-padding': keycapInnerPaddingCss.value,
    '--nt-kb-gmk-top-border': gmkTopBorderCss.value,
    '--nt-kb-gmk-h-border': gmkHBorderCss.value,
    '--nt-kb-gmk-bot-border': gmkBotBorderCss.value,
    '--nt-kb-dsa-border': dsaBorderCss.value,
    '--nt-kb-border-width': keycapBorderWidthCss.value,
    '--nt-kb-border-color': keycapBorderColor.value,
    '--nt-kb-tactile-height': tactileBumpsHeightCss.value,
    '--nt-kb-tactile-width': tactileBumpsWidthCss.value,
    '--nt-kb-active-translate-y': activeTranslateYCss.value,
  }))

  const layoutCssVars = computed(() => ({
    '--nt-kb-bookmark-font-family': keycapBookmarkFontFamily.value,
    '--nt-kb-keycap-padding': keycapPaddingCss.value,
    '--nt-kb-keycap-height': keycapBaseSizeCss.value,
    '--nt-kb-plate-padding': platePaddingCss.value,
    '--nt-kb-plate-color': plateColor.value,
    '--nt-kb-plate-radius': plateBorderRadiusPx.value,
    '--nt-kb-shell-v-padding': shellVPaddingCss.value,
    '--nt-kb-shell-h-padding': shellHPaddingCss.value,
    '--nt-kb-shell-radius': shellBorderRadiusPx.value,
    '--nt-kb-shell-color': shellColor.value,
    '--nt-kb-shell-blur': shellBackgroundBlurPx.value,
    '--nt-kb-shell-shadow': shellShadowColor.value,
  }))

  // ── 返回值 ────────────────────────────────────────────────────────────────
  return {
    // 基准
    base,

    // CSS 变量集合（注入 KeyboardKeycapDisplay）
    keycapCssVars,

    // CSS 变量集合（注入 KeyboardLayout）
    layoutCssVars,

    // 配置读取
    getCustomLabel,
    getCustomTextAlign,
    getKeycapWidthValue,
    getKeycapWidthCss,
    getFirstRowWidth,

    // 内联样式生成
    getKeycapStageStyle,
    getKeycapTextStyle,
    getKeycapIconStyle,
    getEmphasisGroup,
    getEmphasisStyle,
    getLayoutKeyStyle,

    // Shell 尺寸（供调用方计算容器尺寸时使用）
    shellHPaddingCss,
    shellVPaddingCss,
  }
}
