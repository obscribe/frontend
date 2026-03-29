<script setup>
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useSidebar } from '@/composables/useSidebar'

const { isOpen, isMobile, close } = useSidebar()
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-open': isOpen, 'is-mobile': isMobile }">
    <!-- Mobile backdrop overlay -->
    <Transition name="backdrop-fade">
      <div
        v-if="isOpen && isMobile"
        class="app-layout__backdrop"
        @click="close"
      />
    </Transition>
    <AppSidebar />
    <div class="app-layout__main">
      <AppTopbar />
      <main class="app-layout__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-layout__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 25;
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.2s ease;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.app-layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: margin-left var(--transition-normal);
  margin-left: 0;
}

.sidebar-open:not(.is-mobile) .app-layout__main {
  margin-left: var(--sidebar-width);
}

.app-layout__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;
}

@media (max-width: 767px) {
  .app-layout__content {
    padding: 1rem;
  }
}
</style>
