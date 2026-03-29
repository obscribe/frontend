import api from './api'

export const adminService = {
  async getUsers() {
    const { data } = await api.get('/admin/users')
    return data
  },

  async createUser(payload) {
    const { data } = await api.post('/admin/users', payload)
    return data
  },

  async updateUser(id, payload) {
    const { data } = await api.patch(`/admin/users/${id}`, payload)
    return data
  },

  async deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`)
    return data
  },

  async resetUserPassword(id, payload) {
    const { data } = await api.post(`/admin/users/${id}/reset-password`, payload)
    return data
  },
}
