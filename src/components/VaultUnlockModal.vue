<script setup>
import { ref } from 'vue'
import { useVaultStore } from '@/stores/vault'

const emit = defineEmits(['unlocked', 'close'])
const vaultStore = useVaultStore()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function unlock() {
  if (!password.value) return
  loading.value = true
  error.value = ''
  try {
    const success = await vaultStore.unlock(password.value)
    if (success) {
      emit('unlocked')
    } else {
      error.value = 'Could not unlock vault. Is your encryption set up?'
    }
  } catch (err) {
    error.value = 'Incorrect password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="vault-modal-backdrop">
      <div class="vault-modal">
        <div class="vault-modal__icon">🔐</div>
        <h2 class="vault-modal__title">Unlock Your Notes</h2>
        <p class="vault-modal__desc">
          Enter your password to decrypt your notes. Your encryption key never leaves this device.
        </p>

        <div v-if="error" class="vault-modal__error">
          {{ error }}
        </div>

        <form @submit.prevent="unlock" class="vault-modal__form">
          <input
            v-model="password"
            type="password"
            class="vault-modal__input"
            placeholder="Your password"
            autofocus
          />
          <button
            type="submit"
            class="vault-modal__btn"
            :disabled="!password || loading"
          >
            {{ loading ? 'Unlocking...' : 'Unlock Vault' }}
          </button>
        </form>

        <p class="vault-modal__hint">
          Logged in via magic link? You still need your password to decrypt your encrypted notes.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vault-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.vault-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.vault-modal__icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.vault-modal__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.vault-modal__desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.vault-modal__error {
  padding: 0.625rem 1rem;
  background: rgba(229, 69, 69, 0.1);
  border: 1px solid rgba(229, 69, 69, 0.2);
  border-radius: var(--radius-sm);
  color: #f87171;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.vault-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.vault-modal__input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: var(--font-ui);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.vault-modal__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.vault-modal__btn {
  width: 100%;
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
}

.vault-modal__btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.vault-modal__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vault-modal__hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
}
</style>
