import TokenPage from './pages/TokenPage.vue'
import SetupPage from './pages/SetupPage.vue'
import BoardPage from './pages/BoardPage.vue'

export default [
  {
    path: '/',
    async(routeTo, routeFrom, resolve) {
      if (localStorage.getItem('rb_token')) {
        resolve({ redirect: '/board/' })
      } else {
        resolve({ component: TokenPage })
      }
    },
  },
  { path: '/token/', component: TokenPage },
  { path: '/board/', component: BoardPage },
  { path: '/setup/', component: SetupPage },
]
