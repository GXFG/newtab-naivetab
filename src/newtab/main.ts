import { createApp } from 'vue'
import '../styles'
import App from './App.vue'
import i18n from '@/locales'

const app = createApp(App)

app.use(i18n)
app.mount('#app')
