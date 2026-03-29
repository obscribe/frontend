import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth'
import { useVaultStore } from '@/stores/vault'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('obscribe_user') || 'null'))
  const token = ref(localStorage.getItem('obscribe_token') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name || 'User')
  const isEmailVerified = computed(() => !!user.value?.email_verified_at)
  const isOnboarded = computed(() => !!user.value?.onboarded_at)
  const isAdmin = computed(() => !!user.value?.is_admin)
  const hasVault = computed(() => !!user.value?.has_vault)

  function setAuth(userData, tokenValue) {
    user.value = userData
    token.value = tokenValue
    localStorage.setItem('obscribe_token', tokenValue)
    localStorage.setItem('obscribe_user', JSON.stringify(userData))
  }

  function clearAuth() {
    user.value = null
    token.value = null
    localStorage.removeItem('obscribe_token')
    localStorage.removeItem('obscribe_user')
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const data = await authService.login(email, password)

      if (data.mfa_required) {
        // Store temporary MFA token and redirect
        return { mfaRequired: true, mfaToken: data.mfa_token }
      }

      setAuth(data.user, data.token)

      // Unlock vault with password (E2E encryption)
      try {
        const vaultStore = useVaultStore()
        const unlocked = await vaultStore.unlock(password)
        if (!unlocked) {
          console.warn('Vault unlock returned false — vault may not be initialized')
          // Mark user as needing vault setup
          if (user.value) {
            user.value.has_vault = false
            localStorage.setItem('obscribe_user', JSON.stringify(user.value))
          }
        } else {
          // Vault is initialized and unlocked
          if (user.value) {
            user.value.has_vault = true
            localStorage.setItem('obscribe_user', JSON.stringify(user.value))
          }
        }
      } catch (vaultErr) {
        console.error('Vault unlock failed:', vaultErr)
        // Don't block login — user can still access the app, vault can be unlocked later
      }

      // Stash password temporarily for vault setup if needed
      if (user.value && !user.value.has_vault) {
        sessionStorage.setItem('obscribe_vault_pw', password)
      }

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Store the recovery key from vault initialization so onboarding can display it
  // Persisted in sessionStorage to survive page navigation (cleared after onboarding)
  const pendingRecoveryKey = ref(localStorage.getItem('obscribe_pending_recovery') || null)

  async function register(name, email, password) {
    loading.value = true
    error.value = null
    try {
      const data = await authService.register(name, email, password)
      setAuth(data.user, data.token)

      // Initialize vault with E2E encryption
      const vaultStore = useVaultStore()
      const { recoveryKey } = await vaultStore.initializeVault(password)
      pendingRecoveryKey.value = recoveryKey
      localStorage.setItem('obscribe_pending_recovery', recoveryKey)

      // Mark vault as initialized
      if (user.value) {
        user.value.has_vault = true
        localStorage.setItem('obscribe_user', JSON.stringify(user.value))
      }

      return { success: true }
    } catch (err) {
      if (err.response?.status === 422) {
        error.value = err.response.data.errors
      } else {
        error.value = err.response?.data?.message || 'Registration failed. Please try again.'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Logout even if API call fails
    }
    // Lock the vault (clear key from memory)
    const vaultStore = useVaultStore()
    vaultStore.lock()
    clearAuth()
    window.location.href = '/login'
  }

  async function fetchUser() {
    try {
      const data = await authService.fetchUser()
      const userData = data.user || data
      user.value = userData
      localStorage.setItem('obscribe_user', JSON.stringify(userData))
    } catch {
      // If fetching user fails, token may be invalid
      clearAuth()
    }
  }

  async function sendMagicLink(email) {
    loading.value = true
    error.value = null
    try {
      await authService.magicLinkSend(email)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to send magic link.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isEmailVerified,
    isOnboarded,
    isAdmin,
    hasVault,
    userName,
    pendingRecoveryKey,
    login,
    register,
    logout,
    fetchUser,
    sendMagicLink,
    clearAuth,
    setAuth,
  }
})
