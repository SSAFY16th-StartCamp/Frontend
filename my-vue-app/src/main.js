import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import messages from './i18n'

import './assets/main.css'
import 'leaflet/dist/leaflet.css'

const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages })

createApp(App).use(router).use(createPinia()).use(i18n).mount('#app')