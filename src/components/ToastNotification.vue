<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const toasts = ref([])
let nextId = 0

function addToast(type, message, duration = 4000) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

function handleCustomToast(event) {
  const { type, message } = event.detail
  addToast(type, message)
}

onMounted(() => {
  window.addEventListener('obscribe:toast', handleCustomToast)
})

onUnmounted(() => {
  window.removeEventListener('obscribe:toast', handleCustomToast)
})

// Expose addToast globally
window.__obscribeToast = addToast

defineExpose({ addToast })
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
        >
          <span class="toast__icon">
            {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }}
          </span>
          <span class="toast__message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  left: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  max-width: 360px;
}

.toast--success {
  background: #1a3a2a;
  color: #6ee7a8;
  border: 1px solid rgba(110, 231, 168, 0.2);
}

.toast--error {
  background: #3a1a1a;
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.toast--info {
  background: #1a2a3a;
  color: #93c5fd;
  border: 1px solid rgba(147, 197, 253, 0.2);
}

.toast__icon {
  font-weight: 700;
  font-size: 0.8rem;
}

.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

@media (max-width: 767px) {
  .toast-container {
    left: 0.75rem;
    right: 0.75rem;
    align-items: stretch;
  }

  .toast {
    max-width: 100%;
  }
}
</style>
