import { defineAsyncComponent } from 'vue'

export default {
  code: 'aboutSponsor',
  component: defineAsyncComponent({
    loader: async () => {
      const label = 'setting-pane-load-aboutSponsor'
      console.time(label)
      const m = await import('./index.vue')
      console.timeEnd(label)
      return m
    },
    delay: 0,
    suspensible: false,
  }),
  iconName: 'ci:coffee-togo',
  iconSize: 19,
  labelKey: 'setting.aboutSponsor',
}
