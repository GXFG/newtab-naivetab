import '../styles/index'
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
