import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cryptoService } from '@/services/crypto'
import api from '@/services/api'

export const useVaultStore = defineStore('vault', () => {
  // Vault key lives in memory ONLY — never in localStorage
  let vaultKey = null

  // Reactive flag for UI
  const unlocked = ref(false)
  const unlocking = ref(false)
  const error = ref(null)

  const isUnlocked = computed(() => unlocked.value)

  /**
   * Initialize vault during registration — generate keys, encrypt, store on server
   * @param {string} password - User's password
   * @returns {Promise<{recoveryKey: string}>} Recovery key to show user
   */
  async function initializeVault(password) {
    error.value = null
    try {
      // 1. Generate salt
      const salt = cryptoService.generateSalt()
      const saltB64 = cryptoService.saltToBase64(salt)

      // 2. Derive master key from password
      const masterKey = await cryptoService.deriveMasterKey(password, salt)

      // 3. Generate vault key
      const newVaultKey = await cryptoService.generateVaultKey()

      // 4. Encrypt vault key with master key
      const { encryptedKey, iv } = await cryptoService.encryptVaultKey(newVaultKey, masterKey)

      // 5. Generate recovery key
      const recoveryKeyB64 = cryptoService.generateRecoveryKey()

      // 6. Encrypt vault key with recovery key
      const recovery = await cryptoService.encryptVaultKeyWithRecovery(newVaultKey, recoveryKeyB64)

      // 7. Store on server
      await api.patch('/vault', {
        encrypted_vault_key: encryptedKey,
        vault_nonce: iv,
        salt: saltB64,
        recovery_encrypted_vault_key: recovery.encryptedKey,
        recovery_vault_nonce: recovery.iv,
      })

      // 8. Keep vault key in memory
      vaultKey = newVaultKey
      unlocked.value = true

      // 9. Store in sessionStorage for page refresh survival
      await persistToSession(newVaultKey)

      return { recoveryKey: recoveryKeyB64 }
    } catch (err) {
      error.value = 'Failed to initialize vault'
      console.error('Vault init error:', err)
      throw err
    }
  }

  /**
   * Unlock vault after login — fetch encrypted vault key from server, decrypt with password
   * @param {string} password
   */
  async function unlock(password) {
    unlocking.value = true
    error.value = null
    try {
      // 1. Fetch vault data from server
      const { data } = await api.get('/vault')

      if (!data.encrypted_vault_key || !data.vault_nonce || !data.salt) {
        // Vault not initialized yet (legacy user or first-time setup needed)
        error.value = 'Vault not initialized'
        unlocking.value = false
        return false
      }

      // 2. Derive master key from password + salt
      const salt = cryptoService.base64ToSalt(data.salt)
      const masterKey = await cryptoService.deriveMasterKey(password, salt)

      // 3. Decrypt vault key
      vaultKey = await cryptoService.decryptVaultKey(
        data.encrypted_vault_key,
        data.vault_nonce,
        masterKey
      )

      unlocked.value = true

      // 4. Persist to sessionStorage for refresh survival
      await persistToSession(vaultKey)

      return true
    } catch (err) {
      error.value = 'Failed to unlock vault — wrong password?'
      console.error('Vault unlock error:', err)
      return false
    } finally {
      unlocking.value = false
    }
  }

  /**
   * Try to restore vault key from sessionStorage (survives page refresh)
   */
  async function tryRestoreFromSession() {
    try {
      const stored = sessionStorage.getItem('obscribe_vk')
      if (!stored) return false

      const parsed = JSON.parse(stored)
      const keyData = Uint8Array.from(atob(parsed.key), c => c.charCodeAt(0))

      vaultKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      unlocked.value = true
      return true
    } catch {
      // Session data corrupt or missing — user needs to re-enter password
      sessionStorage.removeItem('obscribe_vk')
      return false
    }
  }

  /**
   * Persist vault key to sessionStorage (survives refresh, cleared on tab close)
   */
  async function persistToSession(key) {
    try {
      const exported = await window.crypto.subtle.exportKey('raw', key)
      const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
      sessionStorage.setItem('obscribe_vk', JSON.stringify({ key: b64 }))
    } catch {
      // Non-critical — user will just need to re-enter password on refresh
    }
  }

  /**
   * Lock the vault — clear key from memory and sessionStorage
   */
  function lock() {
    vaultKey = null
    unlocked.value = false
    sessionStorage.removeItem('obscribe_vk')
  }

  /**
   * Encrypt content with the vault key
   * @param {string} plaintext
   * @returns {Promise<{ciphertext: string, iv: string}>}
   */
  async function encryptContent(plaintext) {
    if (!vaultKey) throw new Error('Vault is locked')
    return cryptoService.encryptContent(plaintext, vaultKey)
  }

  /**
   * Decrypt content with the vault key
   * @param {string} ciphertext - Base64 ciphertext
   * @param {string} iv - Base64 IV/nonce
   * @returns {Promise<string>}
   */
  async function decryptContent(ciphertext, iv) {
    if (!vaultKey) throw new Error('Vault is locked')
    return cryptoService.decryptContent(ciphertext, iv, vaultKey)
  }

  /**
   * Re-encrypt vault key with a new password (for password change)
   * @param {string} newPassword
   */
  async function reEncryptWithNewPassword(newPassword) {
    if (!vaultKey) throw new Error('Vault is locked')

    const salt = cryptoService.generateSalt()
    const saltB64 = cryptoService.saltToBase64(salt)
    const masterKey = await cryptoService.deriveMasterKey(newPassword, salt)
    const { encryptedKey, iv } = await cryptoService.encryptVaultKey(vaultKey, masterKey)

    await api.patch('/vault', {
      encrypted_vault_key: encryptedKey,
      vault_nonce: iv,
      salt: saltB64,
    })
  }

  /**
   * Recover vault with recovery key
   * @param {string} recoveryKeyB64
   * @param {string} newPassword - New password to set
   */
  async function recoverWithKey(recoveryKeyB64, newPassword) {
    error.value = null
    try {
      // 1. Fetch recovery vault data
      const { data } = await api.get('/vault')

      if (!data.recovery_encrypted_vault_key || !data.recovery_vault_nonce) {
        throw new Error('No recovery data found')
      }

      // 2. Decrypt vault key with recovery key
      vaultKey = await cryptoService.decryptVaultKeyWithRecovery(
        data.recovery_encrypted_vault_key,
        data.recovery_vault_nonce,
        recoveryKeyB64
      )

      unlocked.value = true

      // 3. Re-encrypt with new password
      await reEncryptWithNewPassword(newPassword)

      // 4. Persist to session
      await persistToSession(vaultKey)

      return true
    } catch (err) {
      error.value = 'Recovery failed — invalid recovery key?'
      console.error('Recovery error:', err)
      return false
    }
  }

  return {
    unlocked,
    unlocking,
    error,
    isUnlocked,
    initializeVault,
    unlock,
    lock,
    tryRestoreFromSession,
    encryptContent,
    decryptContent,
    reEncryptWithNewPassword,
    recoverWithKey,
  }
})
