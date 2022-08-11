import '../styles/reset.css'
import { createApp } from 'vue'
import App from './Popup.vue'
import i18n from '@/lib/i18n'

const app = createApp(App)

app.use(i18n)
app.mount('#app')
