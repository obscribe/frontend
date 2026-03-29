<script setup>
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__left">
      <div class="auth-layout__brand">
        <div class="auth-layout__logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15" />
            <path d="M12 28V12h4l4 10 4-10h4v16h-3V17l-3.5 8h-3L15 17v11h-3z" fill="var(--accent)" />
          </svg>
        </div>
        <h1 class="auth-layout__title">Obscribe</h1>
        <p class="auth-layout__tagline">Write privately.</p>
      </div>
      <div class="auth-layout__features">
        <div class="auth-layout__feature">
          <span class="auth-layout__feature-icon">🔒</span>
          <div>
            <h3>Zero-knowledge encryption</h3>
            <p>Your notes are encrypted before they leave your device. We can never read them.</p>
          </div>
        </div>
        <div class="auth-layout__feature">
          <span class="auth-layout__feature-icon">🔍</span>
          <div>
            <h3>Encrypted search</h3>
            <p>Find anything instantly — without compromising your privacy.</p>
          </div>
        </div>
        <div class="auth-layout__feature">
          <span class="auth-layout__feature-icon">📖</span>
          <div>
            <h3>Open source</h3>
            <p>Fully auditable. Don't trust us — verify us.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="auth-layout__right">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  min-height: 100vh;
  width: 100vw;
}

.auth-layout__left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
}

.auth-layout__brand {
  margin-bottom: 3rem;
}

.auth-layout__logo {
  margin-bottom: 1.25rem;
}

.auth-layout__title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.auth-layout__tagline {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
  font-family: var(--font-editor);
}

.auth-layout__features {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-layout__feature {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.auth-layout__feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.auth-layout__feature h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.auth-layout__feature p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.auth-layout__right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bg-primary);
}

@media (max-width: 767px) {
  .auth-layout {
    flex-direction: column;
  }
  .auth-layout__left {
    display: none;
  }
  .auth-layout__right {
    flex: 1;
    padding: 1.5rem 1rem;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
}
</style>
