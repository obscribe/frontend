<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import SearchOverlay from '@/components/SearchOverlay.vue'

const router = useRouter()

const { isOpen, isMobile, toggle: toggleSidebar } = useSidebar()
const { theme, toggleTheme } = useTheme()
const searchQuery = ref('')
const searchFocused = ref(false)
const showSearch = ref(false)

function openSearch() {
  showSearch.value = true
}

function handleKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button
        v-if="!isOpen || isMobile"
        class="topbar__menu-btn"
        @click="toggleSidebar"
        title="Open sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>

    <div class="topbar__center">
      <button class="topbar__search" @click="openSearch">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span class="topbar__search-placeholder">Search notes…</span>
        <kbd class="topbar__shortcut">⌘K</kbd>
      </button>
    </div>

    <SearchOverlay v-if="showSearch" @close="showSearch = false" />

    <div class="topbar__right">
      <button class="topbar__icon-btn" @click="toggleTheme" :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`">
        <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      <button class="topbar__icon-btn" title="Settings" @click="router.push('/settings')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  flex-shrink: 0;
  gap: 1rem;
}

.topbar__left {
  display: flex;
  align-items: center;
  min-width: 40px;
}

.topbar__menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.topbar__menu-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.topbar__center {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
}

.topbar__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  cursor: pointer;
  width: 100%;
  font-family: var(--font-ui);
}

.topbar__search:hover {
  border-color: var(--text-muted);
  background: var(--bg-hover);
}

.topbar__search-placeholder {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.topbar__shortcut {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-tertiary);
  font-family: var(--font-ui);
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.topbar__icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.topbar__icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .topbar {
    padding: 0 0.75rem;
    gap: 0.5rem;
  }

  .topbar__center {
    flex: 0 0 auto;
    max-width: none;
    margin: 0;
  }

  /* Collapse search to icon-only */
  .topbar__search {
    width: auto;
    padding: 0.5rem;
    border: none;
    background: none;
  }

  .topbar__search-placeholder,
  .topbar__shortcut {
    display: none;
  }

  .topbar__menu-btn,
  .topbar__icon-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .topbar__right {
    gap: 0;
  }
}
</style>
