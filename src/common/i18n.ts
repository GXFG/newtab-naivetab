import { createI18n } from 'vue-i18n'
import { isMacOS } from '@/env'
import enUS from '../locales/en-US.json'
import zhCN from '../locales/zh-CN.json'

export type SupportedLocale = 'en-US' | 'zh-CN'

const resolveLocale = (): SupportedLocale => {
  const lang = chrome.i18n.getUILanguage()
  return lang === 'zh-CN' || lang === 'en-US' ? lang : 'en-US'
}

const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: 'en-US',
  globalInjection: true,
  messages: {
    'en-US': enUS,
    'zh-CN': zhCN,
  },
})

window.$t = i18n.global.t

/**
 * 全局修饰键说明提示（替换 __alt__ 占位符）
 */
export const getGlobalModifierTip = (): string => {
  const altLabel = isMacOS ? 'Opt' : 'Alt'
  return window
    .$t('keyboardBookmark.globalModifierTips')
    .replace('__alt__', altLabel)
}

/**
 * 同步 vue-i18n locale 到用户配置的语言。
 * 由 store.ts 在 localConfig.general.lang 变化时自动调用。
 */
export const setLocale = (lang: SupportedLocale | string) => {
  if (lang !== 'en-US' && lang !== 'zh-CN') return
  if (i18n.global.locale.value !== lang) {
    i18n.global.locale.value = lang
  }
}

export default i18n
