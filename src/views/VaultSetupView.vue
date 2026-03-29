<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVaultStore } from '@/stores/vault'
import { cryptoService } from '@/services/crypto'

const router = useRouter()
const authStore = useAuthStore()
const vaultStore = useVaultStore()

const step = ref('init') // 'init' | 'password' | 'recovery' | 'done'
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const recoveryKey = ref('')
const keySaved = ref(false)
const keyCopied = ref(false)

onMounted(async () => {
  // If user already has vault, redirect
  if (authStore.user?.has_vault) {
    redirectNext()
    return
  }

  // Check if we have the password stashed from login
  const stashedPw = sessionStorage.getItem('obscribe_vault_pw')
  if (stashedPw) {
    password.value = stashedPw
    // Auto-proceed to init vault
    step.value = 'init'
    await initializeVault()
  } else {
    // Need user to enter password
    step.value = 'password'
  }
})

async function handlePasswordSubmit() {
  if (!password.value) return
  errorMessage.value = ''
  step.value = 'init'
  await initializeVault()
}

async function initializeVault() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { recoveryKey: rk } = await vaultStore.initializeVault(password.value)
    recoveryKey.value = cryptoService.formatRecoveryKey(rk)

    // Store pending recovery key for onboarding too
    authStore.pendingRecoveryKey = rk
    localStorage.setItem('obscribe_pending_recovery', rk)

    // Clear stashed password
    sessionStorage.removeItem('obscribe_vault_pw')

    // Update user's has_vault flag
    if (authStore.user) {
      authStore.user.has_vault = true
      localStorage.setItem('obscribe_user', JSON.stringify(authStore.user))
    }

    step.value = 'recovery'
  } catch (err) {
    console.error('Vault initialization failed:', err)
    errorMessage.value = 'Failed to initialize encryption vault. Please try again.'
    step.value = 'password'
  } finally {
    loading.value = false
  }
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(recoveryKey.value)
    keyCopied.value = true
    setTimeout(() => { keyCopied.value = false }, 3000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = recoveryKey.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    keyCopied.value = true
    setTimeout(() => { keyCopied.value = false }, 3000)
  }
}

function downloadKey() {
  const content = `OBSCRIBE RECOVERY KEY
=====================
Generated: ${new Date().toISOString()}
Account: ${authStore.user?.email || 'unknown'}

IMPORTANT: Store this key in a safe place.
If you lose your password AND this recovery key, your encrypted data
is GONE FOREVER. The server cannot decrypt your notes without this key.

Your recovery key:

${recoveryKey.value}

=====================
Keep this file safe. Do not share it.`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'obscribe-recovery-key.txt'
  a.click()
  URL.revokeObjectURL(url)
}

function finish() {
  redirectNext()
}

function redirectNext() {
  if (!authStore.user?.onboarded_at) {
    router.push('/onboarding')
  } else {
    router.push('/')
  }
}


</script>

<template>
  <div class="vault-setup">
    <div class="vault-setup__card">
      <!-- Logo -->
      <div class="vault-setup__branding">
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none" class="vault-setup__logo">
          <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15" />
          <text x="20" y="28" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="var(--accent)" text-anchor="middle">O</text>
        </svg>
      </div>

      <!-- Loading / Init step -->
      <div v-if="step === 'init' && loading" class="vault-setup__step">
        <div class="vault-setup__icon">🔐</div>
        <h1 class="vault-setup__title">Setting up your vault</h1>
        <p class="vault-setup__text">
          Generating encryption keys and securing your vault...
        </p>
        <div class="vault-setup__spinner-wrap">
          <span class="vault-setup__spinner" />
        </div>
      </div>

      <!-- Password entry step -->
      <div v-else-if="step === 'password'" class="vault-setup__step">
        <div class="vault-setup__icon">🔒</div>
        <h1 class="vault-setup__title">Set up encryption</h1>
        <p class="vault-setup__text">
          Obscribe uses end-to-end encryption to protect your notes.
          Your password is used to derive your encryption key — it never leaves your device.
        </p>

        <div class="vault-setup__info-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <strong>AES-256-GCM encryption</strong>
            <span>Your encryption key is derived using PBKDF2 with 600,000 iterations</span>
          </div>
        </div>

        <div v-if="errorMessage" class="vault-setup__error">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handlePasswordSubmit" class="vault-setup__form">
          <div class="vault-setup__field">
            <label for="vault-password">Enter your password</label>
            <input
              id="vault-password"
              v-model="password"
              type="password"
              placeholder="Your account password"
              autocomplete="current-password"
              required
            />
            <span class="vault-setup__hint">This is the same password you used to log in</span>
          </div>
          <button type="submit" class="vault-setup__btn vault-setup__btn--primary" :disabled="!password || loading">
            <span v-if="loading" class="vault-setup__spinner" />
            {{ loading ? 'Initializing...' : 'Initialize encryption' }}
          </button>
        </form>
      </div>

      <!-- Recovery key step -->
      <div v-else-if="step === 'recovery'" class="vault-setup__step">
        <div class="recovery">
          <div class="recovery__warning">
            <div class="recovery__warning-icon">⚠️</div>
            <h2 class="recovery__warning-title">Save your recovery key</h2>
            <p class="recovery__warning-text">
              This recovery key can decrypt your vault if you forget your password.
              Without both your password AND this key, your encrypted notes cannot be recovered —
              <strong>by anyone, including us</strong>.
            </p>
          </div>

          <div class="recovery__key-box">
            <div class="recovery__key-label">Recovery Key</div>
            <div class="recovery__key-value">
              {{ recoveryKey }}
            </div>
          </div>

          <div class="recovery__actions">
            <button class="recovery__action-btn" @click="copyKey">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {{ keyCopied ? 'Copied!' : 'Copy to clipboard' }}
            </button>
            <button class="recovery__action-btn" @click="downloadKey">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download as file
            </button>
          </div>

          <label class="recovery__confirm">
            <input type="checkbox" v-model="keySaved" />
            <span>I have saved my recovery key in a safe place</span>
          </label>

          <button
            class="vault-setup__btn vault-setup__btn--primary vault-setup__btn--full"
            :disabled="!keySaved"
            @click="finish"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vault-setup {
  width: 100%;
  max-width: 520px;
  padding: 2rem;
}

.vault-setup__card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
}

.vault-setup__branding {
  text-align: center;
  margin-bottom: 1.5rem;
}

.vault-setup__step {
  text-align: center;
}

.vault-setup__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.vault-setup__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.vault-setup__text {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.vault-setup__info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--accent-subtle);
  border: 1px solid rgba(91, 154, 139, 0.2);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  text-align: left;
}

.vault-setup__info-box svg {
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.vault-setup__info-box div {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.vault-setup__info-box strong {
  font-size: 0.85rem;
  color: var(--accent-text);
  font-weight: 600;
}

.vault-setup__info-box span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.vault-setup__error {
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

.vault-setup__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vault-setup__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  text-align: left;
}

.vault-setup__field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vault-setup__field input {
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.vault-setup__field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.vault-setup__field input::placeholder {
  color: var(--text-muted);
}

.vault-setup__hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.vault-setup__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
}

.vault-setup__btn--primary {
  background: var(--accent);
  color: #fff;
}

.vault-setup__btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.vault-setup__btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vault-setup__btn--full {
  width: 100%;
}

.vault-setup__spinner-wrap {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.vault-setup__spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Recovery Key (matches OnboardingView style) ── */
.recovery__warning {
  background: rgba(229, 69, 69, 0.08);
  border: 1px solid rgba(229, 69, 69, 0.25);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.recovery__warning-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.recovery__warning-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f87171;
  margin: 0 0 0.5rem;
}

.recovery__warning-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  text-align: left;
}

.recovery__warning-text strong {
  color: #f87171;
}

.recovery__key-box {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.recovery__key-label {
  font-size: 0.725rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.recovery__key-value {
  font-size: 0.9rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text-primary);
  padding: 0.75rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  word-break: break-all;
  line-height: 1.8;
  letter-spacing: 0.05em;
  text-align: center;
  user-select: all;
}

.recovery__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.recovery__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.recovery__action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.recovery__confirm {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.recovery__confirm input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #f87171;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  background: transparent;
}

.recovery__confirm input[type="checkbox"]:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.recovery__confirm input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* ─── Responsive ─── */
@media (max-width: 767px) {
  .vault-setup {
    max-width: 100%;
    padding: 1rem;
  }

  .vault-setup__card {
    padding: 2rem 1.25rem;
  }

  .vault-setup__title {
    font-size: 1.25rem;
  }

  .recovery__key-value {
    font-size: 0.8rem;
  }

  .recovery__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .recovery__action-btn {
    justify-content: center;
    min-height: 44px;
  }
}
</style>
