<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true

  try {
    const result = await authStore.login(email.value, password.value)
    if (result.mfaRequired) {
      errorMessage.value = 'MFA verification required. MFA page coming soon.'
      return
    }
    window.__obscribeToast?.('success', 'Welcome back!')
    router.push('/')
  } catch (err) {
    const data = err.response?.data
    if (err.response?.status === 401) {
      errorMessage.value = 'Invalid email or password.'
    } else if (err.response?.status === 422) {
      const errors = data?.errors
      errorMessage.value = errors
        ? Object.values(errors).flat().join(' ')
        : 'Please check your input.'
    } else if (err.response?.status === 429) {
      errorMessage.value = 'Too many attempts. Please wait a moment.'
    } else {
      errorMessage.value = data?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-form">
    <div class="auth-form__branding">
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" class="auth-form__logo">
        <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15" />
        <text x="20" y="28" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="var(--accent)" text-anchor="middle">O</text>
      </svg>
      <h2 class="auth-form__title">Welcome back</h2>
      <p class="auth-form__subtitle">Sign in to access your end-to-end encrypted notebooks</p>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="auth-form__error-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <form @submit.prevent="handleSubmit" class="auth-form__fields">
      <div class="auth-form__field">
        <label for="email">Email</label>
        <div class="auth-form__input-wrap">
          <svg class="auth-form__input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </div>
      </div>

      <div class="auth-form__field">
        <div class="auth-form__label-row">
          <label for="password">Password</label>
          <a href="#" class="auth-form__forgot">Forgot password?</a>
        </div>
        <div class="auth-form__input-wrap">
          <svg class="auth-form__input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>
      </div>

      <button type="submit" class="auth-form__submit" :disabled="loading">
        <span v-if="loading" class="auth-form__spinner" />
        {{ loading ? '' : 'Sign in' }}
      </button>
    </form>

    <p class="auth-form__footer">
      Don't have an account?
      <router-link to="/register" class="auth-form__link">Create one</router-link>
    </p>
  </div>
</template>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 400px;
}

.auth-form__branding {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-form__logo {
  margin-bottom: 1rem;
}

.auth-form__title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.auth-form__subtitle {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.95rem;
}

.auth-form__tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
}

.auth-form__tab {
  flex: 1;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: var(--font-ui);
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: calc(var(--radius-md) - 2px);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.auth-form__tab.active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.auth-form__error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(229, 69, 69, 0.1);
  border: 1px solid rgba(229, 69, 69, 0.2);
  border-radius: var(--radius-sm);
  color: #f87171;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.auth-form__success {
  text-align: center;
  padding: 2rem 1rem;
}

.auth-form__success-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.auth-form__success h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.auth-form__success p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.auth-form__text-btn {
  background: none;
  border: none;
  color: var(--accent-text);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  text-decoration: underline;
}

.auth-form__fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.auth-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth-form__field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.auth-form__label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auth-form__forgot {
  font-size: 0.775rem;
  color: var(--accent-text);
  text-decoration: none;
  text-transform: none;
  letter-spacing: 0;
}

.auth-form__forgot:hover {
  text-decoration: underline;
}

.auth-form__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-form__input-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--text-muted);
  pointer-events: none;
}

.auth-form__input-wrap input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.auth-form__input-wrap input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.auth-form__input-wrap input::placeholder {
  color: var(--text-muted);
}

.auth-form__submit {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
}

.auth-form__submit:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.auth-form__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-form__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-form__magic-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.775rem;
  color: var(--text-tertiary);
  text-align: center;
}

.auth-form__footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.auth-form__link {
  color: var(--accent-text);
  text-decoration: none;
  font-weight: 500;
}

.auth-form__link:hover {
  text-decoration: underline;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .auth-form {
    max-width: 100%;
    padding: 0 0.5rem;
  }

  .auth-form__title {
    font-size: 1.5rem;
  }

  .auth-form__tab {
    min-height: 44px;
  }

  .auth-form__submit {
    min-height: 48px;
  }
}
</style>
