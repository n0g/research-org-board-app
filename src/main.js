import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Framework7 from 'framework7/lite-bundle'
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle'
import 'framework7/css/bundle'
import './assets/app.css'
import App from './App.vue'

// Apply explicit theme override before Vue renders (handles 'dark'/'light' localStorage pref)
const savedTheme = localStorage.getItem('rb_theme') || 'auto'
const prefersDark = savedTheme === 'dark' || (savedTheme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light'

Framework7.use(Framework7Vue)

const app = createApp(App)
registerComponents(app)
app.use(createPinia())
app.mount('#app')
