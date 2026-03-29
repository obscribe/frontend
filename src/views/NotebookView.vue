<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotebookStore } from '@/stores/notebooks'
import { usePageStore } from '@/stores/pages'
import { formatRelativeDate } from '@/utils/formatDate'

const route = useRoute()
const router = useRouter()
const notebookStore = useNotebookStore()
const pageStore = usePageStore()

const notebookId = computed(() => route.params.id)

// Fetch pages when entering notebook
onMounted(() => {
  if (notebookId.value) {
    pageStore.fetchPages(notebookId.value)
    // Ensure notebooks are loaded
    if (!notebookStore.notebooks.length) {
      notebookStore.fetchNotebooks()
    }
  }
})

watch(notebookId, (newId) => {
  if (newId) pageStore.fetchPages(newId)
})
const notebook = computed(() =>
  notebookStore.notebooks.find((n) => n.id === notebookId.value)
)
const pages = computed(() => pageStore.getByNotebook(notebookId.value))
const pinnedPages = computed(() => pages.value.filter((p) => p.isPinned))
const otherPages = computed(() => pages.value.filter((p) => !p.isPinned))

const showDeleteNotebook = ref(false)
const pageToDelete = ref(null)
const showEditModal = ref(false)

// Edit notebook state
const editTitle = ref('')
const editDescription = ref('')
const editIcon = ref(null)
const editColor = ref(null)

function openEditModal() {
  editTitle.value = notebook.value?.title || ''
  editDescription.value = notebook.value?.description || ''
  editIcon.value = notebook.value?.icon || null
  editColor.value = notebook.value?.color || null
  showEditModal.value = true
}

async function saveNotebookEdit() {
  if (!editTitle.value.trim()) return
  try {
    await notebookStore.updateNotebook(notebookId.value, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
      icon: editIcon.value,
      color: editColor.value,
    })
    showEditModal.value = false
  } catch (err) {
    console.error('Failed to update notebook:', err)
  }
}

function openPage(pageId) {
  pageStore.setActive(pageId)
  router.push(`/notebook/${notebookId.value}/page/${pageId}`)
}

async function createNewPage() {
  try {
    const page = await pageStore.createPage(notebookId.value, { title: '' })
    router.push(`/notebook/${notebookId.value}/page/${page.id}`)
  } catch (err) {
    console.error('Failed to create page:', err)
  }
}

async function confirmDeleteNotebook() {
  try {
    await notebookStore.trashNotebook(notebookId.value)
    router.push('/')
  } catch (err) {
    console.error('Failed to delete notebook:', err)
  }
}

async function confirmDeletePage() {
  if (pageToDelete.value) {
    try {
      await pageStore.trashPage(pageToDelete.value)
    } catch (err) {
      console.error('Failed to delete page:', err)
    }
    pageToDelete.value = null
  }
}

function formatDate(dateStr) {
  return formatRelativeDate(dateStr)
}
</script>

<template>
  <div class="notebook-view" v-if="notebook">
    <div class="notebook-view__header">
      <button class="notebook-view__back" @click="router.push('/')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div class="notebook-view__info" @click="openEditModal" title="Click to edit notebook">
        <div class="notebook-view__title-row">
          <span class="notebook-view__icon">{{ notebook.icon }}</span>
          <h1 class="notebook-view__title">{{ notebook.title }}</h1>
          <svg class="notebook-view__edit-hint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <p class="notebook-view__desc">{{ notebook.description }}</p>
      </div>
      <div class="notebook-view__actions">
        <button class="notebook-view__new-page" @click="createNewPage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Page
        </button>
        <button class="notebook-view__delete-btn" @click="showDeleteNotebook = true" title="Delete notebook">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="pinnedPages.length" class="notebook-view__section">
      <h2 class="notebook-view__section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
        Pinned
      </h2>
      <div class="page-list">
        <div
          v-for="page in pinnedPages"
          :key="page.id"
          class="page-card"
          @click="openPage(page.id)"
        >
          <div class="page-card__header">
            <h3 class="page-card__title">
              <span v-if="page.isFavorited" class="page-card__star">★</span>
              {{ page.title || 'Untitled' }}
            </h3>
            <div class="page-card__actions">
              <button
                class="page-card__action-btn"
                :class="{ 'page-card__action-btn--active': page.isFavorited }"
                @click.stop="pageStore.toggleFavorite(page.id)"
                :title="page.isFavorited ? 'Unfavorite' : 'Favorite'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" :fill="page.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                class="page-card__action-btn page-card__action-btn--active"
                @click.stop="pageStore.togglePin(page.id)"
                title="Unpin"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </button>
              <button class="page-card__action-btn page-card__action-btn--danger" @click.stop="pageToDelete = page.id" title="Delete page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <p class="page-card__preview">{{ page.preview }}</p>
          <div class="page-card__meta">
            <span>{{ page.wordCount }} words</span>
            <span>{{ formatDate(page.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="notebook-view__section">
      <h2 v-if="pinnedPages.length" class="notebook-view__section-title">All Pages</h2>
      <div class="page-list">
        <div
          v-for="page in otherPages"
          :key="page.id"
          class="page-card"
          @click="openPage(page.id)"
        >
          <div class="page-card__header">
            <h3 class="page-card__title">
              <span v-if="page.isFavorited" class="page-card__star">★</span>
              {{ page.title || 'Untitled' }}
            </h3>
            <div class="page-card__actions">
              <button
                class="page-card__action-btn"
                :class="{ 'page-card__action-btn--active': page.isFavorited }"
                @click.stop="pageStore.toggleFavorite(page.id)"
                :title="page.isFavorited ? 'Unfavorite' : 'Favorite'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" :fill="page.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                class="page-card__action-btn"
                :class="{ 'page-card__action-btn--active': page.isPinned }"
                @click.stop="pageStore.togglePin(page.id)"
                :title="page.isPinned ? 'Unpin' : 'Pin'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" :fill="page.isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </button>
              <button class="page-card__action-btn page-card__action-btn--danger" @click.stop="pageToDelete = page.id" title="Delete page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <p class="page-card__preview">{{ page.preview }}</p>
          <div class="page-card__meta">
            <span>{{ page.wordCount }} words</span>
            <span>{{ formatDate(page.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pages.length === 0" class="notebook-view__empty">
      <div class="notebook-view__empty-icon">✍️</div>
      <h3>No pages yet</h3>
      <p>Create your first page to start writing</p>
      <button class="notebook-view__new-page" @click="createNewPage">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Page
      </button>
    </div>

    <!-- Edit Notebook Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="confirm-backdrop" @click.self="showEditModal = false">
        <div class="edit-modal">
          <div class="edit-modal__header">
            <h2 class="edit-modal__title">Edit Notebook</h2>
            <button class="edit-modal__close" @click="showEditModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="edit-modal__body">
            <div class="edit-field">
              <label class="edit-field__label">Name</label>
              <input v-model="editTitle" type="text" class="edit-field__input" placeholder="Notebook name" maxlength="60" />
            </div>
            <div class="edit-field">
              <label class="edit-field__label">Description</label>
              <input v-model="editDescription" type="text" class="edit-field__input" placeholder="A short description…" maxlength="120" />
            </div>
            <div class="edit-field">
              <label class="edit-field__label">Icon</label>
              <div class="icon-grid">
                <button
                  v-for="icon in notebookStore.ICON_OPTIONS"
                  :key="icon"
                  class="icon-btn"
                  :class="{ active: editIcon === icon }"
                  @click="editIcon = editIcon === icon ? null : icon"
                >{{ icon }}</button>
              </div>
            </div>
            <div class="edit-field">
              <label class="edit-field__label">Color</label>
              <div class="color-grid">
                <button
                  v-for="color in notebookStore.COLOR_OPTIONS"
                  :key="color"
                  class="color-btn"
                  :class="{ active: editColor === color }"
                  :style="{ background: color }"
                  @click="editColor = editColor === color ? null : color"
                >
                  <svg v-if="editColor === color" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="edit-modal__footer">
            <button class="btn btn--ghost" @click="showEditModal = false">Cancel</button>
            <button class="btn btn--primary" :disabled="!editTitle.trim()" @click="saveNotebookEdit">Save Changes</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Notebook Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteNotebook" class="confirm-backdrop" @click.self="showDeleteNotebook = false">
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">🗑️</div>
          <h3 class="confirm-dialog__title">Delete "{{ notebook.title }}"?</h3>
          <p class="confirm-dialog__text">This notebook and all its pages will be moved to trash and permanently deleted after 24 hours.</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="showDeleteNotebook = false">Cancel</button>
            <button class="btn btn--danger" @click="confirmDeleteNotebook">Delete Notebook</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Page Confirmation -->
    <Teleport to="body">
      <div v-if="pageToDelete" class="confirm-backdrop" @click.self="pageToDelete = null">
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">🗑️</div>
          <h3 class="confirm-dialog__title">Delete this page?</h3>
          <p class="confirm-dialog__text">This page will be moved to trash and permanently deleted after 24 hours.</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="pageToDelete = null">Cancel</button>
            <button class="btn btn--danger" @click="confirmDeletePage">Delete Page</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.notebook-view {
  max-width: 760px;
  margin: 0 auto;
}

.notebook-view__header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.notebook-view__back {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  margin-top: 0.25rem;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.notebook-view__back:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.notebook-view__info {
  flex: 1;
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: 0.375rem 0.5rem;
  margin: -0.375rem -0.5rem;
  transition: background var(--transition-fast);
}

.notebook-view__info:hover {
  background: var(--bg-hover);
}

.notebook-view__edit-hint {
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.notebook-view__info:hover .notebook-view__edit-hint {
  opacity: 1;
}

.notebook-view__title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notebook-view__icon {
  font-size: 1.75rem;
}

.notebook-view__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0;
}

.notebook-view__desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.375rem 0 0 2.5rem;
}

.notebook-view__new-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.notebook-view__new-page:hover {
  background: var(--accent-hover);
}

.notebook-view__section {
  margin-bottom: 2rem;
}

.notebook-view__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 1.25rem 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-ui);
}

.page-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-tertiary);
}

.page-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.page-card__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.page-card__star {
  color: var(--accent);
  font-size: 0.875rem;
}

.page-card__preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.page-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.notebook-view__empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.notebook-view__empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.notebook-view__empty h3 {
  font-size: 1.125rem;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.notebook-view__empty p {
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
}

/* Actions row */
.notebook-view__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.notebook-view__delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.notebook-view__delete-btn:hover {
  color: #e54545;
  border-color: #e54545;
  background: rgba(229, 69, 69, 0.08);
}

/* Page card actions */
.page-card__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.page-card:hover .page-card__actions {
  opacity: 1;
}

.page-card__action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.page-card__action-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.page-card__action-btn--active {
  color: var(--accent) !important;
}

.page-card__action-btn--danger:hover {
  color: #e54545 !important;
  background: rgba(229, 69, 69, 0.08);
}

/* Edit Modal */
.edit-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

.edit-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.edit-modal__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

.edit-modal__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  transition: all var(--transition-fast);
}

.edit-modal__close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.edit-modal__body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.edit-field__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.edit-field__input {
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

.edit-field__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
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

/* Shared button styles */
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

.btn--danger {
  background: #e54545;
  color: #fff;
}

.btn--danger:hover {
  background: #d03030;
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

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .notebook-view__header {
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .notebook-view__info {
    flex: 1 1 100%;
    order: 2;
  }

  .notebook-view__back {
    order: 1;
    min-width: 44px;
    min-height: 44px;
  }

  .notebook-view__actions {
    order: 1;
    margin-left: auto;
  }

  .notebook-view__title {
    font-size: 1.25rem;
  }

  .notebook-view__desc {
    margin-left: 0;
  }

  .notebook-view__new-page {
    min-height: 44px;
  }

  .notebook-view__delete-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .page-card {
    padding: 1rem;
  }

  /* Always show actions on mobile (no hover) */
  .page-card__actions {
    opacity: 1;
  }

  .page-card__action-btn {
    min-width: 44px;
    min-height: 44px;
  }

  /* Modals full-width on mobile */
  .confirm-dialog {
    max-width: calc(100vw - 2rem);
    margin: 1rem;
  }

  .edit-modal {
    max-width: calc(100vw - 2rem);
    margin: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }

  .icon-grid {
    gap: 0.25rem;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
