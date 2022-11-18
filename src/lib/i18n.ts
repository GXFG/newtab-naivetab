import { createI18n } from 'vue-i18n'
import { localConfig } from '@/logic/store'

const modules = import.meta.globEager('../locales/*')

function getLangAll(): { [propsName: string]: string } {
  const target = {}
  for (const path of Object.keys(modules)) {
    if (!modules[path].default) {
      return {}
    }

    const tempList = path.split('/')
    const lastPath = tempList[tempList.length - 1]
    const pathName = lastPath.slice(0, -5) // filter .json

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
  locale: localConfig.general.lang,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: getLangAll() as any,
})

window.$t = i18n.global.t

export default i18n
