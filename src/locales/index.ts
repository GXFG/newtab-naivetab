import { createI18n } from 'vue-i18n'
import { globalState } from '@/logic/store'

const modules = import.meta.globEager('./*')

function getLangAll(): any {
  const target: any = {}
  for (const path of Object.keys(modules)) {
    if (!modules[path].default) {
      return
    }
    const pathName = path.slice(2, -3) // ./pathName.ts
    if (target[pathName]) {
      target[pathName] = {
        ...target[pathName],
        ...modules[path].default,
      }
    } else {
      target[pathName] = modules[path].default
    }
  }
  return target
}

const i18n: any = createI18n({
  legacy: false,
  locale: globalState.setting.general.lang,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: getLangAll(),
})

window.$t = i18n.global.t

export default i18n
