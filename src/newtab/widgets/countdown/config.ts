export const WIDGET_CODE = 'countdown'

export const SCALABLE_FIELDS = {
  size: { min: 80, max: 400 },
  clockFontSize: { min: 12, max: 100 },
  strokeWidth: { min: 1, max: 20 },
}

export const WIDGET_CONFIG = {
  enabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  size: 160,
  // 时钟字体
  clockFontFamily: 'LESLIEB',
  clockFontSize: 40,
  clockFontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
  // 标签
  label: '',
  labelFontFamily: 'Arial',
  labelFontSize: 12,
  labelFontColor: ['rgba(228, 228, 231, 0.6)', 'rgba(228, 228, 231, 0.6)'],
  // 进度环
  progressColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 0.9)'],
  trackColor: ['rgba(228, 228, 231, 0.12)', 'rgba(228, 228, 231, 0.12)'],
  strokeWidth: 5,
  // 背景
  backgroundColor: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.06)'],
  backgroundBlur: 5,
  // 边框
  isBorderEnabled: true,
  borderColor: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.12)'],
  borderWidth: 1,
  // 阴影
  isShadowEnabled: true,
  shadowColor: ['rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.35)'],
  // 功能
  defaultDuration: 300,
  showHours: false,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
