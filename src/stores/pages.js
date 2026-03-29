import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const usePageStore = defineStore('pages', () => {
  const pages = ref([])
  const activePageId = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const activePage = computed(() =>
    pages.value.find((p) => p.id === activePageId.value)
  )

  const allPages = computed(() => pages.value.filter((p) => !p.trashedAt))

  const trashedPages = computed(() => pages.value.filter((p) => p.trashedAt))

  function mapPage(p) {
    return {
      id: String(p.id),
      notebookId: String(p.notebook_id),
      title: p.title || '',
      encryptedContent: p.encrypted_content || '',
      contentNonce: p.content_nonce || '',
      preview: p.encrypted_content
        ? p.encrypted_content.substring(0, 120) + (p.encrypted_content.length > 120 ? '…' : '')
        : '',
      dateMode: p.date_mode,
      pageDate: p.page_date,
      templateType: p.template_type,
      isPinned: p.is_pinned || false,
      isFavorited: p.is_favorited || false,
      wordCount: p.word_count || 0,
      sortOrder: p.sort_order || 0,
      tags: p.tags || [],
      updatedAt: p.updated_at,
      createdAt: p.created_at,
      trashedAt: p.trashed_at || null,
    }
  }

  function getByNotebook(notebookId) {
    return pages.value.filter((p) => p.notebookId === String(notebookId) && !p.trashedAt)
  }

  function setActive(id) {
    activePageId.value = id
  }

  async function fetchPages(notebookId) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get(`/notebooks/${notebookId}/pages`)
      const fetched = (data.pages || []).map(mapPage)
      // Replace pages for this notebook, keep others
      pages.value = [
        ...pages.value.filter((p) => p.notebookId !== String(notebookId)),
        ...fetched,
      ]
    } catch (err) {
      error.value = 'Failed to load pages.'
      console.error('fetchPages error:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPage(pageId) {
    try {
      const { data } = await api.get(`/pages/${pageId}`)
      const mapped = mapPage(data.page)
      const idx = pages.value.findIndex((p) => p.id === String(pageId))
      if (idx !== -1) {
        pages.value[idx] = mapped
      } else {
        pages.value.push(mapped)
      }
      return mapped
    } catch (err) {
      console.error('fetchPage error:', err)
      throw err
    }
  }

  async function createPage(notebookId, { title = '', template = 'blank' } = {}) {
    try {
      const { data } = await api.post(`/notebooks/${notebookId}/pages`, {
        title,
        template_type: template,
      })
      const page = mapPage(data.page)
      pages.value.unshift(page)
      return page
    } catch (err) {
      console.error('createPage error:', err)
      throw err
    }
  }

  async function updatePage(pageId, updates) {
    try {
      const { data } = await api.patch(`/pages/${pageId}`, updates)
      const mapped = mapPage(data.page)
      const idx = pages.value.findIndex((p) => p.id === String(pageId))
      if (idx !== -1) {
        pages.value[idx] = mapped
      }
      return mapped
    } catch (err) {
      console.error('updatePage error:', err)
      throw err
    }
  }

  async function togglePin(id) {
    try {
      const { data } = await api.patch(`/pages/${id}/pin`)
      const page = pages.value.find((p) => p.id === String(id))
      if (page) page.isPinned = data.is_pinned
    } catch (err) {
      console.error('togglePin error:', err)
    }
  }

  async function toggleFavorite(id) {
    try {
      const { data } = await api.patch(`/pages/${id}/favorite`)
      const page = pages.value.find((p) => p.id === String(id))
      if (page) page.isFavorited = data.is_favorited
    } catch (err) {
      console.error('toggleFavorite error:', err)
    }
  }

  async function trashPage(id) {
    try {
      await api.delete(`/pages/${id}`)
      pages.value = pages.value.filter((p) => p.id !== String(id))
      if (activePageId.value === String(id)) {
        activePageId.value = null
      }
    } catch (err) {
      console.error('trashPage error:', err)
      throw err
    }
  }

  async function restorePage(id) {
    try {
      await api.post(`/pages/${id}/restore`)
      const page = pages.value.find((p) => p.id === String(id))
      if (page) page.trashedAt = null
    } catch (err) {
      console.error('restorePage error:', err)
      throw err
    }
  }

  return {
    pages,
    allPages,
    trashedPages,
    activePageId,
    activePage,
    loading,
    error,
    getByNotebook,
    setActive,
    fetchPages,
    fetchPage,
    createPage,
    updatePage,
    togglePin,
    toggleFavorite,
    trashPage,
    restorePage,
  }
})
