import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/home/index.vue'

const router = createRouter({
  history: createWebHistory('/newtab-naivetab/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
})

export default router
