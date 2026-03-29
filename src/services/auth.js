import api from './api'

export const authService = {
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password, password_confirmation: password })
    return data
  },

  async getVault() {
    const { data } = await api.get('/vault')
    return data
  },

  async updateVault(payload) {
    const { data } = await api.patch('/vault', payload)
    return data
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  async magicLinkSend(email) {
    const { data } = await api.post('/auth/magic-link', { email })
    return data
  },

  async magicLinkVerify(token) {
    const { data } = await api.get('/auth/magic-link/verify', { params: { token } })
    return data
  },

  async logout() {
    const { data } = await api.post('/auth/logout')
    return data
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token, email, password) {
    const { data } = await api.post('/auth/reset-password', { token, email, password, password_confirmation: password })
    return data
  },

  async fetchUser() {
    const { data } = await api.get('/user')
    return data
  },

  async verifyEmail(token, email) {
    const { data } = await api.post('/auth/verify-email', { token, email })
    return data
  },

  async resendVerification() {
    const { data } = await api.post('/auth/resend-verification')
    return data
  },

  async markOnboarded() {
    const { data } = await api.post('/user/onboarded')
    return data
  },

  async updatePreferences(prefs) {
    const { data } = await api.patch('/user/preferences', prefs)
    return data
  },

  async createNotebook(payload) {
    const { data } = await api.post('/notebooks', payload)
    return data
  },

  async mfaVerify(code, mfaToken) {
    const { data } = await api.post('/auth/mfa/verify', { code }, {
      headers: { Authorization: `Bearer ${mfaToken}` },
    })
    return data
  },
}
