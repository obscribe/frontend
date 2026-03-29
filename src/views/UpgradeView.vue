<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBillingStore } from '@/stores/billing'
import { config } from '@/config'

const router = useRouter()
const billingStore = useBillingStore()

const selectedInterval = ref('yearly')
const paymentMethod = ref('card')
const checkingOut = ref(false)

const plans = computed(() => billingStore.plans)

const monthlyPlan = computed(() => plans.value.find(p => p.interval === 'monthly'))
const yearlyPlan = computed(() => plans.value.find(p => p.interval === 'yearly'))

const selectedPlan = computed(() =>
  selectedInterval.value === 'yearly' ? yearlyPlan.value : monthlyPlan.value
)

async function subscribe() {
  if (!selectedPlan.value || checkingOut.value) return
  checkingOut.value = true
  try {
    await billingStore.checkout(selectedPlan.value.id, paymentMethod.value === 'crypto' ? 'plisio' : 'stripe')
  } catch {
    checkingOut.value = false
  }
}

onMounted(() => {
  if (config.selfHosted) {
    router.replace('/')
    return
  }
  billingStore.fetchPlans()
  billingStore.fetchBillingStatus()
})
</script>

<template>
  <div class="upgrade">
    <!-- Hero -->
    <div class="upgrade__hero">
      <div class="upgrade__hero-badge">✨ Pro</div>
      <h1 class="upgrade__hero-title">Unlock Obscribe Pro</h1>
      <p class="upgrade__hero-desc">
        Take your notes further with unlimited notebooks, pages, and premium features.
      </p>
    </div>

    <!-- Feature Comparison -->
    <div class="upgrade__comparison">
      <div class="upgrade__plan-card">
        <div class="upgrade__plan-header">
          <h3 class="upgrade__plan-name">Free</h3>
          <p class="upgrade__plan-price">$0<span>/forever</span></p>
        </div>
        <ul class="upgrade__features">
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon">📓</span>
            <span>Up to 5 notebooks</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon">📄</span>
            <span>Up to 50 pages</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon">✏️</span>
            <span>Basic editor</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon">🔒</span>
            <span>End-to-end encryption</span>
          </li>
        </ul>
      </div>

      <div class="upgrade__plan-card upgrade__plan-card--pro">
        <div class="upgrade__plan-header">
          <div class="upgrade__plan-name-row">
            <h3 class="upgrade__plan-name">Pro</h3>
            <span class="upgrade__pro-badge">Recommended</span>
          </div>
          <p class="upgrade__plan-price">
            <template v-if="selectedInterval === 'monthly'">$5<span>/mo</span></template>
            <template v-else>$4<span>/mo</span></template>
          </p>
          <p v-if="selectedInterval === 'yearly'" class="upgrade__plan-billed">
            Billed $48/year
          </p>
        </div>
        <ul class="upgrade__features">
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon upgrade__feature-icon--pro">∞</span>
            <span>Unlimited notebooks</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon upgrade__feature-icon--pro">∞</span>
            <span>Unlimited pages</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon upgrade__feature-icon--pro">⚡</span>
            <span>Priority support</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon upgrade__feature-icon--pro">🚀</span>
            <span>Early access to features</span>
          </li>
          <li class="upgrade__feature">
            <span class="upgrade__feature-icon">🔒</span>
            <span>End-to-end encryption</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Pricing Toggle -->
    <div class="upgrade__pricing">
      <div class="upgrade__interval-toggle">
        <button
          class="upgrade__interval-btn"
          :class="{ 'upgrade__interval-btn--active': selectedInterval === 'monthly' }"
          @click="selectedInterval = 'monthly'"
        >
          Monthly
        </button>
        <button
          class="upgrade__interval-btn"
          :class="{ 'upgrade__interval-btn--active': selectedInterval === 'yearly' }"
          @click="selectedInterval = 'yearly'"
        >
          Yearly
          <span class="upgrade__save-badge">Save 20%</span>
        </button>
      </div>

      <!-- Payment Method -->
      <div class="upgrade__method-toggle">
        <button
          class="upgrade__method-btn"
          :class="{ 'upgrade__method-btn--active': paymentMethod === 'card' }"
          @click="paymentMethod = 'card'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Card
        </button>
        <button
          class="upgrade__method-btn"
          :class="{ 'upgrade__method-btn--active': paymentMethod === 'crypto' }"
          @click="paymentMethod = 'crypto'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.5 8h5a2.5 2.5 0 0 1 0 5H9v3h6" />
            <line x1="12" y1="6" x2="12" y2="8" />
            <line x1="12" y1="16" x2="12" y2="18" />
          </svg>
          Crypto
        </button>
      </div>

      <!-- Subscribe Button -->
      <button
        class="upgrade__subscribe-btn"
        :disabled="checkingOut || !selectedPlan"
        @click="subscribe"
      >
        {{ checkingOut ? 'Redirecting...' : `Subscribe — ${selectedInterval === 'yearly' ? '$48/yr' : '$5/mo'}` }}
      </button>

      <p class="upgrade__fine-print">
        Cancel anytime. You'll keep Pro access until the end of your billing period.
      </p>
    </div>

    <!-- Already Pro -->
    <div v-if="billingStore.isPro" class="upgrade__already-pro">
      <p>🎉 You're already on Pro!</p>
      <button class="upgrade__link" @click="router.push('/settings')">
        Manage your subscription →
      </button>
    </div>
  </div>
</template>

<style scoped>
.upgrade {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

/* ─── Hero ─── */
.upgrade__hero {
  text-align: center;
  margin-bottom: 3rem;
}

.upgrade__hero-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--accent-subtle);
  color: var(--accent-text);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.upgrade__hero-title {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.upgrade__hero-desc {
  font-size: 1.05rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ─── Comparison ─── */
.upgrade__comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.upgrade__plan-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  transition: border-color var(--transition-fast);
}

.upgrade__plan-card--pro {
  border-color: var(--accent);
  background: var(--bg-tertiary);
  position: relative;
}

.upgrade__plan-header {
  margin-bottom: 1.5rem;
}

.upgrade__plan-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upgrade__plan-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.upgrade__pro-badge {
  padding: 0.15rem 0.5rem;
  background: var(--accent);
  color: #fff;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.upgrade__plan-price {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.upgrade__plan-price span {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text-tertiary);
}

.upgrade__plan-billed {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0.25rem 0 0;
}

/* ─── Features ─── */
.upgrade__features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upgrade__feature {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.upgrade__feature-icon {
  font-size: 1rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.upgrade__feature-icon--pro {
  color: var(--accent-text);
  font-weight: 700;
}

/* ─── Pricing Controls ─── */
.upgrade__pricing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.upgrade__interval-toggle {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
  border: 1px solid var(--border);
}

.upgrade__interval-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upgrade__interval-btn--active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.upgrade__save-badge {
  padding: 0.1rem 0.4rem;
  background: rgba(110, 231, 168, 0.12);
  color: #6ee7a8;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
}

.upgrade__method-toggle {
  display: flex;
  gap: 0.5rem;
}

.upgrade__method-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upgrade__method-btn:hover {
  border-color: var(--text-tertiary);
}

.upgrade__method-btn--active {
  border-color: var(--accent);
  color: var(--accent-text);
  background: var(--accent-subtle);
}

.upgrade__subscribe-btn {
  width: 100%;
  max-width: 360px;
  padding: 0.875rem 2rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upgrade__subscribe-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.upgrade__subscribe-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upgrade__fine-print {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0;
  text-align: center;
}

/* ─── Already Pro ─── */
.upgrade__already-pro {
  text-align: center;
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--accent-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--accent);
}

.upgrade__already-pro p {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-text);
  margin: 0 0 0.5rem;
}

.upgrade__link {
  background: none;
  border: none;
  color: var(--accent-text);
  font-size: 0.875rem;
  font-family: var(--font-ui);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.upgrade__link:hover {
  color: var(--text-primary);
}

/* ─── Mobile ─── */
@media (max-width: 767px) {
  .upgrade {
    padding: 2rem 1rem;
  }

  .upgrade__hero-title {
    font-size: 1.75rem;
  }

  .upgrade__comparison {
    grid-template-columns: 1fr;
  }

  .upgrade__plan-price {
    font-size: 1.5rem;
  }

  .upgrade__subscribe-btn {
    max-width: 100%;
  }
}
</style>
