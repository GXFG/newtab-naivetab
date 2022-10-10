/**
 * styleKey: ['lightColor', 'darkColor']
 * 其中darkColor未定义时默认取lightColor的值
 */
export const styleConst = ref({
  // setting
  bgBottomBar: ['#eceff1', '#424247'],
  // moveable
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineElement: ['#69c0ff', ''],
  bgMoveableComponentMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableComponentActive: ['rgba(100,181,246, 0.7)', ''],
  bgMoveableComponentDelete: ['rgba(250,82,82, 1)', ''],
  moveableToolDeleteBtnColor: ['#ffa39e', ''],
  borderMoveableToolItem: ['#95a5a6', ''],
  bgMoveableToolDrawer: ['rgba(0, 0, 0, 0.6)', ''],
  // calendar
  textColorRed: ['#fa5252', ''],
  bgCalendarRest: ['rgba(255, 110, 110, 0.4)', ''],
  bgCalendarWork: ['rgba(122, 122, 122, 0.5)', ''],
  bgCalendarLabelWork: ['rgba(122, 122, 122, 0.6)', ''],
  // popup
  popupKeyboardBorder: ['rgb(224, 224, 230)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardHoverBg: ['rgba(209, 213, 219, 1)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardActiveBg: ['rgba(209, 213, 219, 0.8)', 'rgba(73, 73, 77, 0.8)'],
})

export const swatcheColors = [
  'rgba(255, 255, 255, 1)',
  'rgba(53, 54, 58, 1)',
  'rgba(101, 101, 101, 0.28)',
  'rgba(209, 213, 219, 1)',
  'rgba(44, 62, 80, 1)',
  'rgba(52, 52, 57, 1)',
  'rgba(73, 73, 77, 1)',
  'rgba(15, 23, 42, 1)',
  'rgba(16, 152, 173, 1)',
]
