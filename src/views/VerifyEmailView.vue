<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const status = ref('idle') // idle | verifying | verified | error
const errorMessage = ref('')
const resendLoading = ref(false)
const resendSuccess = ref(false)

const hasToken = computed(() => !!route.query.token && !!route.query.email)
const userEmail = computed(() => route.query.email || authStore.user?.email || '')

onMounted(async () => {
  // If already verified, skip
  if (authStore.user?.email_verified_at) {
    router.push('/onboarding')
    return
  }

  // If we have token + email in URL, auto-verify
  if (hasToken.value) {
    await verifyEmail()
  }
})

async function verifyEmail() {
  status.value = 'verifying'
  errorMessage.value = ''

  try {
    const data = await authService.verifyEmail(route.query.token, route.query.email)

    // Update local user data
    if (data.user) {
      authStore.user = data.user
      localStorage.setItem('obscribe_user', JSON.stringify(data.user))
    } else if (authStore.user) {
      authStore.user.email_verified_at = new Date().toISOString()
      localStorage.setItem('obscribe_user', JSON.stringify(authStore.user))
    }

    status.value = 'verified'

    // Redirect to onboarding after a moment
    setTimeout(() => {
      router.push('/onboarding')
    }, 2000)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err.response?.data?.message || 'Verification failed. The link may have expired.'
  }
}

async function resendEmail() {
  resendLoading.value = true
  resendSuccess.value = false

  try {
    await authService.resendVerification()
    resendSuccess.value = true
    window.__obscribeToast?.('success', 'Verification email sent!')
  } catch (err) {
    window.__obscribeToast?.('error', err.response?.data?.message || 'Failed to resend. Please try again.')
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="verify-email">
    <div class="verify-card">
      <!-- Logo -->
      <div class="verify-card__logo">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15" />
          <path d="M12 28V12h4l4 10 4-10h4v16h-3V17l-3.5 8h-3L15 17v11h-3z" fill="var(--accent)" />
        </svg>
      </div>

      <!-- Verifying state -->
      <template v-if="status === 'verifying'">
        <div class="verify-card__spinner-wrap">
          <div class="verify-card__spinner" />
        </div>
        <h1 class="verify-card__title">Verifying your email...</h1>
        <p class="verify-card__subtitle">This will only take a moment.</p>
      </template>

      <!-- Verified state -->
      <template v-else-if="status === 'verified'">
        <div class="verify-card__icon verify-card__icon--success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 class="verify-card__title">Email verified! ✨</h1>
        <p class="verify-card__subtitle">Redirecting you to get set up...</p>
      </template>

      <!-- Error state -->
      <template v-else-if="status === 'error'">
        <div class="verify-card__icon verify-card__icon--error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 class="verify-card__title">Verification failed</h1>
        <p class="verify-card__subtitle">{{ errorMessage }}</p>
        <button
          v-if="authStore.isAuthenticated"
          class="verify-card__btn"
          :disabled="resendLoading"
          @click="resendEmail"
        >
          <span v-if="resendLoading" class="verify-card__btn-spinner" />
          {{ resendLoading ? 'Sending...' : 'Resend verification email' }}
        </button>
      </template>

      <!-- Idle state: waiting for verification (no token in URL) -->
      <template v-else>
        <div class="verify-card__icon verify-card__icon--mail">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h1 class="verify-card__title">Check your email</h1>
        <p class="verify-card__subtitle">
          We sent a verification link to
          <strong>{{ userEmail }}</strong>.
          Click the link to verify your account.
        </p>
        <p class="verify-card__hint">Didn't receive it? Check your spam folder, or:</p>
        <button
          v-if="authStore.isAuthenticated"
          class="verify-card__btn"
          :disabled="resendLoading"
          @click="resendEmail"
        >
          <span v-if="resendLoading" class="verify-card__btn-spinner" />
          {{ resendLoading ? 'Sending...' : resendSuccess ? 'Sent! Check your inbox' : 'Resend verification email' }}
        </button>
        <router-link to="/login" class="verify-card__link">
          ← Back to sign in
        </router-link>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verify-email {
  width: 100%;
  max-width: 480px;
  padding: 2rem;
}

.verify-card {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.verify-card__logo {
  margin-bottom: 2rem;
}

.verify-card__spinner-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.verify-card__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.verify-card__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.verify-card__icon--success {
  color: var(--accent);
}

.verify-card__icon--error {
  color: var(--danger);
}

.verify-card__icon--mail {
  color: var(--accent);
}

.verify-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.verify-card__subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.verify-card__subtitle strong {
  color: var(--text-primary);
}

.verify-card__hint {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin: 0 0 1rem;
}

.verify-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
}

.verify-card__btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.verify-card__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verify-card__btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.verify-card__link {
  display: block;
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--accent-text);
  text-decoration: none;
}

.verify-card__link:hover {
  text-decoration: underline;
}
</style>
