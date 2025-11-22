export const WIDGET_CODE = 'date'

export const WIDGET_CONFIG = {
  enabled: true,
  format: 'YYYY-MM-DD dddd',
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 57,
    yTranslateValue: 0,
  },
  fontFamily: 'LESLIEB',
  fontSize: 30,
  letterSpacing: 1,
  fontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
  isShadowEnabled: true,
  shadowColor: ['rgba(33, 33, 33, 1)', 'rgba(33, 33, 33, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
