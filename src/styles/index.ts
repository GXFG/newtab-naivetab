import 'virtual:windi.css'
import './reset.css'
import './main.css'

/**
 * key: ['lightColor', 'darkColor']
 * 默认 darkColor = lightColor
 */
export const styleConst = ref({
  // common
  borderColorMain: ['#18A058', ''],
  // setting
  bgBottomBar: ['#eceff1', '#424247'],
  // moveable
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineElement: ['#69c0ff', ''],
  deleteBtnColor: ['#ffa39e', ''],
  bgMoveableElementMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableElementActive: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableElementDelete: ['rgba(250,82,82, 0.7)', ''],
  // calendar
  textColorRed: ['#fa5252', ''],
  bgCalendarRest: ['rgba(255, 110, 110, 0.4)', ''],
  bgCalendarWork: ['rgba(122, 122, 122, 0.5)', ''],
  bgCalendarLabelWork: ['rgba(122, 122, 122, 0.6)', ''],
})
