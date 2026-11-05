import '../styles/index'
import { createApp } from 'vue'
import i18n from '@/common/i18n'
// 副作用引入：语言/外观同步必须在 options 页启动时执行
import '@/logic/store/theme'
import { vLazy } from '@/directives/lazy'
import App from './App.vue'
import '@/common/iconify'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

app.use(i18n)
app.use(vLazy)
app.mount('#app')
