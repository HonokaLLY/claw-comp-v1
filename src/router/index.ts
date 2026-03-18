import { createRouter, createWebHashHistory } from 'vue-router'
import CommunityView from '../views/CommunityView.vue'
import SkillsView from '../views/SkillsView.vue'
import SkillDetail from '../views/SkillDetail.vue'
import ReviewView from '../views/ReviewView.vue'
import PapersView from '../views/PapersView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: import.meta.env.BASE_URL + 'community'
    },
    {
      path: '/community',
      name: 'community',
      component: CommunityView
    },
    {
      path: '/papers',
      name: 'papers',
      component: PapersView
    },
    {
      path: '/skills',
      name: 'skills',
      component: SkillsView
    },
    {
      path: '/skills/:id',
      name: 'skill-detail',
      component: SkillDetail
    },
    {
      path: '/review',
      name: 'review',
      component: ReviewView
    }
  ]
})

export default router
