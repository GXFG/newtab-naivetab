import '../styles/index'
import { createApp } from 'vue'
import i18n from '@/common/i18n'
import { vLazy } from '@/directives/lazy'
import App from './App.vue'
import 'dayjs/locale/zh-cn.js'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

app.use(i18n)
app.use(vLazy)
app.mount('#app')
