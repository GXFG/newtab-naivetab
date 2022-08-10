import '../styles/index.css'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from '@/lib/i18n'
import lazyImage from '@/directive/lazyImage'
import 'dayjs/locale/zh-cn.js'

const app = createApp(App)

app.use(i18n)
app.use(lazyImage)
app.mount('#app')
