export const WIDGET_CODE = 'clockAnalog'

export const SCALABLE_FIELDS = {
  width: { min: 100, max: 500 },
}

export const WIDGET_CONFIG = {
  enabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 25,
    yTranslateValue: 0,
  },
  width: 150,
  showNumberScale: false,
  numberScaleRadius: 77,
  numberScaleFontFamily: 'Arial',
  numberScaleFontSize: 12,
  numberScaleFontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
