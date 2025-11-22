import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'aboutIndex',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-aboutIndex'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['aboutIndex'].iconName,
  iconSize: SETTING_ICON_META['aboutIndex'].settingSize,
  labelKey: 'setting.aboutIndex',
}
