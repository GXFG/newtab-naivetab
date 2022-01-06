import 'virtual:windi.css'
import './reset.css'
import './main.css'

/**
 * key: ['lightColor', 'darkColor']
 */
export const styleConst = ref({
  // common
  borderColorMain: ['#18A058', ''],
  // setting
  bgBottomBar: ['#eceff1', '#424247'],
  // moveable
  deleteColorMain: ['#fa5252', ''],
  deleteColorActive: ['#ffa39e', ''],
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineElement: ['#69c0ff', ''],
  bgMoveableElementMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableElementActive: ['rgba(100,181,246, 0.5)', ''],
  // calendar
  textColorRed: ['#fa5252', ''],
  bgCalendarRest: ['rgba(255, 110, 110, 0.4)', ''],
  bgCalendarWork: ['rgba(122, 122, 122, 0.5)', ''],
  bgCalendarLabelWork: ['rgba(122, 122, 122, 0.6)', ''],
})
