import '../styles/index'
import { createApp } from 'vue'
import i18n from '@/lib/i18n'
import lazyImage from '@/directive/lazyImage'
import App from './App.vue'
import 'dayjs/locale/zh-cn.js'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

app.use(i18n)
app.use(lazyImage)
app.mount('#app')
