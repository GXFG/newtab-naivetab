export const WIDGET_CODE = 'clockDigital'

export const SCALABLE_FIELDS = {
  fontSize: { min: 50, max: 500 },
  width: { min: 10, max: 200 },
  'unit.fontSize': { min: 8, max: 120 },
}

export const WIDGET_CONFIG = {
  enabled: false,
  format: 'HH:mm:ss',
  unitEnabled: false,
  colonBlinkEnabled: true,
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
