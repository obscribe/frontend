import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.obscribe.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Inject Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('obscribe_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('obscribe_token')
      localStorage.removeItem('obscribe_user')
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/register') {
        router.push('/login')
      }
    }

    if (status === 429) {
      const message = error.response?.data?.message || 'Too many requests. Please slow down.'
      // Dispatch a custom event for toast notifications
      window.dispatchEvent(new CustomEvent('obscribe:toast', {
        detail: { type: 'error', message },
      }))
    }

    return Promise.reject(error)
  }
)

export default api
