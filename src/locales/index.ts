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

const i18n = createI18n({
  legacy: false,
  locale: globalState.setting.common.localLanguage,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: getLangAll(),
})

export default i18n
