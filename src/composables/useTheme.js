import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const theme = useLocalStorage('obscribe-theme', 'dark')

export function useTheme() {
  function setTheme(newTheme) {
    theme.value = newTheme
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function applyTheme() {
    if (theme.value === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  watch(theme, applyTheme, { immediate: true })

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
