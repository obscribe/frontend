import { createRouter, createWebHistory } from 'vue-router'
import { config } from '@/config'

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
    beforeEnter: (to, from, next) => {
      if (config.selfHosted) {
        next('/login')
      } else {
        next()
      }
    },
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
    path: '/vault-setup',
    name: 'VaultSetup',
    component: () => import('@/views/VaultSetupView.vue'),
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
    path: '/upgrade',
    name: 'Upgrade',
    component: () => import('@/views/UpgradeView.vue'),
    meta: { layout: 'app', requiresAuth: true },
    beforeEnter: (to, from, next) => {
      if (config.selfHosted) {
        next('/')
      } else {
        next()
      }
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/settings/billing',
    name: 'SettingsBilling',
    component: () => import('@/views/SettingsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
    beforeEnter: (to, from, next) => {
      if (config.selfHosted) {
        next('/settings')
      } else {
        // Redirect to settings with billing tab active
        next({ path: '/settings', query: { ...to.query, tab: 'billing' } })
      }
    },
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { layout: 'app', requiresAuth: true, requiresAdmin: true },
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

  // Admin-required pages
  if (to.meta.requiresAdmin && (!user || !user.is_admin)) {
    next('/')
    return
  }

  // For authenticated users on app pages, enforce verification, vault setup & onboarding
  if (isAuthenticated && user && to.meta.layout === 'app') {
    // Check email verification (skip in self-hosted mode if email is off)
    if (!config.selfHosted && !user.email_verified_at) {
      next('/verify-email')
      return
    }

    // Check vault initialization — if no vault set up, redirect to vault setup
    // has_vault is set by the auth store during login/registration
    // Also check encrypted_vault_key from server response as fallback
    const hasVault = user.has_vault || user.encrypted_vault_key
    if (!hasVault && to.name !== 'VaultSetup') {
      next('/vault-setup')
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
