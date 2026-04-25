import TokenPage from './pages/TokenPage.vue'
import SetupPage from './pages/SetupPage.vue'
import BoardPage from './pages/BoardPage.vue'
import ReviewsPage from './pages/ReviewsPage.vue'
import HotCRPPage from './pages/HotCRPPage.vue'
import ProjectDetailPage from './pages/ProjectDetailPage.vue'

export default [
  { path: '/', component: TokenPage },
  { path: '/token/', component: TokenPage },
  { path: '/board/', component: BoardPage },
  { path: '/setup/', component: SetupPage },
  { path: '/reviews/', component: ReviewsPage },
  { path: '/hotcrp/', component: HotCRPPage },
  { path: '/project/:id/', component: ProjectDetailPage },
]
