<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import VaultUnlockModal from '@/components/VaultUnlockModal.vue'
import { useTheme } from '@/composables/useTheme'
import { useVaultStore } from '@/stores/vault'
import { useAuthStore } from '@/stores/auth'

// Initialize theme
useTheme()

const authStore = useAuthStore()
const vaultStore = useVaultStore()

// Try to restore vault key from sessionStorage on app load (survives page refresh)
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await vaultStore.tryRestoreFromSession()
  }
})

const route = useRoute()
const layout = computed(() => route.meta.layout || 'app')

// Show vault unlock modal when user is authenticated but vault is locked
// Don't show on auth/onboarding/verification pages
const showVaultUnlock = computed(() => {
  return authStore.isAuthenticated
    && !vaultStore.isUnlocked
    && layout.value === 'app'
    && route.path !== '/onboarding'
    && route.path !== '/verify-email'
})
</script>

<template>
  <ToastNotification />
  <VaultUnlockModal v-if="showVaultUnlock" @unlocked="() => {}" />

  <AuthLayout v-if="layout === 'auth'">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </AuthLayout>

  <div v-else-if="layout === 'minimal'" class="minimal-layout">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>

  <AppLayout v-else>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </AppLayout>
</template>

<style scoped>
.minimal-layout {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  overflow-y: auto;
}
</style>
