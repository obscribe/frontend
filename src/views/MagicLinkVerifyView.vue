<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const status = ref('verifying') // verifying, success, error
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Invalid magic link — no token found.'
    return
  }

  try {
    const data = await authService.magicLinkVerify(token)

    if (data.mfa_required) {
      status.value = 'error'
      errorMessage.value = 'MFA verification required. MFA page coming soon.'
      return
    }

    authStore.setAuth(data.user, data.token)
    status.value = 'success'

    setTimeout(() => {
      if (!data.user.email_verified_at) {
        router.push('/verify-email')
      } else if (!data.user.onboarded_at) {
        router.push('/onboarding')
      } else {
        router.push('/')
      }
    }, 1500)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err.response?.data?.message || 'Invalid or expired magic link.'
  }
})
</script>

<template>
  <div class="magic-verify">
    <div class="magic-verify__card">
      <div v-if="status === 'verifying'" class="magic-verify__state">
        <div class="magic-verify__spinner"></div>
        <h2>Signing you in...</h2>
        <p>Verifying your magic link</p>
      </div>

      <div v-else-if="status === 'success'" class="magic-verify__state">
        <div class="magic-verify__check">✓</div>
        <h2>You're in!</h2>
        <p>Redirecting...</p>
      </div>

      <div v-else class="magic-verify__state">
        <div class="magic-verify__error-icon">✕</div>
        <h2>Something went wrong</h2>
        <p>{{ errorMessage }}</p>
        <router-link to="/login" class="magic-verify__link">Back to login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.magic-verify {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bg-primary);
}

.magic-verify__card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 3rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.magic-verify__state h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem;
}

.magic-verify__state p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.magic-verify__spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.magic-verify__check {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.magic-verify__error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e54545;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.magic-verify__link {
  display: inline-block;
  margin-top: 1.5rem;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.magic-verify__link:hover {
  text-decoration: underline;
}
</style>
