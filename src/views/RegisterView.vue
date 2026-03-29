<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const fieldErrors = ref({})
const loading = ref(false)

const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^a-zA-Z0-9]/.test(p)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: '#e54545' }
  if (score <= 2) return { score: 2, label: 'Fair', color: '#d4914e' }
  if (score <= 3) return { score: 3, label: 'Good', color: '#c9a94e' }
  if (score <= 4) return { score: 4, label: 'Strong', color: '#5b9a8b' }
  return { score: 5, label: 'Excellent', color: '#4a8a7b' }
})

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return null
  return password.value === confirmPassword.value
})

async function handleSubmit() {
  errorMessage.value = ''
  fieldErrors.value = {}

  // Client-side validation
  if (!name.value.trim()) {
    fieldErrors.value.name = ['Name is required.']
    return
  }
  if (password.value.length < 8) {
    fieldErrors.value.password = ['Password must be at least 8 characters.']
    return
  }
  if (password.value !== confirmPassword.value) {
    return
  }

  loading.value = true
  try {
    await authStore.register(name.value, email.value, password.value)
    window.__obscribeToast?.('success', 'Account created! Check your email to verify.')
    router.push('/verify-email')
  } catch (err) {
    if (err.response?.status === 422) {
      fieldErrors.value = err.response.data.errors || {}
      errorMessage.value = err.response.data.message || 'Please fix the errors below.'
    } else {
      errorMessage.value = err.response?.data?.message || 'Registration failed. Please try again.'
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
        <path d="M12 28V12h4l4 10 4-10h4v16h-3V17l-3.5 8h-3L15 17v11h-3z" fill="var(--accent)" />
      </svg>
      <h2 class="auth-form__title">Create your vault</h2>
      <p class="auth-form__subtitle">Start writing privately in under a minute</p>
    </div>

    <!-- Trust badge -->
    <div class="trust-badge">
      <div class="trust-badge__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div class="trust-badge__text">
        <strong>End-to-end encrypted with AES-256-GCM</strong>
        <span>Your encryption key never leaves your device</span>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="auth-form__error-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleSubmit" class="auth-form__fields">
      <div class="auth-form__field">
        <label for="name">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          placeholder="Your name"
          autocomplete="name"
          required
        />
        <span v-if="fieldErrors.name" class="auth-form__error">{{ fieldErrors.name[0] }}</span>
      </div>

      <div class="auth-form__field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
        <span v-if="fieldErrors.email" class="auth-form__error">{{ fieldErrors.email[0] }}</span>
      </div>

      <div class="auth-form__field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          autocomplete="new-password"
          required
        />
        <!-- Password strength indicator -->
        <div v-if="password" class="strength-meter">
          <div class="strength-meter__bar">
            <div
              class="strength-meter__fill"
              :style="{
                width: (passwordStrength.score / 5) * 100 + '%',
                background: passwordStrength.color
              }"
            />
          </div>
          <span class="strength-meter__label" :style="{ color: passwordStrength.color }">
            {{ passwordStrength.label }}
          </span>
        </div>
        <span v-if="fieldErrors.password" class="auth-form__error">{{ fieldErrors.password[0] }}</span>
        <span v-else class="auth-form__hint">Used to derive your encryption key — choose wisely</span>
      </div>

      <div class="auth-form__field">
        <label for="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          placeholder="••••••••"
          autocomplete="new-password"
          required
          :class="{ 'input--error': passwordsMatch === false, 'input--success': passwordsMatch === true }"
        />
        <span v-if="passwordsMatch === false" class="auth-form__error">Passwords don't match</span>
        <span v-if="passwordsMatch === true" class="auth-form__success-text">Passwords match ✓</span>
      </div>

      <button type="submit" class="auth-form__submit" :disabled="loading || !password || !email || passwordsMatch !== true">
        <span v-if="loading" class="auth-form__spinner" />
        {{ loading ? '' : 'Create account' }}
      </button>
    </form>

    <p class="auth-form__footer">
      Already have an account?
      <router-link to="/login" class="auth-form__link">Sign in</router-link>
    </p>

    <p class="auth-form__disclaimer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0;">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
      By creating an account, you agree to keep your credentials safe.
      Your notes are encrypted with AES-256-GCM before leaving your browser.
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
  margin-bottom: 1.5rem;
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

/* Trust badge */
.trust-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--accent-subtle);
  border: 1px solid rgba(91, 154, 139, 0.2);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
}

.trust-badge__icon {
  color: var(--accent);
  flex-shrink: 0;
  display: flex;
}

.trust-badge__text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.trust-badge__text strong {
  font-size: 0.85rem;
  color: var(--accent-text);
  font-weight: 600;
}

.trust-badge__text span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.auth-form__error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(229, 69, 69, 0.1);
  border: 1px solid rgba(229, 69, 69, 0.2);
  border-radius: var(--radius-sm);
  color: #f87171;
  font-size: 0.85rem;
  margin-bottom: 1rem;
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

.auth-form__field input {
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.auth-form__field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.auth-form__field input::placeholder {
  color: var(--text-muted);
}

.auth-form__field input.input--error {
  border-color: #e54545;
}

.auth-form__field input.input--error:focus {
  box-shadow: 0 0 0 3px rgba(229, 69, 69, 0.15);
}

.auth-form__field input.input--success {
  border-color: var(--accent);
}

.auth-form__hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.auth-form__error {
  font-size: 0.75rem;
  color: #e54545;
}

.auth-form__success-text {
  font-size: 0.75rem;
  color: var(--accent);
}

/* Password strength meter */
.strength-meter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.strength-meter__bar {
  flex: 1;
  height: 4px;
  background: var(--bg-hover);
  border-radius: 2px;
  overflow: hidden;
}

.strength-meter__fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}

.strength-meter__label {
  font-size: 0.725rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
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
  opacity: 0.5;
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

.auth-form__disclaimer {
  margin-top: 1.5rem;
  font-size: 0.725rem;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  justify-content: center;
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

  .auth-form__submit {
    min-height: 48px;
  }

  .auth-form__field input {
    min-height: 44px;
  }
}
</style>
