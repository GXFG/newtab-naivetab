import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'general',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-general'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['general'].iconName,
  iconSize: SETTING_ICON_META['general'].settingSize,
  labelKey: 'setting.general',
}
