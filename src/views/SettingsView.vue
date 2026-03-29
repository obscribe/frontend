<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { config } from '@/config'
import { useBillingStore } from '@/stores/billing'
import BillingView from '@/views/settings/BillingView.vue'
import api from '@/services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { theme, setTheme } = useTheme()
const billingStore = useBillingStore()

// Active settings tab
const activeTab = ref('profile')
const baseTabs = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
]

const tabs = computed(() => {
  const t = [...baseTabs]
  if (!config.selfHosted) {
    t.push({ id: 'billing', label: 'Billing', icon: 'credit-card' })
  }
  t.push({ id: 'account', label: 'Account', icon: 'settings' })
  return t
})

// ─── Profile ───
const profileName = ref('')
const profileEmail = ref('')
const profileTimezone = ref('')
const profileSaving = ref(false)
const profileSaved = ref(false)

const showEmailChange = ref(false)
const newEmail = ref('')
const emailPassword = ref('')
const emailChangeSaving = ref(false)

const initials = computed(() => {
  const name = profileName.value || 'U'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

const commonTimezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'Europe/Madrid', 'Europe/Rome', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  'America/Sao_Paulo', 'America/Mexico_City', 'Africa/Cairo', 'Africa/Lagos',
]

async function saveProfile() {
  profileSaving.value = true
  profileSaved.value = false
  try {
    await api.patch('/user', { name: profileName.value })
    // Update local store
    if (authStore.user) {
      authStore.user.name = profileName.value
      localStorage.setItem('obscribe_user', JSON.stringify(authStore.user))
    }
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 3000)
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to update profile')
  } finally {
    profileSaving.value = false
  }
}

async function saveTimezone() {
  try {
    await api.patch('/user/preferences', { timezone: profileTimezone.value })
    toast('success', 'Timezone updated')
  } catch {
    toast('error', 'Failed to update timezone')
  }
}

async function changeEmail() {
  emailChangeSaving.value = true
  try {
    await api.patch('/user/email', { email: newEmail.value, password: emailPassword.value })
    profileEmail.value = newEmail.value
    showEmailChange.value = false
    newEmail.value = ''
    emailPassword.value = ''
    toast('success', 'Email updated. Please verify your new email.')
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to change email')
  } finally {
    emailChangeSaving.value = false
  }
}

// ─── Security ───
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)

const mfaEnabled = ref(false)
const mfaLoading = ref(false)

const sessions = ref([])
const sessionsLoading = ref(false)

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast('error', 'Passwords do not match')
    return
  }
  passwordSaving.value = true
  try {
    await api.patch('/user/password', {
      current_password: currentPassword.value,
      password: newPassword.value,
      password_confirmation: confirmPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast('success', 'Password updated successfully')
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to change password')
  } finally {
    passwordSaving.value = false
  }
}

async function toggleMfa() {
  mfaLoading.value = true
  try {
    if (mfaEnabled.value) {
      await api.delete('/user/mfa')
      mfaEnabled.value = false
      toast('success', 'MFA disabled')
    } else {
      await api.post('/user/mfa/enable')
      mfaEnabled.value = true
      toast('success', 'MFA enabled')
    }
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to update MFA')
  } finally {
    mfaLoading.value = false
  }
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    const { data } = await api.get('/user/sessions')
    sessions.value = data.sessions || data.data || data || []
  } catch {
    sessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(id) {
  try {
    await api.delete(`/user/sessions/${id}`)
    sessions.value = sessions.value.filter(s => s.id !== id)
    toast('success', 'Session revoked')
  } catch {
    toast('error', 'Failed to revoke session')
  }
}

async function revokeAllSessions() {
  try {
    await api.delete('/user/sessions')
    sessions.value = sessions.value.filter(s => s.is_current)
    toast('success', 'All other sessions revoked')
  } catch {
    toast('error', 'Failed to revoke sessions')
  }
}

function formatSessionTime(dateStr) {
  if (!dateStr) return 'Unknown'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

// ─── Appearance ───
const selectedTheme = ref(theme.value)

function selectTheme(t) {
  selectedTheme.value = t
  setTheme(t)
  // Persist to backend
  api.patch('/user/preferences', { theme: t }).catch(() => {})
}

// ─── Account ───
const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)

function exportData() {
  toast('info', 'Data export coming soon!')
}

async function deleteAccount() {
  if (deleteConfirmText.value !== 'DELETE') return
  deleting.value = true
  try {
    await api.delete('/user')
    authStore.clearAuth()
    window.location.href = 'https://obscribe.com'
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to delete account')
    deleting.value = false
  }
}

// ─── Toast helper ───
function toast(type, message) {
  window.dispatchEvent(new CustomEvent('obscribe:toast', { detail: { type, message } }))
}

// ─── Init ───
onMounted(() => {
  // Open billing tab if coming from checkout return or direct link
  if (route.query.success || route.query.cancelled || route.query.tab === 'billing') {
    activeTab.value = 'billing'
  }

  if (authStore.user) {
    profileName.value = authStore.user.name || ''
    profileEmail.value = authStore.user.email || ''
    profileTimezone.value = authStore.user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    mfaEnabled.value = !!authStore.user.mfa_enabled
  }

  // Load sessions when security tab shown
  if (activeTab.value === 'security') {
    loadSessions()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'security') {
    loadSessions()
  }
})
</script>

<template>
  <div class="settings">
    <!-- Settings sidebar nav -->
    <nav class="settings__nav">
      <h2 class="settings__nav-title">Settings</h2>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="settings__nav-item"
        :class="{ 'settings__nav-item--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <!-- User icon -->
        <svg v-if="tab.icon === 'user'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <!-- Shield icon -->
        <svg v-else-if="tab.icon === 'shield'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <!-- Credit Card icon -->
        <svg v-else-if="tab.icon === 'credit-card'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
        <!-- Palette icon -->
        <svg v-else-if="tab.icon === 'palette'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="12" r="1.5" fill="currentColor" />
          <circle cx="16" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
        <!-- Settings icon -->
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Settings content -->
    <div class="settings__content">
      <Transition name="fade" mode="out-in">
        <!-- ─── Profile ─── -->
        <div v-if="activeTab === 'profile'" key="profile" class="settings__panel">
          <h1 class="settings__title">Profile</h1>
          <p class="settings__desc">Manage your personal information.</p>

          <!-- Avatar -->
          <div class="settings__section">
            <div class="settings__avatar">
              <div class="settings__avatar-circle">{{ initials }}</div>
              <div class="settings__avatar-info">
                <p class="settings__avatar-name">{{ profileName || 'Your Name' }}</p>
                <p class="settings__avatar-hint">Avatar customization coming soon</p>
              </div>
            </div>
          </div>

          <!-- Display Name -->
          <div class="settings__section">
            <label class="settings__label" for="profile-name">Display name</label>
            <div class="settings__input-row">
              <input
                id="profile-name"
                v-model="profileName"
                type="text"
                class="settings__input"
                placeholder="Your name"
              />
              <button
                class="settings__btn settings__btn--primary"
                :disabled="profileSaving"
                @click="saveProfile"
              >
                {{ profileSaved ? '✓ Saved' : profileSaving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>

          <!-- Email -->
          <div class="settings__section">
            <label class="settings__label">Email</label>
            <div class="settings__input-row">
              <input
                type="email"
                class="settings__input"
                :value="profileEmail"
                disabled
              />
              <button
                class="settings__btn settings__btn--ghost"
                @click="showEmailChange = !showEmailChange"
              >
                {{ showEmailChange ? 'Cancel' : 'Change email' }}
              </button>
            </div>

            <Transition name="fade">
              <div v-if="showEmailChange" class="settings__email-change">
                <div class="settings__field">
                  <label class="settings__label" for="new-email">New email</label>
                  <input
                    id="new-email"
                    v-model="newEmail"
                    type="email"
                    class="settings__input"
                    placeholder="new@email.com"
                  />
                </div>
                <div class="settings__field">
                  <label class="settings__label" for="email-password">Confirm password</label>
                  <input
                    id="email-password"
                    v-model="emailPassword"
                    type="password"
                    class="settings__input"
                    placeholder="Enter your password"
                  />
                </div>
                <button
                  class="settings__btn settings__btn--primary"
                  :disabled="!newEmail || !emailPassword || emailChangeSaving"
                  @click="changeEmail"
                >
                  {{ emailChangeSaving ? 'Updating...' : 'Update email' }}
                </button>
              </div>
            </Transition>
          </div>

          <!-- Timezone -->
          <div class="settings__section">
            <label class="settings__label" for="timezone">Timezone</label>
            <div class="settings__input-row">
              <select
                id="timezone"
                v-model="profileTimezone"
                class="settings__input settings__select"
                @change="saveTimezone"
              >
                <option v-for="tz in commonTimezones" :key="tz" :value="tz">{{ tz.replace(/_/g, ' ') }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ─── Security ─── -->
        <div v-else-if="activeTab === 'security'" key="security" class="settings__panel">
          <h1 class="settings__title">Security</h1>
          <p class="settings__desc">Protect your account and manage access.</p>

          <!-- Change Password -->
          <div class="settings__section">
            <h3 class="settings__section-title">Change password</h3>
            <div class="settings__fields">
              <div class="settings__field">
                <label class="settings__label" for="current-pw">Current password</label>
                <input
                  id="current-pw"
                  v-model="currentPassword"
                  type="password"
                  class="settings__input"
                  placeholder="Enter current password"
                />
              </div>
              <div class="settings__field">
                <label class="settings__label" for="new-pw">New password</label>
                <input
                  id="new-pw"
                  v-model="newPassword"
                  type="password"
                  class="settings__input"
                  placeholder="Enter new password"
                />
              </div>
              <div class="settings__field">
                <label class="settings__label" for="confirm-pw">Confirm new password</label>
                <input
                  id="confirm-pw"
                  v-model="confirmPassword"
                  type="password"
                  class="settings__input"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <button
              class="settings__btn settings__btn--primary"
              :disabled="!currentPassword || !newPassword || !confirmPassword || passwordSaving"
              @click="changePassword"
            >
              {{ passwordSaving ? 'Updating...' : 'Update password' }}
            </button>
          </div>

          <!-- MFA -->
          <div class="settings__section">
            <h3 class="settings__section-title">Two-factor authentication</h3>
            <div class="settings__mfa-status">
              <div class="settings__mfa-badge" :class="mfaEnabled ? 'settings__mfa-badge--on' : 'settings__mfa-badge--off'">
                {{ mfaEnabled ? 'Enabled' : 'Disabled' }}
              </div>
              <p class="settings__mfa-text">
                {{ mfaEnabled ? 'Your account is protected with two-factor authentication.' : 'Add an extra layer of security to your account.' }}
              </p>
            </div>
            <button
              class="settings__btn"
              :class="mfaEnabled ? 'settings__btn--danger-ghost' : 'settings__btn--primary'"
              :disabled="mfaLoading"
              @click="toggleMfa"
            >
              {{ mfaLoading ? 'Processing...' : mfaEnabled ? 'Disable MFA' : 'Enable MFA' }}
            </button>
          </div>

          <!-- Active Sessions -->
          <div class="settings__section">
            <div class="settings__section-header">
              <h3 class="settings__section-title">Active sessions</h3>
              <button
                v-if="sessions.length > 1"
                class="settings__btn settings__btn--ghost settings__btn--sm"
                @click="revokeAllSessions"
              >
                Revoke all other sessions
              </button>
            </div>

            <div v-if="sessionsLoading" class="settings__sessions-loading">
              Loading sessions...
            </div>
            <div v-else-if="sessions.length === 0" class="settings__sessions-empty">
              No active sessions found.
            </div>
            <div v-else class="settings__sessions">
              <div
                v-for="session in sessions"
                :key="session.id"
                class="settings__session"
              >
                <div class="settings__session-info">
                  <div class="settings__session-device">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span>{{ session.device || session.user_agent || 'Unknown device' }}</span>
                    <span v-if="session.is_current" class="settings__session-badge">Current</span>
                  </div>
                  <div class="settings__session-meta">
                    <span>{{ session.ip || session.ip_address || 'Unknown IP' }}</span>
                    <span>·</span>
                    <span>{{ formatSessionTime(session.last_used_at || session.last_activity) }}</span>
                  </div>
                </div>
                <button
                  v-if="!session.is_current"
                  class="settings__btn settings__btn--danger-ghost settings__btn--sm"
                  @click="revokeSession(session.id)"
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Appearance ─── -->
        <div v-else-if="activeTab === 'appearance'" key="appearance" class="settings__panel">
          <h1 class="settings__title">Appearance</h1>
          <p class="settings__desc">Customize how Obscribe looks.</p>

          <div class="settings__section">
            <h3 class="settings__section-title">Theme</h3>
            <div class="settings__theme-picker">
              <button
                class="settings__theme-card"
                :class="{ 'settings__theme-card--selected': selectedTheme === 'dark' }"
                @click="selectTheme('dark')"
              >
                <div class="settings__theme-preview settings__theme-preview--dark">
                  <div class="preview__sidebar">
                    <div class="preview__line preview__line--short" />
                    <div class="preview__line" />
                    <div class="preview__line" />
                  </div>
                  <div class="preview__content">
                    <div class="preview__line preview__line--title" />
                    <div class="preview__line" />
                    <div class="preview__line preview__line--medium" />
                  </div>
                </div>
                <span class="settings__theme-label">Dark</span>
                <span v-if="selectedTheme === 'dark'" class="settings__theme-check">✓</span>
              </button>

              <button
                class="settings__theme-card"
                :class="{ 'settings__theme-card--selected': selectedTheme === 'light' }"
                @click="selectTheme('light')"
              >
                <div class="settings__theme-preview settings__theme-preview--light">
                  <div class="preview__sidebar">
                    <div class="preview__line preview__line--short" />
                    <div class="preview__line" />
                    <div class="preview__line" />
                  </div>
                  <div class="preview__content">
                    <div class="preview__line preview__line--title" />
                    <div class="preview__line" />
                    <div class="preview__line preview__line--medium" />
                  </div>
                </div>
                <span class="settings__theme-label">Light</span>
                <span v-if="selectedTheme === 'light'" class="settings__theme-check">✓</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ─── Billing ─── -->
        <div v-else-if="activeTab === 'billing'" key="billing" class="settings__panel">
          <h1 class="settings__title">Billing</h1>
          <p class="settings__desc">Manage your subscription and payments.</p>
          <BillingView />
        </div>

        <!-- ─── Account ─── -->
        <div v-else-if="activeTab === 'account'" key="account" class="settings__panel">
          <h1 class="settings__title">Account</h1>
          <p class="settings__desc">Manage your subscription and account.</p>

          <!-- Plan -->
          <div v-if="!config.selfHosted" class="settings__section">
            <h3 class="settings__section-title">Plan</h3>
            <div class="settings__plan">
              <div class="settings__plan-badge">
                {{ billingStore.isPro ? '⭐ Pro' : 'Free' }}
              </div>
              <p class="settings__plan-text" v-if="!billingStore.isPro">
                Upgrade to Pro for unlimited notebooks, advanced search, and more.
              </p>
              <p class="settings__plan-text" v-else>
                You're on the Pro plan. Thanks for supporting Obscribe!
              </p>
              <button
                v-if="!billingStore.isPro"
                class="settings__btn settings__btn--primary"
                @click="router.push('/upgrade')"
              >
                Upgrade to Pro
              </button>
              <button
                v-else
                class="settings__btn settings__btn--ghost"
                @click="activeTab = 'billing'"
              >
                Manage subscription
              </button>
            </div>
          </div>

          <!-- Export -->
          <div class="settings__section">
            <h3 class="settings__section-title">Export data</h3>
            <p class="settings__section-desc">Download a copy of all your data.</p>
            <button class="settings__btn settings__btn--ghost" @click="exportData">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export all my data
            </button>
          </div>

          <!-- Danger Zone -->
          <div class="settings__section settings__danger-zone">
            <h3 class="settings__section-title settings__section-title--danger">Danger zone</h3>
            <p class="settings__section-desc">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              class="settings__btn settings__btn--danger"
              @click="showDeleteModal = true"
            >
              Delete my account
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Delete Account Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="settings__modal-overlay" @click.self="showDeleteModal = false">
          <div class="settings__modal">
            <div class="settings__modal-icon">⚠️</div>
            <h2 class="settings__modal-title">Delete your account?</h2>
            <p class="settings__modal-text">
              This will permanently delete your account, all notebooks, and all pages.
              Your encrypted data cannot be recovered.
            </p>
            <div class="settings__field">
              <label class="settings__label" for="delete-confirm">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                v-model="deleteConfirmText"
                type="text"
                class="settings__input"
                placeholder="DELETE"
                autocomplete="off"
              />
            </div>
            <div class="settings__modal-actions">
              <button class="settings__btn settings__btn--ghost" @click="showDeleteModal = false; deleteConfirmText = ''">
                Cancel
              </button>
              <button
                class="settings__btn settings__btn--danger"
                :disabled="deleteConfirmText !== 'DELETE' || deleting"
                @click="deleteAccount"
              >
                {{ deleting ? 'Deleting...' : 'Permanently delete account' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* ─── Nav ─── */
.settings__nav {
  width: 220px;
  flex-shrink: 0;
  padding: 2rem 1rem;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings__nav-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  padding: 0 0.75rem;
  margin: 0 0 0.75rem;
}

.settings__nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-family: var(--font-ui);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
}

.settings__nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.settings__nav-item--active {
  background: var(--accent-subtle);
  color: var(--accent-text);
}

/* ─── Content ─── */
.settings__content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 3rem;
  max-width: 680px;
}

.settings__panel {
  animation: none;
}

.settings__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.settings__desc {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: 0 0 2rem;
}

/* ─── Sections ─── */
.settings__section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-subtle);
}

.settings__section:last-child {
  border-bottom: none;
}

.settings__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.settings__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.settings__section-title--danger {
  color: #f87171;
}

.settings__section-desc {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin: 0 0 1rem;
}

/* ─── Avatar ─── */
.settings__avatar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings__avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  flex-shrink: 0;
}

.settings__avatar-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.settings__avatar-hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0.125rem 0 0;
}

/* ─── Form ─── */
.settings__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.375rem;
}

.settings__input-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.settings__input {
  flex: 1;
  padding: 0.625rem 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.settings__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.settings__input::placeholder {
  color: var(--text-muted);
}

.settings__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings__select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.25rem;
  cursor: pointer;
}

.settings__field {
  margin-bottom: 0.75rem;
}

.settings__fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.settings__email-change {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

/* ─── Buttons ─── */
.settings__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.settings__btn--sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.settings__btn--primary {
  background: var(--accent);
  color: #fff;
}

.settings__btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.settings__btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings__btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.settings__btn--ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.settings__btn--danger {
  background: #dc2626;
  color: #fff;
}

.settings__btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.settings__btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings__btn--danger-ghost {
  background: transparent;
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.settings__btn--danger-ghost:hover {
  background: rgba(248, 113, 113, 0.08);
}

/* ─── MFA ─── */
.settings__mfa-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.settings__mfa-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.settings__mfa-badge--on {
  background: rgba(110, 231, 168, 0.12);
  color: #6ee7a8;
}

.settings__mfa-badge--off {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.settings__mfa-text {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin: 0;
}

/* ─── Sessions ─── */
.settings__sessions-loading,
.settings__sessions-empty {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  padding: 1rem 0;
}

.settings__sessions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings__session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.settings__session-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.settings__session-device {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.settings__session-badge {
  padding: 0.125rem 0.5rem;
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 10px;
}

.settings__session-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

/* ─── Theme Picker ─── */
.settings__theme-picker {
  display: flex;
  gap: 1rem;
}

.settings__theme-card {
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

.settings__theme-card:hover {
  border-color: var(--text-tertiary);
}

.settings__theme-card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.settings__theme-preview {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  height: 100px;
  margin-bottom: 0.5rem;
}

.settings__theme-preview--dark {
  background: #0c0c0c;
}

.settings__theme-preview--dark .preview__sidebar {
  background: #111115;
  border-right: 1px solid #1f1f24;
}

.settings__theme-preview--dark .preview__line {
  background: #2a2a30;
}

.settings__theme-preview--dark .preview__line--title {
  background: #ebebeb;
  opacity: 0.3;
}

.settings__theme-preview--light {
  background: #fafaf8;
}

.settings__theme-preview--light .preview__sidebar {
  background: #f0f0ed;
  border-right: 1px solid #deded9;
}

.settings__theme-preview--light .preview__line {
  background: #deded9;
}

.settings__theme-preview--light .preview__line--title {
  background: #1a1a1a;
  opacity: 0.2;
}

.preview__sidebar {
  width: 40%;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.preview__content {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.preview__line {
  height: 6px;
  border-radius: 3px;
  width: 100%;
}

.preview__line--short {
  width: 60%;
}

.preview__line--medium {
  width: 75%;
}

.preview__line--title {
  height: 8px;
}

.settings__theme-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.settings__theme-check {
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

/* ─── Plan ─── */
.settings__plan {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.settings__plan-badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.settings__plan-text {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin: 0;
}

/* ─── Danger Zone ─── */
.settings__danger-zone {
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.15);
  border-radius: var(--radius-md);
  padding: 1.5rem !important;
  margin-top: 1rem;
}

/* ─── Modal ─── */
.settings__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.settings__modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 440px;
  width: 90%;
  text-align: center;
}

.settings__modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.settings__modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f87171;
  margin: 0 0 0.5rem;
}

.settings__modal-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.settings__modal .settings__field {
  text-align: left;
  margin-bottom: 1.5rem;
}

.settings__modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* ─── Transitions ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─── Responsive ─── */
@media (max-width: 767px) {
  .settings {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .settings__nav {
    width: 100%;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0.75rem 1rem;
    border-right: none;
    border-bottom: 1px solid var(--border);
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .settings__nav::-webkit-scrollbar {
    display: none;
  }

  .settings__nav-title {
    display: none;
  }

  .settings__nav-item {
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 44px;
    padding: 0.5rem 1rem;
  }

  .settings__content {
    padding: 1.25rem 1rem;
    max-width: 100%;
  }

  .settings__title {
    font-size: 1.25rem;
  }

  .settings__theme-picker {
    flex-direction: column;
    align-items: stretch;
  }

  .settings__theme-card {
    width: 100%;
  }

  .settings__input-row {
    flex-direction: column;
  }

  .settings__btn {
    min-height: 44px;
  }

  .settings__session {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .settings__modal {
    width: calc(100vw - 2rem);
  }

  .settings__modal-actions {
    flex-direction: column;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .settings__nav {
    width: 180px;
  }

  .settings__content {
    padding: 2rem;
  }
}
</style>
