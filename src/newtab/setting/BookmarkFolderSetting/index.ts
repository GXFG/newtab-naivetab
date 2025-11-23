import { defineAsyncComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

export default {
  code: 'bookmarkFolder',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-bookmarkFolder'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: SETTING_ICON_META['bookmarkFolder'].iconName,
  iconSize: SETTING_ICON_META['bookmarkFolder'].settingSize,
  labelKey: 'setting.bookmarkFolder',
}
