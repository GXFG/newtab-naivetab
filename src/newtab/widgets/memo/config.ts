export const WIDGET_CODE = 'memo'

export const WIDGET_CONFIG = {
  enabled: false,
  countEnabled: true,
  content: '',
  layout: {
    xOffsetKey: 'right',
    xOffsetValue: 20,
    xTranslateValue: 0,
    yOffsetKey: 'top',
    yOffsetValue: 20,
    yTranslateValue: 0,
  },
  width: 200,
  height: 200,
  borderRadius: 4,
  fontFamily: 'Arial',
  fontSize: 14,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(101, 101, 101, 0.28)', 'rgba(71,85,105, 1)'],
  backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(24, 24, 24, 0.3)'],
  backgroundBlur: 10,
  isShadowEnabled: true,
  shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
