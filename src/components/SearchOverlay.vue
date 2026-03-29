<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotebookStore } from '@/stores/notebooks'
import api from '@/services/api'

const emit = defineEmits(['close'])
const notebookStore = useNotebookStore()
const router = useRouter()

const query = ref('')
const searchInput = ref(null)
const selectedIndex = ref(0)
const results = ref([])
const searching = ref(false)
let debounceTimer = null

onMounted(() => {
  nextTick(() => searchInput.value?.focus())
})

watch(query, (val) => {
  selectedIndex.value = 0
  clearTimeout(debounceTimer)

  const q = val.trim()
  if (q.length < 2) {
    results.value = []
    searching.value = false
    return
  }

  searching.value = true
  debounceTimer = setTimeout(() => performSearch(q), 300)
})

async function performSearch(q) {
  try {
    const { data } = await api.get('/search', { params: { q } })

    const items = []

    for (const nb of (data.notebooks || [])) {
      items.push({
        type: 'notebook',
        id: String(nb.id),
        title: nb.title,
        subtitle: nb.description || `${nb.page_count ?? 0} pages`,
        icon: nb.icon || '📔',
      })
    }

    for (const page of (data.pages || [])) {
      items.push({
        type: 'page',
        id: String(page.id),
        notebookId: String(page.notebook_id),
        title: page.title || 'Untitled',
        subtitle: page.notebook?.title || '',
        icon: '📄',
      })
    }

    results.value = items
  } catch (err) {
    console.error('Search error:', err)
    results.value = []
  } finally {
    searching.value = false
  }
}

function selectResult(result) {
  if (result.type === 'notebook') {
    notebookStore.setActive(result.id)
    router.push(`/notebook/${result.id}`)
  } else if (result.type === 'page') {
    router.push(`/notebook/${result.notebookId}/page/${result.id}`)
  }
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && results.value.length > 0) {
    e.preventDefault()
    selectResult(results.value[selectedIndex.value])
  }
}

function onBackdropClick(e) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="search-backdrop" @click="onBackdropClick" @keydown="onKeydown">
      <div class="search-panel">
        <div class="search-panel__input-row">
          <svg v-if="!searching" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <div v-else class="search-spinner" />
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            class="search-panel__input"
            placeholder="Search notebooks, pages, and tags…"
          />
          <kbd class="search-panel__esc">ESC</kbd>
        </div>

        <div class="search-panel__results" v-if="query.trim().length >= 2">
          <div v-if="searching && results.length === 0" class="search-panel__empty">
            <div class="search-spinner search-spinner--lg" />
            <span>Searching…</span>
          </div>
          <div v-else-if="!searching && results.length === 0" class="search-panel__empty">
            No results for "{{ query }}"
          </div>
          <template v-else>
            <button
              v-for="(result, i) in results"
              :key="`${result.type}-${result.id}`"
              class="search-result"
              :class="{ selected: i === selectedIndex }"
              @click="selectResult(result)"
              @mouseenter="selectedIndex = i"
            >
              <span class="search-result__icon">{{ result.icon }}</span>
              <div class="search-result__info">
                <span class="search-result__title">{{ result.title }}</span>
                <span class="search-result__subtitle">{{ result.subtitle }}</span>
              </div>
              <span class="search-result__type" :class="`search-result__type--${result.type}`">{{ result.type }}</span>
            </button>
          </template>
        </div>

        <div class="search-panel__hints" v-else>
          <span>Type to search your notebooks, pages, and tags</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 100;
  animation: fadeIn 0.1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: slideDown 0.15s ease;
}

.search-panel__input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.search-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

.search-spinner--lg {
  width: 24px;
  height: 24px;
}

.search-panel__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: var(--font-ui);
}

.search-panel__input::placeholder {
  color: var(--text-tertiary);
}

.search-panel__esc {
  font-size: 0.65rem;
  padding: 0.125rem 0.375rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-tertiary);
  font-family: var(--font-ui);
}

.search-panel__results {
  max-height: 360px;
  overflow-y: auto;
  padding: 0.5rem;
}

.search-panel__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
  font-family: var(--font-ui);
}

.search-result:hover,
.search-result.selected {
  background: var(--bg-hover);
}

.search-result__icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.search-result__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-result__title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result__subtitle {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.search-result__type {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: 0.125rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 9999px;
  flex-shrink: 0;
}

.search-result__type--notebook {
  color: var(--accent);
  background: var(--accent-subtle);
}

.search-result__type--page {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.search-panel__hints {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

@media (max-width: 767px) {
  .search-backdrop {
    padding-top: 0;
    align-items: stretch;
  }

  .search-panel {
    max-width: 100%;
    border-radius: 0;
    border: none;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .search-panel__input-row {
    padding: 0.75rem 1rem;
  }

  .search-panel__input {
    font-size: 1.1rem;
  }

  .search-panel__results {
    flex: 1;
    max-height: none;
  }

  .search-result {
    min-height: 44px;
    padding: 0.75rem;
  }
}
</style>
