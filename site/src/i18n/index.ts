import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

const STORAGE_KEY = 'naivetab-site-locale'

/** 读取持久化的语言选择，无记录时回退到浏览器语言 */
function getInitialLocale(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-CN' || stored === 'en-US') return stored
  } catch {
    // localStorage 不可用时静默降级
  }
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
}

/** 持久化语言选择 */
export function persistLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // localStorage 不可用时静默降级
  }
}

export default createI18n({
  locale: getInitialLocale(),
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  fallbackLocale: 'en-US',
  legacy: false,
  globalInjection: true,
  warnHtmlMessage: false,
})
