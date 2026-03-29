// E2E Encryption service using Web Crypto API (SubtleCrypto)
// No external dependencies — built into all modern browsers

// Helper: ArrayBuffer → Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

// Helper: Base64 → ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export const cryptoService = {
  /**
   * Derive a master key from password + salt using PBKDF2
   * @param {string} password - User's password
   * @param {Uint8Array} salt - 16-byte salt
   * @returns {Promise<CryptoKey>} Master key for wrapping/unwrapping vault key
   */
  async deriveMasterKey(password, salt) {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['wrapKey', 'unwrapKey']
    )
  },

  /**
   * Generate a random 256-bit vault key for encrypting note content
   * @returns {Promise<CryptoKey>}
   */
  async generateVaultKey() {
    return window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  },

  /**
   * Encrypt (wrap) the vault key with the master key
   * @param {CryptoKey} vaultKey
   * @param {CryptoKey} masterKey
   * @returns {Promise<{encryptedKey: string, iv: string}>} Base64-encoded
   */
  async encryptVaultKey(vaultKey, masterKey) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const wrapped = await window.crypto.subtle.wrapKey(
      'raw', vaultKey, masterKey, { name: 'AES-GCM', iv }
    )
    return {
      encryptedKey: arrayBufferToBase64(wrapped),
      iv: arrayBufferToBase64(iv),
    }
  },

  /**
   * Decrypt (unwrap) the vault key with the master key
   * @param {string} encryptedKeyB64 - Base64-encoded encrypted vault key
   * @param {string} ivB64 - Base64-encoded IV
   * @param {CryptoKey} masterKey
   * @returns {Promise<CryptoKey>} Decrypted vault key
   */
  async decryptVaultKey(encryptedKeyB64, ivB64, masterKey) {
    const encryptedKey = base64ToArrayBuffer(encryptedKeyB64)
    const iv = base64ToArrayBuffer(ivB64)
    return window.crypto.subtle.unwrapKey(
      'raw',
      encryptedKey,
      masterKey,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  },

  /**
   * Encrypt note content with the vault key
   * @param {string} plaintext - Note content (HTML)
   * @param {CryptoKey} vaultKey
   * @returns {Promise<{ciphertext: string, iv: string}>} Base64-encoded
   */
  async encryptContent(plaintext, vaultKey) {
    const encoder = new TextEncoder()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      vaultKey,
      encoder.encode(plaintext)
    )
    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
    }
  },

  /**
   * Decrypt note content with the vault key
   * @param {string} ciphertextB64 - Base64-encoded ciphertext
   * @param {string} ivB64 - Base64-encoded IV
   * @param {CryptoKey} vaultKey
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decryptContent(ciphertextB64, ivB64, vaultKey) {
    const ciphertext = base64ToArrayBuffer(ciphertextB64)
    const iv = base64ToArrayBuffer(ivB64)
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      vaultKey,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  },

  /**
   * Generate a recovery key (random 256-bit key as base64)
   * @returns {string} Base64-encoded recovery key
   */
  generateRecoveryKey() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(32))
    return arrayBufferToBase64(bytes)
  },

  /**
   * Encrypt vault key with recovery key
   * @param {CryptoKey} vaultKey
   * @param {string} recoveryKeyB64 - Base64-encoded recovery key
   * @returns {Promise<{encryptedKey: string, iv: string}>} Base64-encoded
   */
  async encryptVaultKeyWithRecovery(vaultKey, recoveryKeyB64) {
    const recoveryBytes = base64ToArrayBuffer(recoveryKeyB64)
    const recoveryKey = await window.crypto.subtle.importKey(
      'raw',
      recoveryBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey']
    )
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const wrapped = await window.crypto.subtle.wrapKey(
      'raw', vaultKey, recoveryKey, { name: 'AES-GCM', iv }
    )
    return {
      encryptedKey: arrayBufferToBase64(wrapped),
      iv: arrayBufferToBase64(iv),
    }
  },

  /**
   * Decrypt vault key with recovery key
   * @param {string} encryptedKeyB64
   * @param {string} ivB64
   * @param {string} recoveryKeyB64
   * @returns {Promise<CryptoKey>}
   */
  async decryptVaultKeyWithRecovery(encryptedKeyB64, ivB64, recoveryKeyB64) {
    const recoveryBytes = base64ToArrayBuffer(recoveryKeyB64)
    const recoveryKey = await window.crypto.subtle.importKey(
      'raw',
      recoveryBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['unwrapKey']
    )
    const encryptedKey = base64ToArrayBuffer(encryptedKeyB64)
    const iv = base64ToArrayBuffer(ivB64)
    return window.crypto.subtle.unwrapKey(
      'raw',
      encryptedKey,
      recoveryKey,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  },

  /**
   * Generate a random 16-byte salt
   * @returns {Uint8Array}
   */
  generateSalt() {
    return window.crypto.getRandomValues(new Uint8Array(16))
  },

  /**
   * Convert salt Uint8Array to base64 for storage
   * @param {Uint8Array} salt
   * @returns {string}
   */
  saltToBase64(salt) {
    return arrayBufferToBase64(salt.buffer)
  },

  /**
   * Convert base64 salt back to Uint8Array
   * @param {string} base64
   * @returns {Uint8Array}
   */
  base64ToSalt(base64) {
    return new Uint8Array(base64ToArrayBuffer(base64))
  },

  /**
   * Format recovery key for display (groups of 4 chars)
   * @param {string} recoveryKeyB64
   * @returns {string}
   */
  formatRecoveryKey(recoveryKeyB64) {
    return recoveryKeyB64.match(/.{1,4}/g)?.join('-') || recoveryKeyB64
  },

  /**
   * Parse a formatted recovery key back to base64
   * @param {string} formatted
   * @returns {string}
   */
  parseRecoveryKey(formatted) {
    return formatted.replace(/-/g, '')
  },
}
