export const WIDGET_CODE = 'clockAnalog'

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
}

export type TWidgetConfig = typeof WIDGET_CONFIG
