import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { initTheme } from './composables/useTheme'

// 必须在 app.mount 前初始化主题，防止首屏深/浅色闪烁
initTheme()

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
