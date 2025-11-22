import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'clockDate',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-clockDate'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['clockDate'].iconName,
  iconSize: SETTING_ICON_META['clockDate'].settingSize,
  labelKeys: ['setting.clock', 'setting.date'],
}
