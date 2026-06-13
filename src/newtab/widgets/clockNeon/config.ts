export const WIDGET_CODE = 'clockNeon'

export const SCALABLE_FIELDS = {
  fontSize: { min: 16, max: 200 },
  paddingVertical: { min: 4, max: 80 },
  paddingHorizontal: { min: 8, max: 120 },
  glowIntensity: { min: 2, max: 80 },
  borderRadius: { min: 2, max: 40 },
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
  // 内边距
  paddingVertical: 28,
  paddingHorizontal: 40,
  // 字体
  fontFamily: 'Orbitron',
  fontSize: 60,
  // 主色（小时）- 青色
  fontColor: ['rgba(0, 255, 240, 1)', 'rgba(0, 200, 255, 1)'],
  primaryColor: ['rgba(0, 255, 240, 0.85)', 'rgba(0, 200, 255, 0.85)'],
  // 副色（分钟）- 品红
  secondaryColor: ['rgba(255, 0, 200, 0.9)', 'rgba(220, 0, 180, 0.9)'],
  // 强调色（秒）- 黄色
  accentColor: ['rgba(255, 240, 100, 1)', 'rgba(255, 240, 100, 1)'],
  // 背景色
  backgroundColor: ['rgba(5, 5, 18, 0.88)', 'rgba(8, 8, 28, 0.92)'],
  // 发光强度
  glowIntensity: 22,
  // 边框
  isBorderEnabled: true,
  borderColor: ['rgba(0, 255, 240, 0.5)', 'rgba(255, 0, 200, 0.5)'],
  borderWidth: 1,
  borderRadius: 8,
  // 内框装饰
  showFrame: true,
  frameColor: ['rgba(0, 255, 240, 0.35)', 'rgba(255, 0, 200, 0.35)'],
  // 底部标签
  showLabel: true,
  labelLeft: 'TIME',
  labelRight: 'SYS',
  // 时间显示
  showSeconds: true,
  is24Hour: true,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
