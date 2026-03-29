<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotebookStore } from '@/stores/notebooks'
import { usePageStore } from '@/stores/pages'

const notebookStore = useNotebookStore()
const pageStore = usePageStore()

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 60000)
})

onUnmounted(() => {
  clearInterval(timer)
})

const trashedNotebooks = computed(() => notebookStore.trashedNotebooks)
const trashedPages = computed(() => pageStore.trashedPages)
const hasTrash = computed(() => trashedNotebooks.value.length > 0 || trashedPages.value.length > 0)

const itemToDelete = ref(null) // { type: 'notebook'|'page', id }
const showEmptyConfirm = ref(false)

function timeRemaining(trashedAt) {
  const trashed = new Date(trashedAt).getTime()
  const expiresAt = trashed + 24 * 60 * 60 * 1000
  const remaining = expiresAt - now.value
  if (remaining <= 0) return 'Expired'
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

function restoreNotebook(id) {
  notebookStore.restoreNotebook(id)
}

function restorePage(id) {
  pageStore.restorePage(id)
}

function confirmPermanentDelete(type, id) {
  itemToDelete.value = { type, id }
}

function executePermanentDelete() {
  if (!itemToDelete.value) return
  if (itemToDelete.value.type === 'notebook') {
    notebookStore.deleteNotebook(itemToDelete.value.id)
  } else {
    pageStore.deletePage(itemToDelete.value.id)
  }
  itemToDelete.value = null
}

function emptyAllTrash() {
  notebookStore.emptyTrash()
  pageStore.emptyTrash()
  showEmptyConfirm.value = false
}

function getNotebookTitle(notebookId) {
  const nb = notebookStore.notebooks.find((n) => n.id === notebookId)
  return nb ? nb.title : 'Unknown notebook'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="trash-view">
    <div class="trash-view__header">
      <div>
        <h1 class="trash-view__title">🗑️ Trash</h1>
        <p class="trash-view__subtitle">Items are permanently deleted after 24 hours</p>
      </div>
      <button
        v-if="hasTrash"
        class="trash-view__empty-btn"
        @click="showEmptyConfirm = true"
      >
        Empty Trash
      </button>
    </div>

    <!-- Trashed Notebooks -->
    <div v-if="trashedNotebooks.length" class="trash-view__section">
      <h2 class="trash-view__section-title">Notebooks</h2>
      <div class="trash-list">
        <div v-for="nb in trashedNotebooks" :key="nb.id" class="trash-item">
          <div class="trash-item__info">
            <span class="trash-item__icon">{{ nb.icon }}</span>
            <div class="trash-item__details">
              <span class="trash-item__name">{{ nb.title }}</span>
              <span class="trash-item__meta">
                {{ nb.pageCount }} pages · Deleted {{ formatDate(nb.trashedAt) }}
              </span>
            </div>
          </div>
          <div class="trash-item__countdown">
            {{ timeRemaining(nb.trashedAt) }}
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="restoreNotebook(nb.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Restore
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="confirmPermanentDelete('notebook', nb.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Trashed Pages -->
    <div v-if="trashedPages.length" class="trash-view__section">
      <h2 class="trash-view__section-title">Pages</h2>
      <div class="trash-list">
        <div v-for="page in trashedPages" :key="page.id" class="trash-item">
          <div class="trash-item__info">
            <span class="trash-item__icon">📄</span>
            <div class="trash-item__details">
              <span class="trash-item__name">{{ page.title || 'Untitled' }}</span>
              <span class="trash-item__meta">
                {{ page.wordCount }} words · from {{ getNotebookTitle(page.notebookId) }} · Deleted {{ formatDate(page.trashedAt) }}
              </span>
            </div>
          </div>
          <div class="trash-item__countdown">
            {{ timeRemaining(page.trashedAt) }}
          </div>
          <div class="trash-item__actions">
            <button class="trash-item__btn trash-item__btn--restore" @click="restorePage(page.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Restore
            </button>
            <button class="trash-item__btn trash-item__btn--delete" @click="confirmPermanentDelete('page', page.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!hasTrash" class="trash-view__empty">
      <div class="trash-view__empty-icon">🗑️</div>
      <h3>Trash is empty</h3>
      <p>Deleted notebooks and pages will appear here for 24 hours before permanent deletion</p>
    </div>

    <!-- Permanent delete confirmation -->
    <Teleport to="body">
      <div v-if="itemToDelete" class="confirm-backdrop" @click.self="itemToDelete = null">
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">⚠️</div>
          <h3 class="confirm-dialog__title">Permanently delete?</h3>
          <p class="confirm-dialog__text">This action cannot be undone. The {{ itemToDelete.type }} will be gone forever.</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="itemToDelete = null">Cancel</button>
            <button class="btn btn--danger" @click="executePermanentDelete">Delete Forever</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Empty trash confirmation -->
    <Teleport to="body">
      <div v-if="showEmptyConfirm" class="confirm-backdrop" @click.self="showEmptyConfirm = false">
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">⚠️</div>
          <h3 class="confirm-dialog__title">Empty trash?</h3>
          <p class="confirm-dialog__text">All items in trash will be permanently deleted. This cannot be undone.</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="showEmptyConfirm = false">Cancel</button>
            <button class="btn btn--danger" @click="emptyAllTrash">Empty Trash</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.trash-view {
  max-width: 760px;
  margin: 0 auto;
}

.trash-view__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.trash-view__title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}

.trash-view__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.trash-view__empty-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.trash-view__empty-btn:hover {
  background: rgba(196, 85, 85, 0.1);
}

.trash-view__section {
  margin-bottom: 2rem;
}

.trash-view__section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trash-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.trash-item:hover {
  border-color: var(--text-muted);
}

.trash-item__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.trash-item__icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.trash-item__details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.trash-item__name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
}

.trash-item__meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.trash-item__countdown {
  font-size: 0.75rem;
  color: var(--danger);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.trash-item__actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.trash-item__btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.trash-item__btn--restore {
  color: var(--accent);
  border-color: var(--accent);
}

.trash-item__btn--restore:hover {
  background: var(--accent-subtle);
}

.trash-item__btn--delete {
  color: var(--danger);
  border-color: var(--danger);
}

.trash-item__btn--delete:hover {
  background: rgba(196, 85, 85, 0.1);
}

/* Empty state */
.trash-view__empty {
  text-align: center;
  padding: 4rem 2rem;
}

.trash-view__empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.trash-view__empty h3 {
  font-size: 1.125rem;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.trash-view__empty p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  max-width: 400px;
  margin: 0 auto;
}

/* Confirm dialog */
.confirm-backdrop {
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

.confirm-dialog {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.confirm-dialog__icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.confirm-dialog__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.confirm-dialog__text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
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

.btn--danger {
  background: #e54545;
  color: #fff;
}

.btn--danger:hover {
  background: #d03030;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .trash-view__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .trash-view__title {
    font-size: 1.5rem;
  }

  .trash-view__empty-btn {
    width: 100%;
    text-align: center;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trash-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .trash-item__info {
    width: 100%;
  }

  .trash-item__countdown {
    align-self: flex-start;
  }

  .trash-item__actions {
    width: 100%;
    display: flex;
  }

  .trash-item__btn {
    flex: 1;
    justify-content: center;
    min-height: 40px;
  }

  .confirm-dialog {
    max-width: calc(100vw - 2rem);
    margin: 1rem;
  }

  .btn {
    min-height: 44px;
  }
}
</style>
