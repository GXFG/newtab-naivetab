import { WIDGET_ICON_META } from '@/logic/icons'
import { WIDGET_CODE, WIDGET_CONFIG } from './config'
import Index from './index.vue'

export default {
  code: WIDGET_CODE,
  component: Index,
  config: WIDGET_CONFIG,
  iconName: WIDGET_ICON_META[WIDGET_CODE].iconName,
  iconSize: WIDGET_ICON_META[WIDGET_CODE].widgetSize,
  widgetLabel: 'setting.bookmarkFolder',
}
