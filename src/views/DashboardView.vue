<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotebookStore } from '@/stores/notebooks'
import NewNotebookModal from '@/components/NewNotebookModal.vue'

const router = useRouter()
const notebookStore = useNotebookStore()
const showNewModal = ref(false)
const editingNotebook = ref(null)
const openMenuId = ref(null)
const showDeleteConfirm = ref(null)
const deleting = ref(false)
const loading = ref(true)

// Sort: favorited first, then by updated_at desc
const sortedNotebooks = computed(() => {
  return [...notebookStore.activeNotebooks].sort((a, b) => {
    if (a.isFavorited !== b.isFavorited) return b.isFavorited ? 1 : -1
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })
})

onMounted(async () => {
  await notebookStore.fetchNotebooks()
  loading.value = false
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

function closeMenu() {
  openMenuId.value = null
}

function toggleMenu(e, notebookId) {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === notebookId ? null : notebookId
}

function openNotebook(id) {
  notebookStore.setActive(id)
  router.push(`/notebook/${id}`)
}

function startEdit(e, notebook) {
  e.stopPropagation()
  openMenuId.value = null
  editingNotebook.value = { ...notebook }
  showNewModal.value = true
}

function startDelete(e, notebook) {
  e.stopPropagation()
  openMenuId.value = null
  showDeleteConfirm.value = notebook
}

async function confirmDelete() {
  if (!showDeleteConfirm.value || deleting.value) return
  deleting.value = true
  try {
    await notebookStore.trashNotebook(showDeleteConfirm.value.id)
    showDeleteConfirm.value = null
  } catch (err) {
    console.error('Delete notebook error:', err)
  } finally {
    deleting.value = false
  }
}

function closeModal() {
  showNewModal.value = false
  editingNotebook.value = null
}

async function toggleFavorite(e, notebook) {
  e.stopPropagation()
  try {
    await notebookStore.toggleFavoriteNotebook(notebook.id)
  } catch (err) {
    console.error('Toggle favorite error:', err)
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
  if (diffHours < 48) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="dashboard">
    <!-- Loading skeleton -->
    <div v-if="loading" class="dashboard__loading">
      <div class="dashboard__header">
        <div>
          <h1 class="dashboard__title">Your Notebooks</h1>
          <p class="dashboard__subtitle">Loading...</p>
        </div>
      </div>
      <div class="dashboard__grid">
        <div v-for="i in 3" :key="i" class="notebook-skeleton">
          <div class="notebook-skeleton__accent"></div>
          <div class="notebook-skeleton__content">
            <div class="notebook-skeleton__icon"></div>
            <div class="notebook-skeleton__title"></div>
            <div class="notebook-skeleton__desc"></div>
            <div class="notebook-skeleton__meta"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="!loading" class="dashboard__header">
      <div>
        <h1 class="dashboard__title">Your Notebooks</h1>
        <p class="dashboard__subtitle">{{ notebookStore.activeNotebooks.length }} notebooks</p>
      </div>
      <button class="dashboard__new-btn" @click="showNewModal = true; editingNotebook = null">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Notebook
      </button>
    </div>

    <div class="dashboard__grid">
      <div
        v-for="notebook in sortedNotebooks"
        :key="notebook.id"
        class="notebook-card"
        @click="openNotebook(notebook.id)"
      >
        <div class="notebook-card__accent" :style="{ background: notebook.color }" />
        <div class="notebook-card__content">
          <div class="notebook-card__top-row">
            <div class="notebook-card__icon">{{ notebook.icon }}</div>
            <div class="notebook-card__actions">
              <button
                class="notebook-card__fav-btn"
                :class="{ 'notebook-card__fav-btn--active': notebook.isFavorited }"
                @click="toggleFavorite($event, notebook)"
                :title="notebook.isFavorited ? 'Unfavorite' : 'Favorite'"
              >
                <svg v-if="notebook.isFavorited" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            <div class="notebook-card__menu-wrapper">
              <button
                class="notebook-card__menu-btn"
                @click="toggleMenu($event, notebook.id)"
                title="Notebook options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              <Transition name="menu-fade">
                <div
                  v-if="openMenuId === notebook.id"
                  class="notebook-card__dropdown"
                  @click.stop
                >
                  <button class="dropdown-item" @click="toggleFavorite($event, notebook)">
                    <svg width="14" height="14" viewBox="0 0 24 24" :fill="notebook.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {{ notebook.isFavorited ? 'Unfavorite' : 'Favorite' }}
                  </button>
                  <button class="dropdown-item" @click="startEdit($event, notebook)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button class="dropdown-item dropdown-item--danger" @click="startDelete($event, notebook)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </Transition>
            </div>
            </div>
          </div>
          <h3 class="notebook-card__title">{{ notebook.title }}</h3>
          <p class="notebook-card__desc">{{ notebook.description }}</p>
          <div class="notebook-card__meta">
            <span>{{ notebook.pageCount }} pages</span>
            <span>{{ formatDate(notebook.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <button class="notebook-card notebook-card--new" @click="showNewModal = true; editingNotebook = null">
        <div class="notebook-card__content">
          <div class="notebook-card__new-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <h3 class="notebook-card__title" style="color: var(--text-tertiary)">New Notebook</h3>
        </div>
      </button>
    </div>

    <NewNotebookModal
      v-if="showNewModal"
      :notebook="editingNotebook"
      @close="closeModal"
    />

    <!-- Delete Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="confirm-backdrop" @click.self="showDeleteConfirm = null">
        <div class="confirm-dialog">
          <h3 class="confirm-dialog__title">Delete Notebook</h3>
          <p class="confirm-dialog__text">
            Are you sure you want to delete <strong>{{ showDeleteConfirm.title }}</strong>?
            It will be moved to trash and can be restored later.
          </p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="showDeleteConfirm = null" :disabled="deleting">Cancel</button>
            <button class="btn btn--danger" @click="confirmDelete" :disabled="deleting">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 960px;
  margin: 0 auto;
}

.dashboard__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.dashboard__title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}

.dashboard__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.dashboard__new-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dashboard__new-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.notebook-card {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-normal);
  font-family: var(--font-ui);
}

.notebook-card:hover {
  border-color: var(--text-muted);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.notebook-card__accent {
  height: 4px;
  width: 100%;
}

.notebook-card__content {
  padding: 1.5rem;
}

.notebook-card__top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.notebook-card__icon {
  font-size: 2rem;
}

.notebook-card__actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.notebook-card__fav-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  opacity: 0;
}

.notebook-card__fav-btn--active {
  color: #e6a817;
  opacity: 1;
}

.notebook-card:hover .notebook-card__fav-btn {
  opacity: 1;
}

.notebook-card__fav-btn:hover {
  background: var(--bg-hover);
  color: #e6a817;
  transform: scale(1.1);
}

.notebook-card__menu-wrapper {
  position: relative;
}

.notebook-card__menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  opacity: 0;
}

.notebook-card:hover .notebook-card__menu-btn {
  opacity: 1;
}

.notebook-card__menu-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.notebook-card__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  min-width: 140px;
  z-index: 20;
  padding: 0.375rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-family: var(--font-ui);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dropdown-item--danger:hover {
  background: rgba(220, 60, 60, 0.1);
  color: #dc3c3c;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.notebook-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
  color: var(--text-primary);
}

.notebook-card__desc {
  font-size: 0.825rem;
  color: var(--text-secondary);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.notebook-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* New notebook card */
.notebook-card--new {
  border-style: dashed;
  border-color: var(--border);
}

.notebook-card--new:hover {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.notebook-card--new .notebook-card__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 0.5rem;
}

.notebook-card__new-icon {
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.notebook-card--new:hover .notebook-card__new-icon {
  color: var(--accent);
}

/* Delete Confirmation Dialog */
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
  padding: 1.5rem;
  max-width: 400px;
  width: calc(100% - 2rem);
  box-shadow: var(--shadow-lg);
}

.confirm-dialog__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.confirm-dialog__text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
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
  background: #dc3c3c;
  color: #fff;
}

.btn--danger:hover:not(:disabled) {
  background: #c43232;
}

.btn--danger:disabled,
.btn--ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .dashboard__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .dashboard__new-btn {
    width: 100%;
    justify-content: center;
    min-height: 44px;
  }

  .dashboard__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .dashboard__title {
    font-size: 1.5rem;
  }

  /* Always show menu button and fav button on mobile */
  .notebook-card__menu-btn,
  .notebook-card__fav-btn {
    opacity: 1;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .dashboard__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Loading skeleton */
.notebook-skeleton {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.notebook-skeleton__accent {
  height: 4px;
  background: var(--bg-hover);
}

.notebook-skeleton__content {
  padding: 1.5rem;
}

.notebook-skeleton__icon,
.notebook-skeleton__title,
.notebook-skeleton__desc,
.notebook-skeleton__meta {
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s ease-in-out infinite;
}

.notebook-skeleton__icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

.notebook-skeleton__title {
  height: 1.1rem;
  width: 70%;
  margin-bottom: 0.5rem;
}

.notebook-skeleton__desc {
  height: 0.85rem;
  width: 90%;
  margin-bottom: 1.25rem;
}

.notebook-skeleton__meta {
  height: 0.75rem;
  width: 50%;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
</style>
