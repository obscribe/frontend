import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { billingService } from '@/services/billing'

export const useBillingStore = defineStore('billing', () => {
  const plans = ref([])
  const subscription = ref(null)
  const payments = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const isPro = computed(() => {
    if (!subscription.value) return false
    const status = subscription.value.status
    return status === 'active' || status === 'cancelled' // cancelled but not expired = still pro
  })

  const activePlan = computed(() => {
    if (!subscription.value?.plan_id) return null
    return plans.value.find(p => p.id === subscription.value.plan_id) || null
  })

  const daysRemaining = computed(() => {
    if (!subscription.value?.expires_at) return null
    const now = new Date()
    const expires = new Date(subscription.value.expires_at)
    const diff = expires - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  const isExpiringSoon = computed(() => {
    if (daysRemaining.value === null) return false
    return daysRemaining.value <= 7 && daysRemaining.value > 0
  })

  // Actions
  async function fetchPlans() {
    try {
      const data = await billingService.getPlans()
      plans.value = data.plans || data.data || data || []
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  async function fetchBillingStatus() {
    loading.value = true
    error.value = null
    try {
      const data = await billingService.getBillingStatus()
      subscription.value = data.subscription || data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch billing status'
    } finally {
      loading.value = false
    }
  }

  async function fetchPayments() {
    try {
      const data = await billingService.getPaymentHistory()
      payments.value = data.payments || data.data || data || []
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    }
  }

  async function checkout(planId, method = 'stripe') {
    loading.value = true
    error.value = null
    try {
      const fn = method === 'plisio' ? billingService.checkoutPlisio : billingService.checkoutStripe
      const data = await fn(planId)
      if (data.url) {
        window.location.href = data.url
      }
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Checkout failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function cancel() {
    loading.value = true
    error.value = null
    try {
      await billingService.cancelSubscription()
      await fetchBillingStatus()
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to cancel subscription'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resume() {
    loading.value = true
    error.value = null
    try {
      await billingService.resumeSubscription()
      await fetchBillingStatus()
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to resume subscription'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    plans,
    subscription,
    payments,
    loading,
    error,
    isPro,
    activePlan,
    daysRemaining,
    isExpiringSoon,
    fetchPlans,
    fetchBillingStatus,
    fetchPayments,
    checkout,
    cancel,
    resume,
  }
})
