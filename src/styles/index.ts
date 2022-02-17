import 'virtual:windi.css'
import './reset.css'
import './main.css'
import './animation.css'
import './qweather-icons.css'

/**
 * key: ['lightColor', 'darkColor']
 * 其中默认 darkColor = lightColor
 */
export const styleConst = ref({
  // common
  themeColorMain: ['#63e2b7', ''],
  // setting
  bgBottomBar: ['#eceff1', '#424247'],
  // moveable
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineElement: ['#69c0ff', ''],
  bgMoveableComponentMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableComponentActive: ['rgba(100,181,246, 0.7)', ''],
  bgMoveableComponentDelete: ['rgba(250,82,82, 0.7)', ''],
  moveableToolDeleteBtnColor: ['#ffa39e', ''],
  borderMoveableToolItem: ['#63e2b7', ''],
  bgMoveableToolDrawer: ['rgba(0, 0, 0, 0.6)', ''],
  // calendar
  textColorRed: ['#fa5252', ''],
  bgCalendarRest: ['rgba(255, 110, 110, 0.4)', ''],
  bgCalendarWork: ['rgba(122, 122, 122, 0.5)', ''],
  bgCalendarLabelWork: ['rgba(122, 122, 122, 0.6)', ''],
})

export const swatcheColors = ['rgba(255, 255, 255, 1)', 'rgba(209, 213, 219, 1)', 'rgba(71,85,105, 1)', 'rgba(44, 62, 80, 1)', 'rgba(113, 113, 113, 1)', 'rgba(53, 54, 58, 1)', 'rgba(15, 23, 42, 1)']
