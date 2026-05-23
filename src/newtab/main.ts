import '../styles/index'

/**
 * 静默过滤 "ResizeObserver loop completed with undelivered notifications" 错误。
 * 当 ResizeObserver 回调中再次触发布局变化时，浏览器会检测到循环并抛出异常。
 * 这是 Naive UI 等复杂 UI 框架中常见的无害警告，过滤掉以避免污染控制台。
 */
if (typeof ResizeObserver !== 'undefined') {
  const OriginalResizeObserver = window.ResizeObserver
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        try {
          callback(entries, observer)
        } catch (err) {
          if (
            !(
              err instanceof Error &&
              err.message.includes('ResizeObserver loop')
            )
          ) {
            throw err
          }
        }
      })
    }
  }
}

import { createApp } from 'vue'
import { App as VueApp, DirectiveBinding } from 'vue'
import i18n from '@/common/i18n'
import App from './App.vue'
import 'dayjs/locale/zh-cn.js'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

app.use(i18n)
app.use({
  install(app: VueApp) {
    app.directive('lazy', {
      mounted(el: HTMLImageElement, bindings: DirectiveBinding) {
        const observer = new IntersectionObserver(
          ([{ isIntersecting }]) => {
            if (isIntersecting) {
              observer.unobserve(el)
              el.src = bindings.value
              el.onerror = () => {
                el.src = ''
              }
            }
          },
          { threshold: 0 },
        )
        observer.observe(el)
      },
    })
  },
})
app.mount('#app')
