export const WIDGET_CODE = 'news'

export const WIDGET_CONFIG = {
  enabled: false,
  sourceList: ['toutiao', 'baidu'] as NewsSources[],
  refreshIntervalTime: 90,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 0,
    xTranslateValue: 0,
    yOffsetKey: 'bottom',
    yOffsetValue: 0,
    yTranslateValue: 0,
  },
  margin: 6,
  width: 370,
  height: 340,
  borderRadius: 4,
  fontFamily: 'Arial',
  fontSize: 14,
  fontColor: ['rgba(15, 23, 42, 1)', 'rgba(255, 255, 255, 1)'],
  backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(52, 52, 57, 1)'],
  isBorderEnabled: true,
  borderWidth: 1,
  borderColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
  isShadowEnabled: true,
  shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
  tabActiveBackgroundColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
  urlActiveColor: ['rgba(36, 64, 179, 1)', 'rgba(155, 177, 254, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
