export const WIDGET_CODE = 'yearProgress'

export const SCALABLE_FIELDS = {
  width: { min: 200, max: 700 },
  height: { min: 60, max: 300 },
  padding: { min: 2, max: 30 },
  borderRadius: { min: 0, max: 20 },
  fontSize: { min: 8, max: 40 },
  blockSize: { min: 1, max: 12 },
  blockMargin: { min: 0, max: 5 },
  blockRadius: { min: 0, max: 5 },
}

export const WIDGET_CONFIG = {
  enabled: false,
  layout: {
    xOffsetKey: 'right',
    xOffsetValue: 0,
    xTranslateValue: 0,
    yOffsetKey: 'top',
    yOffsetValue: 0,
    yTranslateValue: 0,
  },
  padding: 10,
  width: 345,
  height: 110,
  borderRadius: 5.5,
  fontFamily: 'system',
  fontSize: 16,
  fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
  backgroundColor: ['rgba(255, 255, 255, 0.85)', 'rgba(52, 52, 57, 1)'],
  backgroundBlur: 5,
  isShadowEnabled: true,
  shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
  isRealtime: false,
  textLineHeight: 1.5,
  textActiveColor: ['rgba(58, 115, 195, 1)', 'rgba(58, 115, 195, 1)'],
  isPercentageEnabled: true,
  percentageDecimal: 3,
  isDateEnabled: true,
  format: 'YYYY.MM.DD',
  blockMargin: 1.2,
  blockSize: 4.5,
  blockRadius: 1,
  blockDefaultColor: ['rgba(200, 200, 200, 1)', 'rgba(200, 200, 200, 1)'],
  blockActiveColor: ['rgba(58, 115, 195, 1)', 'rgba(58, 115, 195, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
