import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/magic-link/verify',
    name: 'MagicLinkVerify',
    component: () => import('@/views/MagicLinkVerifyView.vue'),
    meta: { layout: 'minimal' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/views/VerifyEmailView.vue'),
    meta: { layout: 'minimal', requiresAuth: false },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { layout: 'minimal', requiresAuth: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/notebook/:id',
    name: 'Notebook',
    component: () => import('@/views/NotebookView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/notebook/:notebookId/page/:pageId',
    name: 'PageEditor',
    component: () => import('@/views/PageEditorView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/trash',
    name: 'Trash',
    component: () => import('@/views/TrashView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('obscribe_token')
  const isAuthenticated = !!token

  // Parse stored user for verification/onboarding checks
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('obscribe_user') || 'null')
  } catch {
    user = null
  }

  // Guest-only pages
  if (to.meta.guest && isAuthenticated) {
    next('/')
    return
  }

  // Auth-required pages
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // For authenticated users on app pages, enforce verification & onboarding
  if (isAuthenticated && user && to.meta.layout === 'app') {
    if (!user.email_verified_at) {
      next('/verify-email')
      return
    }
    if (!user.onboarded_at) {
      next('/onboarding')
      return
    }
  }

  next()
})

export default router
