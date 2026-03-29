import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

const ICON_OPTIONS = ['📔', '📓', '📕', '📗', '📘', '📙', '💼', '📚', '💡', '🔬', '🎨', '✏️', '🗂️', '🧪', '📝', '🎯', '🏗️', '🌱', '⚡', '🔒']
const COLOR_OPTIONS = ['#5b9a8b', '#c9a94e', '#8b6bb5', '#c47a5a', '#5b7fc9', '#c45a7a', '#6bb58b', '#b5846b', '#7a8bc4', '#9a5b8b']

export const useNotebookStore = defineStore('notebooks', () => {
  const notebooks = ref([])
  const activeNotebookId = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const activeNotebook = computed(() =>
    notebooks.value.find((n) => n.id === activeNotebookId.value)
  )

  const activeNotebooks = computed(() =>
    notebooks.value.filter((n) => !n.trashedAt)
  )

  const trashedNotebooks = computed(() =>
    notebooks.value.filter((n) => n.trashedAt)
  )

  function setActive(id) {
    activeNotebookId.value = id
  }

  // Map API response to frontend format
  function mapNotebook(n) {
    return {
      id: String(n.id),
      title: n.title,
      description: n.description || '',
      icon: n.icon || '📔',
      color: n.color || '#5b9a8b',
      type: n.type,
      pageCount: n.page_count ?? 0,
      updatedAt: n.updated_at,
      createdAt: n.created_at,
      trashedAt: n.trashed_at || null,
      isArchived: n.is_archived,
      isLocked: n.is_locked,
      isFavorited: n.is_favorited ?? false,
    }
  }

  async function fetchNotebooks() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/notebooks')
      notebooks.value = (data.notebooks || []).map(mapNotebook)
    } catch (err) {
      error.value = 'Failed to load notebooks.'
      console.error('fetchNotebooks error:', err)
    } finally {
      loading.value = false
    }
  }

  async function createNotebook({ title, description = '', icon = null, color = null }) {
    try {
      const { data } = await api.post('/notebooks', {
        title: title || 'Untitled Notebook',
        description,
        icon: icon || ICON_OPTIONS[Math.floor(Math.random() * ICON_OPTIONS.length)],
        color: color || COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)],
      })
      const notebook = mapNotebook(data.notebook)
      notebooks.value.unshift(notebook)
      return notebook
    } catch (err) {
      console.error('createNotebook error:', err)
      throw err
    }
  }

  async function updateNotebook(id, updates) {
    try {
      const { data } = await api.patch(`/notebooks/${id}`, updates)
      const idx = notebooks.value.findIndex((n) => n.id === String(id))
      if (idx !== -1) {
        notebooks.value[idx] = mapNotebook(data.notebook)
      }
    } catch (err) {
      console.error('updateNotebook error:', err)
      throw err
    }
  }

  async function trashNotebook(id) {
    try {
      await api.delete(`/notebooks/${id}`)
      notebooks.value = notebooks.value.filter((n) => n.id !== String(id))
      if (activeNotebookId.value === String(id)) {
        activeNotebookId.value = null
      }
    } catch (err) {
      console.error('trashNotebook error:', err)
      throw err
    }
  }

  async function restoreNotebook(id) {
    try {
      await api.post(`/notebooks/${id}/restore`)
      // Re-fetch to get fresh data
      await fetchNotebooks()
    } catch (err) {
      console.error('restoreNotebook error:', err)
      throw err
    }
  }

  async function toggleFavoriteNotebook(id) {
    try {
      const { data } = await api.patch(`/notebooks/${id}/favorite`)
      const idx = notebooks.value.findIndex((n) => n.id === String(id))
      if (idx !== -1) {
        notebooks.value[idx].isFavorited = data.is_favorited
      }
      return data.is_favorited
    } catch (err) {
      console.error('toggleFavoriteNotebook error:', err)
      throw err
    }
  }

  function searchNotebooks(query) {
    const active = activeNotebooks.value
    if (!query || !query.trim()) return active
    const q = query.toLowerCase().trim()
    return active.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
    )
  }

  return {
    notebooks,
    activeNotebooks,
    trashedNotebooks,
    activeNotebookId,
    activeNotebook,
    loading,
    error,
    setActive,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    trashNotebook,
    restoreNotebook,
    toggleFavoriteNotebook,
    searchNotebooks,
    ICON_OPTIONS,
    COLOR_OPTIONS,
  }
})
