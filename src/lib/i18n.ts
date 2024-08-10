import { createI18n } from 'vue-i18n'
import { localConfig } from '@/logic/store'
import enUS from '../locales/en-US.json'
import zhCN from '../locales/zh-CN.json'

// const modules = import.meta.glob('../locales/*')

// interface LangMessages {
//   [propsName: string]: {
//     [key: string]: string
//   }
// }

// const getAllLangMessages = async (): Promise<LangMessages> => {
//   const target: LangMessages = {}
//   for await (const path of Object.keys(modules)) {
//     const module = await (modules[path] as () => Promise<{ default: { [key: string]: string } }>)()
//     if (!module.default) {
//       return {}
//     }

//     const tempList = path.split('/')
//     const lastPath = tempList[tempList.length - 1]
//     const pathName = lastPath.slice(0, -5) // filter .json

//     if (target[pathName]) {
//       target[pathName] = {
//         ...target[pathName],
//         ...module.default,
//       }
//     } else {
//       target[pathName] = module.default
//     }
//   }
//   return target
// }

// const messages = await getAllLangMessages()

const i18n = createI18n({
  legacy: false,
  locale: localConfig.general.lang,
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: {
    'en-US': enUS,
    'zh-CN': zhCN,
  },
})

window.$t = i18n.global.t

export default i18n
