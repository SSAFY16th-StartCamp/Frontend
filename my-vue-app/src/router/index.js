import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Community from '../views/Community.vue'
import MapView from '../views/Map.vue'
import Location from '../views/Location.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/community', name: 'Community', component: Community },
  { path: '/map', name: 'Map', component: MapView },
  { path: '/location', name: 'Location', component: Location }
]

export default createRouter({
  history: createWebHistory(),
  routes
})