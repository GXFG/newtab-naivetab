import { createI18n } from 'vue-i18n'
import { localConfig } from '@/logic/store'

const modules = import.meta.glob('../locales/*')

const getAllLangMessages = async (): Promise<{ [propsName: string]: string }> => {
  const target = {}
  for await (const path of Object.keys(modules)) {
    const module: any = await modules[path]()
    if (!module.default) {
      return {}
    }

    const tempList = path.split('/')
    const lastPath = tempList[tempList.length - 1]
    const pathName = lastPath.slice(0, -5) // filter .json

    if (target[pathName]) {
      target[pathName] = {
        ...target[pathName],
        ...module.default,
      }
    } else {
      target[pathName] = module.default
    }
  }
  return target
}

const messages = await getAllLangMessages() as any

const i18n = createI18n({
  legacy: false,
  locale: localConfig.general.lang,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages,
})

window.$t = i18n.global.t as any

export default i18n
