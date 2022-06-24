import { createI18n } from 'vue-i18n'
import { localConfig } from '@/logic/store'

const modules = import.meta.globEager('../locales/*')

function getLangAll(): any {
  const target: any = {}
  for (const path of Object.keys(modules)) {
    if (!modules[path].default) {
      return
    }

    const tempList = path.split('/')
    const lastPath = tempList[tempList.length - 1]
    const pathName = lastPath.slice(0, -5)

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
  locale: localConfig.general.lang,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: getLangAll(),
})

window.$t = i18n.global.t

export default i18n
