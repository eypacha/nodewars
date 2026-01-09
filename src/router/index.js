import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
]

const router = createRouter({
  history: createWebHistory('/nodewars/'),
  routes
})

export default router
