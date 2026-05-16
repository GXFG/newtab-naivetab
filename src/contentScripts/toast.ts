/**
 * Content Script 端 Toast 入口。
 *
 * CS 环境没有 vue-i18n，提供独立的 t() 函数供消费者调用。
 * 渲染逻辑复用 src/common/toast.ts 的 Shadow DOM 实现。
 */

export { showToast } from '@/common/toast'

/** CS 端轻量多语言 */
const MESSAGES = {
  'keyboardCommand.toast.copyPageUrl': {
    'zh-CN': '已复制-页面URL',
    'en-US': 'Page URL copied',
  },
  'keyboardCommand.toast.copyPageTitle': {
    'zh-CN': '已复制-页面标题',
    'en-US': 'Page title copied',
  },
  'keyboardCommand.toast.switchToLayer': {
    'zh-CN': '已切换至 __n__',
    'en-US': 'Switched to __n__',
  },
}

export function t(key: string): string {
  const entry = (MESSAGES as Record<string, Record<string, string>>)[key]
  if (!entry) return key
  const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
  return entry[lang] ?? entry['en-US'] ?? key
}
