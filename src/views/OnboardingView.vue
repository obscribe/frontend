<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVaultStore } from '@/stores/vault'
import { useTheme } from '@/composables/useTheme'
import { authService } from '@/services/auth'
import { cryptoService } from '@/services/crypto'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const vaultStore = useVaultStore()
const { theme, setTheme } = useTheme()
const vaultInitialized = ref(false)
const vaultError = ref('')

const currentStep = ref(0)
const totalSteps = 5

// Step 2: Recovery key
const recoveryKey = ref('')
const recoveryKeyAlreadySaved = ref(false)
const keySaved = ref(false)
const keyCopied = ref(false)

// Step 3: Theme
const selectedTheme = ref(theme.value || 'dark')

// Step 4: Notebook
const notebookName = ref('')
const notebookDescription = ref('')
const notebookIcon = ref('📓')
const notebookLoading = ref(false)
const createdNotebook = ref(null)

// Step 5: Complete
const showConfetti = ref(false)

const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '✏️', '🖊️', '💡', '🔬', '🎨', '🎵', '📋', '🗂️', '💼', '🌱']

onMounted(() => {
  // If already onboarded, go to dashboard
  if (authStore.user?.onboarded_at) {
    router.push('/')
    return
  }

  // Generate recovery key
  generateRecoveryKey()
})

async function generateRecoveryKey() {
  // Use the real recovery key generated during registration
  if (authStore.pendingRecoveryKey) {
    recoveryKey.value = typeof cryptoService.formatRecoveryKey === 'function'
      ? cryptoService.formatRecoveryKey(authStore.pendingRecoveryKey)
      : authStore.pendingRecoveryKey
    vaultInitialized.value = true
  } else {
    // Check if vault exists on server (key was generated but lost from storage)
    try {
      const { data } = await api.get('/vault')
      if (data.encrypted_vault_key) {
        // Vault was initialized but we lost the recovery key display
        // User needs to re-generate — this means logging out and re-registering
        // OR we can just skip this step since the vault is already set up
        vaultInitialized.value = true
        recoveryKey.value = 'Your encryption vault is already set up. Your recovery key was shown during registration. If you didn\'t save it, go to Settings → Security to generate a new one.'
        recoveryKeyAlreadySaved.value = true
      } else {
        vaultError.value = 'Vault encryption was not initialized. Please log out and register again.'
        recoveryKey.value = 'ERROR — vault not initialized'
      }
    } catch {
      vaultError.value = 'Vault encryption was not initialized. Please log out and register again.'
      recoveryKey.value = 'ERROR — vault not initialized'
    }
  }
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(recoveryKey.value)
    keyCopied.value = true
    setTimeout(() => { keyCopied.value = false }, 3000)
  } catch {
    // Fallback
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

function selectTheme(t) {
  selectedTheme.value = t
  setTheme(t)
}

async function saveTheme() {
  try {
    await authService.updatePreferences({ theme: selectedTheme.value })
  } catch {
    // Non-critical, continue anyway
  }
  nextStep()
}

async function createNotebook() {
  if (!notebookName.value.trim()) return

  notebookLoading.value = true
  try {
    const data = await authService.createNotebook({
      title: notebookName.value.trim(),
      description: notebookDescription.value.trim() || null,
      icon: notebookIcon.value,
    })
    createdNotebook.value = data
  } catch {
    window.__obscribeToast?.('error', 'Failed to create notebook. You can create one later.')
  } finally {
    notebookLoading.value = false
    nextStep()
  }
}

function skipNotebook() {
  nextStep()
}

function nextStep() {
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++
    if (currentStep.value === totalSteps - 1) {
      showConfetti.value = true
    }
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function confettiStyle(i) {
  const colors = ['#5b9a8b', '#7ec8b6', '#e54545', '#d4914e', '#c9a94e', '#6db3a2', '#f87171', '#60a5fa']
  return {
    '--x': `${Math.random() * 100}%`,
    '--delay': `${Math.random() * 2}s`,
    '--rotation': `${Math.random() * 720 - 360}deg`,
    '--color': colors[i % colors.length],
    '--size': `${Math.random() * 6 + 4}px`,
  }
}

async function finishOnboarding() {
  try {
    await authService.markOnboarded()
    // Update local user
    if (authStore.user) {
      authStore.user.onboarded_at = new Date().toISOString()
      localStorage.setItem('obscribe_user', JSON.stringify(authStore.user))
    }
    // Clear the recovery key from sessionStorage — it should only be shown once
    localStorage.removeItem('obscribe_pending_recovery')
    authStore.pendingRecoveryKey = null
  } catch {
    // Still redirect even if API fails
  }

  if (createdNotebook.value?.id) {
    router.push(`/notebook/${createdNotebook.value.id}`)
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="onboarding">
    <div class="onboarding__card">
      <!-- Step indicator -->
      <div class="onboarding__steps">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="onboarding__dot"
          :class="{
            'onboarding__dot--active': currentStep === i - 1,
            'onboarding__dot--done': currentStep > i - 1,
          }"
        />
      </div>

      <!-- Step 0: Welcome -->
      <Transition name="step" mode="out-in">
        <div v-if="currentStep === 0" key="welcome" class="onboarding__step">
          <div class="onboarding__icon">🔒</div>
          <h1 class="onboarding__title">Welcome to Obscribe, {{ authStore.userName }}!</h1>
          <p class="onboarding__text">
            Your notes are encrypted in your browser before being sent to our servers. We use AES-256-GCM encryption and PBKDF2 key derivation.
          </p>
          <p class="onboarding__text onboarding__text--muted">
            Let's get you set up. It'll only take a minute.
          </p>
          <button class="onboarding__btn onboarding__btn--primary" @click="nextStep">
            Let's go →
          </button>
        </div>

        <!-- Step 1: Recovery Key -->
        <div v-else-if="currentStep === 1" key="recovery" class="onboarding__step">
          <div class="recovery">
            <div class="recovery__warning">
              <div class="recovery__warning-icon">⚠️</div>
              <h2 class="recovery__warning-title">Your Recovery Key</h2>
              <p class="recovery__warning-text">
                This recovery key can decrypt your vault if you forget your password.
                Without both your password AND this key, your encrypted notes cannot be recovered —
                <strong>by anyone, including us</strong>. Save it somewhere safe.
              </p>
            </div>

            <div class="recovery__key-box">
              <div class="recovery__key-label">Recovery Key</div>
              <div class="recovery__key-value">
                {{ recoveryKey }}
              </div>
            </div>

            <div v-if="vaultError" class="recovery__error">
              {{ vaultError }}
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

            <div class="recovery__nav">
              <button class="onboarding__btn onboarding__btn--ghost" @click="prevStep">
                ← Back
              </button>
              <button
                class="onboarding__btn onboarding__btn--primary"
                :disabled="!keySaved"
                @click="nextStep"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Choose Theme -->
        <div v-else-if="currentStep === 2" key="theme" class="onboarding__step">
          <h1 class="onboarding__title">Choose your theme</h1>
          <p class="onboarding__text">You can always change this later in settings.</p>

          <div class="theme-picker">
            <button
              class="theme-preview"
              :class="{ 'theme-preview--selected': selectedTheme === 'dark' }"
              @click="selectTheme('dark')"
            >
              <div class="theme-preview__mock theme-preview__mock--dark">
                <div class="mock__sidebar">
                  <div class="mock__line mock__line--short" />
                  <div class="mock__line" />
                  <div class="mock__line" />
                </div>
                <div class="mock__content">
                  <div class="mock__line mock__line--title" />
                  <div class="mock__line" />
                  <div class="mock__line mock__line--medium" />
                </div>
              </div>
              <span class="theme-preview__label">Dark</span>
              <span v-if="selectedTheme === 'dark'" class="theme-preview__check">✓</span>
            </button>

            <button
              class="theme-preview"
              :class="{ 'theme-preview--selected': selectedTheme === 'light' }"
              @click="selectTheme('light')"
            >
              <div class="theme-preview__mock theme-preview__mock--light">
                <div class="mock__sidebar">
                  <div class="mock__line mock__line--short" />
                  <div class="mock__line" />
                  <div class="mock__line" />
                </div>
                <div class="mock__content">
                  <div class="mock__line mock__line--title" />
                  <div class="mock__line" />
                  <div class="mock__line mock__line--medium" />
                </div>
              </div>
              <span class="theme-preview__label">Light</span>
              <span v-if="selectedTheme === 'light'" class="theme-preview__check">✓</span>
            </button>
          </div>

          <div class="onboarding__nav">
            <button class="onboarding__btn onboarding__btn--ghost" @click="prevStep">
              ← Back
            </button>
            <button class="onboarding__btn onboarding__btn--primary" @click="saveTheme">
              Continue →
            </button>
          </div>
        </div>

        <!-- Step 3: Create First Notebook -->
        <div v-else-if="currentStep === 3" key="notebook" class="onboarding__step">
          <h1 class="onboarding__title">Create your first notebook</h1>
          <p class="onboarding__text">Notebooks organize your pages. You can create more later.</p>

          <div class="notebook-form">
            <div class="notebook-form__icon-picker">
              <label class="notebook-form__label">Icon</label>
              <div class="notebook-form__icons">
                <button
                  v-for="icon in icons"
                  :key="icon"
                  class="notebook-form__icon-btn"
                  :class="{ 'notebook-form__icon-btn--selected': notebookIcon === icon }"
                  @click="notebookIcon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>

            <div class="notebook-form__field">
              <label class="notebook-form__label" for="nb-name">Name</label>
              <input
                id="nb-name"
                v-model="notebookName"
                type="text"
                placeholder="e.g., Personal Journal, Work Notes, Ideas..."
                class="notebook-form__input"
              />
            </div>

            <div class="notebook-form__field">
              <label class="notebook-form__label" for="nb-desc">Description <span class="notebook-form__optional">(optional)</span></label>
              <input
                id="nb-desc"
                v-model="notebookDescription"
                type="text"
                placeholder="What's this notebook for?"
                class="notebook-form__input"
              />
            </div>
          </div>

          <div class="onboarding__nav">
            <button class="onboarding__btn onboarding__btn--ghost" @click="prevStep">
              ← Back
            </button>
            <button class="onboarding__btn onboarding__btn--ghost" @click="skipNotebook">
              Skip for now
            </button>
            <button
              class="onboarding__btn onboarding__btn--primary"
              :disabled="!notebookName.trim() || notebookLoading"
              @click="createNotebook"
            >
              <span v-if="notebookLoading" class="onboarding__btn-spinner" />
              {{ notebookLoading ? 'Creating...' : 'Create notebook →' }}
            </button>
          </div>
        </div>

        <!-- Step 4: Done -->
        <div v-else-if="currentStep === 4" key="done" class="onboarding__step">
          <div class="done">
            <div class="done__confetti" v-if="showConfetti">
              <span v-for="i in 30" :key="i" class="confetti-piece" :style="confettiStyle(i)" />
            </div>
            <div class="done__icon">🎉</div>
            <h1 class="onboarding__title">You're all set!</h1>
            <p class="onboarding__text">
              Your vault is ready. Start writing — your notes are private and secure.
            </p>
            <button class="onboarding__btn onboarding__btn--primary onboarding__btn--large" @click="finishOnboarding">
              Start writing →
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  width: 100%;
  max-width: 580px;
  padding: 2rem;
}

.onboarding__card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  position: relative;
  overflow: hidden;
}

/* Step dots */
.onboarding__steps {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.onboarding__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all var(--transition-normal);
}

.onboarding__dot--active {
  background: var(--accent);
  width: 24px;
  border-radius: 4px;
}

.onboarding__dot--done {
  background: var(--accent);
  opacity: 0.5;
}

/* Step transitions */
.step-enter-active,
.step-leave-active {
  transition: all 0.3s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Step content */
.onboarding__step {
  text-align: center;
}

.onboarding__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.onboarding__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.onboarding__text {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1rem;
  line-height: 1.6;
}

.onboarding__text--muted {
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

/* Buttons */
.onboarding__btn {
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

.onboarding__btn--primary {
  background: var(--accent);
  color: #fff;
}

.onboarding__btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.onboarding__btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.onboarding__btn--ghost {
  background: transparent;
  color: var(--text-secondary);
}

.onboarding__btn--ghost:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.onboarding__btn--large {
  padding: 1rem 2.5rem;
  font-size: 1rem;
}

.onboarding__btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.onboarding__nav {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

/* ── Recovery Key Step ── */
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

.recovery__error {
  background: rgba(229, 69, 69, 0.1);
  border: 1px solid rgba(229, 69, 69, 0.3);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  color: #f87171;
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 1rem;
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

.recovery__nav {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

/* ── Theme Picker ── */
.theme-picker {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0;
}

.theme-preview {
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  text-align: center;
  width: 180px;
}

.theme-preview:hover {
  border-color: var(--text-tertiary);
}

.theme-preview--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.theme-preview__mock {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  height: 100px;
  margin-bottom: 0.5rem;
}

.theme-preview__mock--dark {
  background: #0c0c0c;
}

.theme-preview__mock--dark .mock__sidebar {
  background: #111115;
  border-right: 1px solid #1f1f24;
}

.theme-preview__mock--dark .mock__line {
  background: #2a2a30;
}

.theme-preview__mock--dark .mock__line--title {
  background: #ebebeb;
  opacity: 0.3;
}

.theme-preview__mock--light {
  background: #fafaf8;
}

.theme-preview__mock--light .mock__sidebar {
  background: #f0f0ed;
  border-right: 1px solid #deded9;
}

.theme-preview__mock--light .mock__line {
  background: #deded9;
}

.theme-preview__mock--light .mock__line--title {
  background: #1a1a1a;
  opacity: 0.2;
}

.mock__sidebar {
  width: 40%;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.mock__content {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.mock__line {
  height: 6px;
  border-radius: 3px;
  width: 100%;
}

.mock__line--short {
  width: 60%;
}

.mock__line--medium {
  width: 75%;
}

.mock__line--title {
  height: 8px;
}

.theme-preview__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-preview__check {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 22px;
  height: 22px;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

/* ── Notebook Form ── */
.notebook-form {
  text-align: left;
  margin: 1.5rem 0;
}

.notebook-form__field {
  margin-bottom: 1rem;
}

.notebook-form__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.375rem;
}

.notebook-form__optional {
  text-transform: none;
  color: var(--text-tertiary);
  font-weight: 400;
}

.notebook-form__input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.notebook-form__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.notebook-form__input::placeholder {
  color: var(--text-muted);
}

.notebook-form__icon-picker {
  margin-bottom: 1.25rem;
}

.notebook-form__icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.notebook-form__icon-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.125rem;
  transition: all var(--transition-fast);
}

.notebook-form__icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.notebook-form__icon-btn--selected {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

/* ── Done / Confetti ── */
.done {
  position: relative;
}

.done__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 0.6s ease-out;
}

@keyframes bounce {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.done__confetti {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -10px;
  left: var(--x);
  width: var(--size);
  height: var(--size);
  background: var(--color);
  border-radius: 2px;
  animation: confetti-fall 3s ease-out var(--delay) forwards;
  opacity: 0;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateY(400px) rotate(var(--rotation));
  }
}

/* ── Responsive ── */
@media (max-width: 767px) {
  .onboarding {
    max-width: 100%;
    padding: 1rem;
  }

  .onboarding__card {
    padding: 2rem 1.25rem;
  }

  .onboarding__title {
    font-size: 1.25rem;
  }

  .recovery__key-value {
    font-size: 0.8rem;
  }

  .theme-picker {
    flex-direction: column;
    align-items: center;
  }

  .theme-preview {
    width: 100%;
    max-width: 220px;
  }

  .recovery__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .recovery__action-btn {
    justify-content: center;
    min-height: 44px;
  }

  .recovery__nav {
    flex-direction: column;
    gap: 0.5rem;
  }

  .onboarding__nav {
    flex-direction: column;
    gap: 0.5rem;
  }

  .onboarding__btn {
    width: 100%;
    min-height: 48px;
  }

  .notebook-form__icon-btn {
    width: 44px;
    height: 44px;
  }

  .notebook-form__input {
    min-height: 44px;
  }
}
</style>
