import '../styles/index'
import { createApp } from 'vue'
import i18n from '@/common/i18n'
import App from './App.vue'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

app.use(i18n)
app.mount('#app')
