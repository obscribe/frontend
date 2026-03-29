<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBillingStore } from '@/stores/billing'
import { billingService } from '@/services/billing'

const route = useRoute()
const router = useRouter()
const billingStore = useBillingStore()

const showCancelModal = ref(false)
const cancelling = ref(false)
const resuming = ref(false)

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('obscribe:toast', { detail: { type, message } }))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

const statusLabels = {
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
  past_due: 'Past Due',
}

const statusClasses = {
  active: 'billing__status--active',
  cancelled: 'billing__status--cancelled',
  expired: 'billing__status--expired',
  past_due: 'billing__status--expired',
}

async function handleCancel() {
  cancelling.value = true
  try {
    await billingStore.cancel()
    showCancelModal.value = false
    toast('success', 'Subscription cancelled. You\'ll keep Pro access until your billing period ends.')
  } catch {
    toast('error', 'Failed to cancel subscription')
  } finally {
    cancelling.value = false
  }
}

async function handleResume() {
  resuming.value = true
  try {
    await billingStore.resume()
    toast('success', 'Subscription resumed!')
  } catch {
    toast('error', 'Failed to resume subscription')
  } finally {
    resuming.value = false
  }
}

async function openPortal() {
  try {
    const data = await billingService.getPortalUrl()
    if (data.url) {
      window.open(data.url, '_blank')
    }
  } catch {
    toast('error', 'Failed to open billing portal')
  }
}

onMounted(async () => {
  await Promise.all([
    billingStore.fetchBillingStatus(),
    billingStore.fetchPayments(),
    billingStore.fetchPlans(),
  ])

  // Handle checkout return
  const success = route.query.success
  const cancelled = route.query.cancelled

  if (success === 'true') {
    toast('success', 'Welcome to Pro! 🎉')
    await billingStore.fetchBillingStatus()
    router.replace({ path: route.path, query: {} })
  } else if (cancelled === 'true') {
    toast('info', 'Payment was cancelled')
    router.replace({ path: route.path, query: {} })
  }
})
</script>

<template>
  <div class="billing">
    <!-- Loading state -->
    <div v-if="billingStore.loading && !billingStore.subscription" class="billing__loading">
      Loading billing info...
    </div>

    <template v-else>
      <!-- Current Plan -->
      <div class="billing__section">
        <h3 class="billing__section-title">Current Plan</h3>
        <div class="billing__plan-card">
          <div class="billing__plan-info">
            <div class="billing__plan-row">
              <span class="billing__plan-name">
                {{ billingStore.activePlan?.name || (billingStore.isPro ? 'Pro' : 'Free') }}
              </span>
              <span
                class="billing__status"
                :class="statusClasses[billingStore.subscription?.status] || 'billing__status--expired'"
              >
                {{ statusLabels[billingStore.subscription?.status] || 'Free' }}
              </span>
            </div>

            <p v-if="billingStore.activePlan" class="billing__plan-price">
              {{ formatCurrency(billingStore.activePlan.price) }}/{{ billingStore.activePlan.interval === 'yearly' ? 'year' : 'month' }}
            </p>

            <!-- Active subscription info -->
            <p v-if="billingStore.subscription?.status === 'active' && billingStore.subscription?.renews_at" class="billing__plan-detail">
              Your plan renews on {{ formatDate(billingStore.subscription.renews_at) }}
            </p>

            <!-- Cancelled but not expired -->
            <p v-if="billingStore.subscription?.status === 'cancelled' && billingStore.subscription?.expires_at" class="billing__plan-detail billing__plan-detail--warn">
              Your plan is active until {{ formatDate(billingStore.subscription.expires_at) }}
            </p>

            <!-- Expiring soon warning -->
            <p v-if="billingStore.isExpiringSoon" class="billing__plan-detail billing__plan-detail--warn">
              ⚠️ Your subscription expires in {{ billingStore.daysRemaining }} day{{ billingStore.daysRemaining === 1 ? '' : 's' }}
            </p>
          </div>

          <div class="billing__plan-actions">
            <!-- Free/Expired: Upgrade -->
            <button
              v-if="!billingStore.isPro"
              class="billing__btn billing__btn--primary"
              @click="router.push('/upgrade')"
            >
              Upgrade to Pro
            </button>

            <!-- Active: Cancel -->
            <button
              v-if="billingStore.subscription?.status === 'active'"
              class="billing__btn billing__btn--danger-ghost"
              @click="showCancelModal = true"
            >
              Cancel subscription
            </button>

            <!-- Cancelled but not expired: Resume -->
            <button
              v-if="billingStore.subscription?.status === 'cancelled' && billingStore.daysRemaining > 0"
              class="billing__btn billing__btn--primary"
              :disabled="resuming"
              @click="handleResume"
            >
              {{ resuming ? 'Resuming...' : 'Resume subscription' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Method (card users) -->
      <div
        v-if="billingStore.isPro && billingStore.subscription?.payment_method === 'stripe'"
        class="billing__section"
      >
        <h3 class="billing__section-title">Payment Method</h3>
        <div class="billing__payment-method">
          <div class="billing__card-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span v-if="billingStore.subscription?.card_last_four">
              •••• {{ billingStore.subscription.card_last_four }}
            </span>
            <span v-else>Card on file</span>
          </div>
          <button class="billing__btn billing__btn--ghost" @click="openPortal">
            Update payment method
          </button>
        </div>
      </div>

      <!-- Payment History -->
      <div class="billing__section">
        <h3 class="billing__section-title">Payment History</h3>

        <div v-if="billingStore.payments.length === 0" class="billing__empty">
          No payments yet.
        </div>

        <div v-else class="billing__payments">
          <div
            v-for="payment in billingStore.payments"
            :key="payment.id"
            class="billing__payment"
          >
            <div class="billing__payment-info">
              <div class="billing__payment-row">
                <span class="billing__payment-method-icon">
                  <svg v-if="payment.method === 'stripe'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.5 8h5a2.5 2.5 0 0 1 0 5H9v3h6" />
                    <line x1="12" y1="6" x2="12" y2="8" />
                    <line x1="12" y1="16" x2="12" y2="18" />
                  </svg>
                </span>
                <span class="billing__payment-amount">{{ formatCurrency(payment.amount) }}</span>
                <span
                  class="billing__payment-status"
                  :class="{
                    'billing__payment-status--success': payment.status === 'succeeded' || payment.status === 'paid',
                    'billing__payment-status--failed': payment.status === 'failed',
                    'billing__payment-status--pending': payment.status === 'pending',
                  }"
                >
                  {{ payment.status }}
                </span>
              </div>
              <span class="billing__payment-date">{{ formatDate(payment.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Cancel Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCancelModal" class="billing__modal-overlay" @click.self="showCancelModal = false">
          <div class="billing__modal">
            <div class="billing__modal-icon">⚠️</div>
            <h2 class="billing__modal-title">Cancel subscription?</h2>
            <p class="billing__modal-text">
              Are you sure? You'll keep Pro access until
              <strong>{{ formatDate(billingStore.subscription?.expires_at || billingStore.subscription?.renews_at) }}</strong>.
              After that, your account will revert to the Free plan.
            </p>
            <div class="billing__modal-actions">
              <button class="billing__btn billing__btn--ghost" @click="showCancelModal = false">
                Keep subscription
              </button>
              <button
                class="billing__btn billing__btn--danger"
                :disabled="cancelling"
                @click="handleCancel"
              >
                {{ cancelling ? 'Cancelling...' : 'Yes, cancel' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.billing {
  max-width: 100%;
}

.billing__loading {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  padding: 2rem 0;
}

/* ─── Sections ─── */
.billing__section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-subtle);
}

.billing__section:last-child {
  border-bottom: none;
}

.billing__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

/* ─── Plan Card ─── */
.billing__plan-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
}

.billing__plan-info {
  margin-bottom: 1rem;
}

.billing__plan-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.billing__plan-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
}

.billing__status {
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.billing__status--active {
  background: rgba(110, 231, 168, 0.12);
  color: #6ee7a8;
}

.billing__status--cancelled {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.billing__status--expired {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.billing__plan-price {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.billing__plan-detail {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin: 0.5rem 0 0;
}

.billing__plan-detail--warn {
  color: #fbbf24;
}

.billing__plan-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ─── Payment Method ─── */
.billing__payment-method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.billing__card-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

/* ─── Payment History ─── */
.billing__empty {
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.billing__payments {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.billing__payment {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.billing__payment-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.billing__payment-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.billing__payment-method-icon {
  display: flex;
  color: var(--text-tertiary);
}

.billing__payment-amount {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.billing__payment-status {
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
}

.billing__payment-status--success {
  background: rgba(110, 231, 168, 0.12);
  color: #6ee7a8;
}

.billing__payment-status--failed {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.billing__payment-status--pending {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.billing__payment-date {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

/* ─── Buttons ─── */
.billing__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.billing__btn--primary {
  background: var(--accent);
  color: #fff;
}

.billing__btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.billing__btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.billing__btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.billing__btn--ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.billing__btn--danger {
  background: #dc2626;
  color: #fff;
}

.billing__btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.billing__btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.billing__btn--danger-ghost {
  background: transparent;
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.billing__btn--danger-ghost:hover {
  background: rgba(248, 113, 113, 0.08);
}

/* ─── Modal ─── */
.billing__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.billing__modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 440px;
  width: 90%;
  text-align: center;
}

.billing__modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.billing__modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.billing__modal-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.billing__modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* ─── Transitions ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─── Mobile ─── */
@media (max-width: 767px) {
  .billing__payment-method {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .billing__plan-actions {
    flex-direction: column;
  }

  .billing__btn {
    min-height: 44px;
    width: 100%;
  }

  .billing__modal {
    width: calc(100vw - 2rem);
  }

  .billing__modal-actions {
    flex-direction: column;
  }
}
</style>
