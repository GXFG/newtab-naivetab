import '../styles/reset.css'
import { createApp } from 'vue'
import i18n from '@/lib/i18n'
import App from './App.vue'

const app = createApp(App)

app.use(i18n)
app.mount('#app')
