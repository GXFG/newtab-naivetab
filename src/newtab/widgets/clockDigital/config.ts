export const WIDGET_CODE = 'clockDigital'

export const WIDGET_CONFIG = {
  enabled: true,
  format: 'HH:mm:ss',
  unitEnabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  width: 60,
  fontFamily: 'LESLIEB',
  fontSize: 100,
  fontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
  isShadowEnabled: true,
  shadowColor: ['rgba(33, 33, 33, 1)', 'rgba(33, 33, 33, 1)'],
  unit: {
    fontSize: 35,
  },
}

export type TWidgetConfig = typeof WIDGET_CONFIG
