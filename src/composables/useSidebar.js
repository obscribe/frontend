import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const isOpen = useLocalStorage('obscribe-sidebar', true)

// Track if viewport is mobile (<768px)
const isMobile = ref(window.innerWidth < 768)

// Listen for resize (runs once at module level)
if (typeof window !== 'undefined') {
  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const wasMobile = isMobile.value
      isMobile.value = window.innerWidth < 768
      // Auto-close sidebar when entering mobile breakpoint
      if (isMobile.value && !wasMobile) {
        isOpen.value = false
      }
    }, 100)
  })
  // Default closed on mobile on first load
  if (isMobile.value) {
    isOpen.value = false
  }
}

export function useSidebar() {
  function toggle() {
    isOpen.value = !isOpen.value
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Close sidebar if on mobile (call after navigation) */
  function closeIfMobile() {
    if (isMobile.value) {
      isOpen.value = false
    }
  }

  return { isOpen, isMobile, toggle, open, close, closeIfMobile }
}
