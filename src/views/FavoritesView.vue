<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePageStore } from '@/stores/pages'
import api from '@/services/api'

const router = useRouter()
const pageStore = usePageStore()

const favorites = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  await fetchFavorites()
})

async function fetchFavorites() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/favorites')
    favorites.value = (data.pages || []).map(mapFavorite)
  } catch (err) {
    error.value = 'Failed to load favorites.'
    console.error('fetchFavorites error:', err)
  } finally {
    loading.value = false
  }
}

function mapFavorite(p) {
  return {
    id: String(p.id),
    notebookId: String(p.notebook_id),
    title: p.title || 'Untitled',
    notebookTitle: p.notebook?.title || 'Unknown Notebook',
    notebookIcon: p.notebook?.icon || '📔',
    updatedAt: p.updated_at,
    createdAt: p.created_at,
    wordCount: p.word_count || 0,
    isPinned: p.is_pinned || false,
  }
}

function openPage(fav) {
  router.push(`/notebook/${fav.notebookId}/page/${fav.id}`)
}

async function unfavorite(fav) {
  try {
    await pageStore.toggleFavorite(fav.id)
    favorites.value = favorites.value.filter((f) => f.id !== fav.id)
  } catch (err) {
    console.error('unfavorite error:', err)
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
  <div class="favorites">
    <div class="favorites__header">
      <div>
        <h1 class="favorites__title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline; vertical-align: -4px; margin-right: 0.5rem; color: var(--accent)">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Favorites
        </h1>
        <p class="favorites__subtitle" v-if="!loading">{{ favorites.length }} favorited page{{ favorites.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="favorites__loading">
      <div class="spinner" />
      <span>Loading favorites…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="favorites__error">
      <p>{{ error }}</p>
      <button class="btn btn--ghost" @click="fetchFavorites">Try again</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="favorites.length === 0" class="favorites__empty">
      <div class="favorites__empty-icon">⭐</div>
      <h3>No favorites yet</h3>
      <p>Star a page to see it here.</p>
    </div>

    <!-- Favorites grid -->
    <div v-else class="favorites__grid">
      <div
        v-for="fav in favorites"
        :key="fav.id"
        class="fav-card"
        @click="openPage(fav)"
      >
        <div class="fav-card__top">
          <div class="fav-card__notebook">
            <span class="fav-card__notebook-icon">{{ fav.notebookIcon }}</span>
            <span class="fav-card__notebook-title">{{ fav.notebookTitle }}</span>
          </div>
          <button
            class="fav-card__unfav"
            title="Remove from favorites"
            @click.stop="unfavorite(fav)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        </div>
        <h3 class="fav-card__title">{{ fav.title }}</h3>
        <div class="fav-card__meta">
          <span v-if="fav.wordCount">{{ fav.wordCount }} words</span>
          <span>{{ formatDate(fav.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites {
  max-width: 960px;
  margin: 0 auto;
}

.favorites__header {
  margin-bottom: 2rem;
}

.favorites__title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}

.favorites__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.favorites__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 0;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.favorites__error {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-secondary);
}

.favorites__empty {
  text-align: center;
  padding: 6rem 2rem;
}

.favorites__empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.favorites__empty h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.favorites__empty p {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0;
}

.favorites__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.fav-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.fav-card:hover {
  border-color: var(--text-muted);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.fav-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.fav-card__notebook {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.fav-card__notebook-icon {
  font-size: 0.85rem;
}

.fav-card__notebook-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.fav-card__unfav {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  opacity: 0.6;
}

.fav-card:hover .fav-card__unfav {
  opacity: 1;
}

.fav-card__unfav:hover {
  background: var(--bg-hover);
  opacity: 1;
}

.fav-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.btn--ghost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  margin-top: 1rem;
  transition: all var(--transition-fast);
}

.btn--ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .favorites__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .favorites__title {
    font-size: 1.5rem;
  }
}
</style>
