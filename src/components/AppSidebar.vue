<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useNotebookStore } from '@/stores/notebooks'
import { usePageStore } from '@/stores/pages'
import { useAuthStore } from '@/stores/auth'
import NewNotebookModal from '@/components/NewNotebookModal.vue'

const router = useRouter()
const route = useRoute()
const { isOpen, isMobile, toggle, closeIfMobile } = useSidebar()
const notebookStore = useNotebookStore()
const pageStore = usePageStore()
const authStore = useAuthStore()
const showNewModal = ref(false)

const trashCount = computed(() =>
  notebookStore.trashedNotebooks.length + pageStore.trashedPages.length
)

function goToNotebook(id) {
  notebookStore.setActive(id)
  router.push(`/notebook/${id}`)
  closeIfMobile()
}

function goToDashboard() {
  router.push('/')
  closeIfMobile()
}

function goToTrash() {
  router.push('/trash')
  closeIfMobile()
}

function isActiveNotebook(id) {
  return route.params.id === id || route.params.notebookId === id
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': isOpen }">
    <div class="sidebar__header">
      <button class="sidebar__brand" @click="goToDashboard">
        <span class="sidebar__logo">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15" />
            <text x="20" y="28" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="var(--accent)" text-anchor="middle">O</text>
          </svg>
        </span>
        <span class="sidebar__brand-text">Obscribe</span>
      </button>
      <button class="sidebar__collapse" @click="toggle" title="Toggle sidebar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 19l-7-7 7-7" />
          <path d="M18 19l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <nav class="sidebar__nav">
      <button
        class="sidebar__nav-item"
        :class="{ active: route.path === '/' }"
        @click="goToDashboard"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>All Notebooks</span>
      </button>

      <button
        class="sidebar__nav-item"
        :class="{ active: route.path === '/favorites' }"
        @click="router.push('/favorites'); closeIfMobile()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>Favorites</span>
      </button>

      <button
        class="sidebar__nav-item"
        :class="{ active: route.path === '/trash' }"
        @click="goToTrash"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>Trash</span>
        <span v-if="trashCount" class="sidebar__badge">{{ trashCount }}</span>
      </button>
    </nav>

    <div class="sidebar__section">
      <div class="sidebar__section-header">
        <span>Notebooks</span>
        <button class="sidebar__add-btn" title="New notebook" @click="showNewModal = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div class="sidebar__notebooks">
        <button
          v-for="notebook in notebookStore.activeNotebooks"
          :key="notebook.id"
          class="sidebar__notebook"
          :class="{ active: isActiveNotebook(notebook.id) }"
          @click="goToNotebook(notebook.id)"
        >
          <span class="sidebar__notebook-icon">{{ notebook.icon }}</span>
          <div class="sidebar__notebook-info">
            <span class="sidebar__notebook-title">
              <span v-if="notebook.isFavorited" class="sidebar__notebook-star">★</span>
              {{ notebook.title }}
            </span>
            <span class="sidebar__notebook-count">{{ notebook.pageCount }} pages</span>
          </div>
        </button>
      </div>
    </div>

    <NewNotebookModal v-if="showNewModal" @close="showNewModal = false" />

    <div class="sidebar__bottom-nav">
      <button
        class="sidebar__nav-item"
        :class="{ active: route.path === '/settings' }"
        @click="router.push('/settings'); closeIfMobile()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Settings</span>
      </button>
    </div>

    <div class="sidebar__footer">
      <div class="sidebar__user" v-if="authStore.user">
        <div class="sidebar__user-avatar">{{ authStore.userName.charAt(0).toUpperCase() }}</div>
        <span class="sidebar__user-name">{{ authStore.userName }}</span>
      </div>
      <button class="sidebar__nav-item" @click="authStore.logout()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Sign out</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--sidebar-bg, var(--bg-secondary));
  border-right: 1px solid var(--sidebar-border, var(--border));
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transform: translateX(-100%);
  transition: transform var(--transition-normal);
  position: fixed;
  left: 0;
  top: 0;
  z-index: 30;
}

.sidebar--open {
  transform: translateX(0);
}

.sidebar--open ~ .app-layout__main {
  margin-left: var(--sidebar-width);
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: opacity var(--transition-fast);
}

.sidebar__brand:hover {
  opacity: 0.8;
}

.sidebar__brand-text {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.sidebar__collapse {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.sidebar__collapse:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.sidebar__nav {
  padding: 0.75rem 0.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.sidebar__nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar__nav-item.active {
  background: var(--accent-subtle);
  color: var(--accent-text);
}

.sidebar__badge {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  padding: 0.125rem 0.4rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.sidebar__section {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.sidebar__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.sidebar__add-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.sidebar__add-btn:hover {
  color: var(--accent);
  background: var(--accent-subtle);
}

.sidebar__notebooks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__notebook {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
}

.sidebar__notebook:hover {
  background: var(--bg-hover);
}

.sidebar__notebook.active {
  background: var(--accent-subtle);
}

.sidebar__notebook-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.sidebar__notebook-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar__notebook-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sidebar__notebook-star {
  color: #e6a817;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.sidebar__notebook-count {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.sidebar__bottom-nav {
  padding: 0.5rem 0.75rem 0;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
}

.sidebar__user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar__user-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .sidebar {
    width: 280px;
    box-shadow: var(--shadow-lg);
  }

  .sidebar__nav-item {
    min-height: 44px;
    padding: 0.625rem 0.75rem;
  }

  .sidebar__notebook {
    min-height: 44px;
  }

  .sidebar__add-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .sidebar__collapse {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
