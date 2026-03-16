import { createRouter, createWebHistory } from 'vue-router'
import CommunityView from '../views/CommunityView.vue'
import SkillsView from '../views/SkillsView.vue'
import SkillDetail from '../views/SkillDetail.vue'
import ReviewView from '../views/ReviewView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/community'
    },
    {
      path: '/community',
      name: 'community',
      component: CommunityView
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