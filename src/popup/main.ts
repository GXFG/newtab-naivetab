// 刻意只引这三层，不引 styles/index.css：
// global.css 里的 body 是 100vw/100vh/overflow:hidden 的全屏规则，会把弹窗撑满；
// animations / font / driver / qweather-icons 弹窗都用不到，引进来只是增加体积。
// 代价是 body 的文字色要在 popup/App.vue 里自己补（见该文件注释）。
import '../styles/reset.css'
import '../styles/tokens.css'
import '../styles/reka/index.css'
import { createApp } from 'vue'
import i18n from '@/common/i18n'
// 副作用引入：popup 也要按用户配置的语言/外观渲染
import '@/logic/store/theme'
import App from './App.vue'
import '@/common/iconify'
import pkg from '../../package.json'

window.appVersion = pkg.version

const app = createApp(App)

// app.config.performance = true

app.use(i18n)
app.mount('#app')
