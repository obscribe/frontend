<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useNotebookStore } from '@/stores/notebooks'
import { useRouter } from 'vue-router'

const props = defineProps({
  notebook: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])
const notebookStore = useNotebookStore()
const router = useRouter()

const isEditing = computed(() => !!props.notebook)

const title = ref(props.notebook?.title || '')
const description = ref(props.notebook?.description || '')
const selectedIcon = ref(props.notebook?.icon || null)
const selectedColor = ref(props.notebook?.color || null)
const titleInput = ref(null)
const saving = ref(false)

onMounted(() => {
  nextTick(() => titleInput.value?.focus())
})

async function save() {
  if (!title.value.trim() || saving.value) return
  saving.value = true
  try {
    if (isEditing.value) {
      await notebookStore.updateNotebook(props.notebook.id, {
        title: title.value.trim(),
        description: description.value.trim(),
        icon: selectedIcon.value,
        color: selectedColor.value,
      })
      emit('close')
    } else {
      const notebook = await notebookStore.createNotebook({
        title: title.value.trim(),
        description: description.value.trim(),
        icon: selectedIcon.value,
        color: selectedColor.value,
      })
      emit('close')
      notebookStore.setActive(notebook.id)
      router.push(`/notebook/${notebook.id}`)
    }
  } catch (err) {
    console.error('Failed to save notebook:', err)
  } finally {
    saving.value = false
  }
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click="onBackdropClick" @keydown="onKeydown">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">{{ isEditing ? 'Edit Notebook' : 'New Notebook' }}</h2>
          <button class="modal__close" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="modal__body">
          <div class="field">
            <label class="field__label">Name</label>
            <input
              ref="titleInput"
              v-model="title"
              type="text"
              class="field__input"
              placeholder="e.g. Work Notes, Personal Journal…"
              maxlength="60"
              @keydown.enter.prevent="save"
            />
          </div>

          <div class="field">
            <label class="field__label">Description <span class="field__optional">(optional)</span></label>
            <input
              v-model="description"
              type="text"
              class="field__input"
              placeholder="A short description…"
              maxlength="120"
            />
          </div>

          <div class="field">
            <label class="field__label">Icon</label>
            <div class="icon-grid">
              <button
                v-for="icon in notebookStore.ICON_OPTIONS"
                :key="icon"
                class="icon-btn"
                :class="{ active: selectedIcon === icon }"
                @click="selectedIcon = selectedIcon === icon ? null : icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field__label">Color</label>
            <div class="color-grid">
              <button
                v-for="color in notebookStore.COLOR_OPTIONS"
                :key="color"
                class="color-btn"
                :class="{ active: selectedColor === color }"
                :style="{ background: color }"
                @click="selectedColor = selectedColor === color ? null : color"
              >
                <svg v-if="selectedColor === color" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="modal__footer">
          <button class="btn btn--ghost" @click="$emit('close')">Cancel</button>
          <button class="btn btn--primary" :disabled="!title.trim() || saving" @click="save">
            {{ saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Create Notebook') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.modal__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

.modal__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  transition: all var(--transition-fast);
}

.modal__close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.modal__body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__optional {
  font-weight: 400;
  text-transform: none;
  color: var(--text-tertiary);
  letter-spacing: 0;
}

.field__input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
  outline: none;
  box-sizing: border-box;
}

.field__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.field__input::placeholder {
  color: var(--text-tertiary);
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.icon-btn.active {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.color-grid {
  display: flex;
  gap: 0.5rem;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.color-btn:hover {
  transform: scale(1.15);
}

.color-btn.active {
  border-color: var(--text-primary);
  transform: scale(1.15);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.btn {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-ui);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn--ghost {
  background: none;
  color: var(--text-secondary);
}

.btn--ghost:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.btn--primary {
  background: var(--accent);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .modal {
    max-width: calc(100vw - 2rem);
    margin: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }

  .modal__body {
    padding: 1.25rem;
  }

  .modal__header {
    padding: 1rem 1.25rem;
  }

  .modal__footer {
    padding: 0.75rem 1.25rem;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
  }

  .color-btn {
    width: 40px;
    height: 40px;
  }

  .field__input {
    min-height: 44px;
  }

  .btn {
    min-height: 44px;
  }
}
</style>
