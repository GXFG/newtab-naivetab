/**
 * @module style
 * @description 样式工具 — getStyleField 配置值读取、colorMixWithAlpha 颜色混合、字体选择渲染。
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
 * 设置面板中键盘组件的基准尺寸：options 页面更宽，放大 40%
 */
export const getSettingKeyboardSize = (): number => {
  return globalState.settingMode === 'options'
    ? Math.round(SETTING_KEYBOARD_BASE_SIZE * 1.4)
    : SETTING_KEYBOARD_BASE_SIZE
}

/**
 * e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
 * 当unit为vmin时会自动将 ratio * 0.1
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
      (r, c) => r[c],
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
      if (unit === 'vmin') {
        targetValue *= 0.1
      }
      targetValue = `${targetValue}${unit}`
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

export const fontSelectRenderLabel = (option: SelectStringItem) => {
  return [
    h(
      'div',
      {
        title: option.label,
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        },
      },
      [
        h(
          'span',
          {
            style: {
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            },
          },
          option.label,
        ),
        h(
          'span',
          {
            style: {
              fontFamily: option.label,
            },
          },
          'abc-ABC-123',
        ),
      ],
    ),
  ]
}

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
