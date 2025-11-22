import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'weather',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-weather'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['weather'].iconName,
  iconSize: SETTING_ICON_META['weather'].settingSize,
  labelKey: 'setting.weather',
}
