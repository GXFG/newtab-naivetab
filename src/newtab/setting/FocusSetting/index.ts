import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'focusMode',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-focusMode'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['focusMode'].iconName,
  iconSize: SETTING_ICON_META['focusMode'].settingSize,
  labelKey: 'setting.focusMode',
}
