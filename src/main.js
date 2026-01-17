import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import PrimeVue from 'primevue/config';
import { useGameClockStore } from './stores/gameClockStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)
app.use(PrimeVue)

const gameClockStore = useGameClockStore(pinia)
gameClockStore.start()

app.mount('#app')
