import api from './api'

export const billingService = {
  // Plans
  async getPlans() {
    const { data } = await api.get('/plans')
    return data
  },

  // Billing status
  async getBillingStatus() {
    const { data } = await api.get('/billing')
    return data
  },

  // Payment history
  async getPaymentHistory(params = {}) {
    const { data } = await api.get('/billing/payments', { params })
    return data
  },

  // Checkout
  async checkoutStripe(planId) {
    const { data } = await api.post('/billing/checkout/stripe', { plan_id: planId })
    return data
  },

  async checkoutPlisio(planId) {
    const { data } = await api.post('/billing/checkout/plisio', { plan_id: planId })
    return data
  },

  // Management
  async cancelSubscription() {
    const { data } = await api.post('/billing/cancel')
    return data
  },

  async resumeSubscription() {
    const { data } = await api.post('/billing/resume')
    return data
  },

  async getPortalUrl() {
    const { data } = await api.get('/billing/portal')
    return data
  },
}
