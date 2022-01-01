import 'virtual:windi.css'
import './reset.css'
import './main.css'

const styleConst = ref({
  // common
  borderMain: ['#40a9ff', ''],
  // setting
  bgBottomBar: ['#eceff1', '#424247'],
  // moveable
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

// mode: light0, dark1
export const getStyleConst = (field: string, mode: number): string => {
  return styleConst.value[field][mode] || styleConst.value[field][0]
}
