<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminService } from '@/services/admin'

const authStore = useAuthStore()
const users = ref([])
const loading = ref(true)
const error = ref('')

// ─── Modals ───
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showResetPwModal = ref(false)

// Add user form
const addForm = ref({ name: '', email: '', password: '', is_admin: false })
const addLoading = ref(false)
const addErrors = ref({})

// Edit user form
const editForm = ref({ id: null, name: '', email: '', is_admin: false })
const editLoading = ref(false)
const editErrors = ref({})

// Delete user
const deleteTarget = ref(null)
const deleteLoading = ref(false)

// Reset password
const resetPwTarget = ref(null)
const resetPwForm = ref({ password: '', password_confirmation: '' })
const resetPwLoading = ref(false)
const resetPwErrors = ref({})

onMounted(async () => {
  await loadUsers()
})

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const data = await adminService.getUsers()
    users.value = data.users || data.data || data || []
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

// ─── Add User ───
function openAddModal() {
  addForm.value = { name: '', email: '', password: '', is_admin: false }
  addErrors.value = {}
  showAddModal.value = true
}

async function createUser() {
  addLoading.value = true
  addErrors.value = {}
  try {
    await adminService.createUser({
      name: addForm.value.name,
      email: addForm.value.email,
      password: addForm.value.password,
      password_confirmation: addForm.value.password,
      is_admin: addForm.value.is_admin,
    })
    showAddModal.value = false
    toast('success', 'User created successfully')
    await loadUsers()
  } catch (err) {
    if (err.response?.status === 422) {
      addErrors.value = err.response.data.errors || {}
    } else {
      toast('error', err.response?.data?.message || 'Failed to create user')
    }
  } finally {
    addLoading.value = false
  }
}

// ─── Edit User ───
function openEditModal(user) {
  editForm.value = { id: user.id, name: user.name, email: user.email, is_admin: !!user.is_admin }
  editErrors.value = {}
  showEditModal.value = true
}

async function updateUser() {
  editLoading.value = true
  editErrors.value = {}
  try {
    await adminService.updateUser(editForm.value.id, {
      name: editForm.value.name,
      email: editForm.value.email,
      is_admin: editForm.value.is_admin,
    })
    showEditModal.value = false
    toast('success', 'User updated successfully')
    await loadUsers()
  } catch (err) {
    if (err.response?.status === 422) {
      editErrors.value = err.response.data.errors || {}
    } else {
      toast('error', err.response?.data?.message || 'Failed to update user')
    }
  } finally {
    editLoading.value = false
  }
}

// ─── Delete User ───
function openDeleteModal(user) {
  deleteTarget.value = user
  showDeleteModal.value = true
}

async function deleteUser() {
  deleteLoading.value = true
  try {
    await adminService.deleteUser(deleteTarget.value.id)
    showDeleteModal.value = false
    toast('success', 'User deleted')
    await loadUsers()
  } catch (err) {
    toast('error', err.response?.data?.message || 'Failed to delete user')
  } finally {
    deleteLoading.value = false
  }
}

// ─── Reset Password ───
function openResetPwModal(user) {
  resetPwTarget.value = user
  resetPwForm.value = { password: '', password_confirmation: '' }
  resetPwErrors.value = {}
  showResetPwModal.value = true
}

async function resetPassword() {
  resetPwLoading.value = true
  resetPwErrors.value = {}
  try {
    await adminService.resetUserPassword(resetPwTarget.value.id, {
      password: resetPwForm.value.password,
      password_confirmation: resetPwForm.value.password_confirmation,
    })
    showResetPwModal.value = false
    toast('success', `Password reset for ${resetPwTarget.value.name}`)
  } catch (err) {
    if (err.response?.status === 422) {
      resetPwErrors.value = err.response.data.errors || {}
    } else {
      toast('error', err.response?.data?.message || 'Failed to reset password')
    }
  } finally {
    resetPwLoading.value = false
  }
}

function isSelf(user) {
  return user.id === authStore.user?.id
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('obscribe:toast', { detail: { type, message } }))
}
</script>

<template>
  <div class="admin-users">
    <div class="admin-users__header">
      <div>
        <h1 class="admin-users__title">User Management</h1>
        <p class="admin-users__subtitle">Manage user accounts for your Obscribe instance</p>
      </div>
      <button class="admin-users__add-btn" @click="openAddModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add User
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="admin-users__loading">Loading users...</div>

    <!-- Error -->
    <div v-else-if="error" class="admin-users__error">
      <p>{{ error }}</p>
      <button class="admin-users__retry-btn" @click="loadUsers">Retry</button>
    </div>

    <!-- Users table -->
    <div v-else class="admin-users__table-wrap">
      <table class="admin-users__table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Created</th>
            <th>Last Login</th>
            <th class="admin-users__th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="admin-users__row">
            <td class="admin-users__cell-user">
              <div class="admin-users__user-avatar">{{ (u.name || 'U').charAt(0).toUpperCase() }}</div>
              <div class="admin-users__user-info">
                <span class="admin-users__user-name">
                  {{ u.name }}
                  <span v-if="isSelf(u)" class="admin-users__you-badge">You</span>
                </span>
                <span class="admin-users__user-email">{{ u.email }}</span>
              </div>
            </td>
            <td>
              <span class="admin-users__role-badge" :class="u.is_admin ? 'admin-users__role-badge--admin' : ''">
                {{ u.is_admin ? 'Admin' : 'User' }}
              </span>
            </td>
            <td class="admin-users__cell-date">{{ formatDate(u.created_at) }}</td>
            <td class="admin-users__cell-date">{{ formatDateTime(u.last_login_at) }}</td>
            <td class="admin-users__cell-actions">
              <button class="admin-users__action" title="Edit user" @click="openEditModal(u)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="admin-users__action" title="Reset password" @click="openResetPwModal(u)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </button>
              <button
                v-if="!isSelf(u)"
                class="admin-users__action admin-users__action--danger"
                title="Delete user"
                @click="openDeleteModal(u)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─── Add User Modal ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal">
            <h2 class="modal__title">Add New User</h2>
            <form @submit.prevent="createUser" class="modal__form">
              <div class="modal__field">
                <label for="add-name">Name</label>
                <input id="add-name" v-model="addForm.name" type="text" placeholder="Full name" required />
                <span v-if="addErrors.name" class="modal__error">{{ addErrors.name[0] }}</span>
              </div>
              <div class="modal__field">
                <label for="add-email">Email</label>
                <input id="add-email" v-model="addForm.email" type="email" placeholder="user@example.com" required />
                <span v-if="addErrors.email" class="modal__error">{{ addErrors.email[0] }}</span>
              </div>
              <div class="modal__field">
                <label for="add-password">Password</label>
                <input id="add-password" v-model="addForm.password" type="password" placeholder="Minimum 8 characters" required />
                <span v-if="addErrors.password" class="modal__error">{{ addErrors.password[0] }}</span>
              </div>
              <label class="modal__checkbox">
                <input type="checkbox" v-model="addForm.is_admin" />
                <span>Admin privileges</span>
              </label>
              <div class="modal__actions">
                <button type="button" class="modal__btn modal__btn--ghost" @click="showAddModal = false">Cancel</button>
                <button type="submit" class="modal__btn modal__btn--primary" :disabled="addLoading">
                  {{ addLoading ? 'Creating...' : 'Create User' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ─── Edit User Modal ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
          <div class="modal">
            <h2 class="modal__title">Edit User</h2>
            <form @submit.prevent="updateUser" class="modal__form">
              <div class="modal__field">
                <label for="edit-name">Name</label>
                <input id="edit-name" v-model="editForm.name" type="text" required />
                <span v-if="editErrors.name" class="modal__error">{{ editErrors.name[0] }}</span>
              </div>
              <div class="modal__field">
                <label for="edit-email">Email</label>
                <input id="edit-email" v-model="editForm.email" type="email" required />
                <span v-if="editErrors.email" class="modal__error">{{ editErrors.email[0] }}</span>
              </div>
              <label class="modal__checkbox" :class="{ 'modal__checkbox--disabled': isSelf({ id: editForm.id }) }">
                <input
                  type="checkbox"
                  v-model="editForm.is_admin"
                  :disabled="isSelf({ id: editForm.id })"
                />
                <span>Admin privileges</span>
                <span v-if="isSelf({ id: editForm.id })" class="modal__checkbox-hint">(can't change your own admin status)</span>
              </label>
              <div class="modal__actions">
                <button type="button" class="modal__btn modal__btn--ghost" @click="showEditModal = false">Cancel</button>
                <button type="submit" class="modal__btn modal__btn--primary" :disabled="editLoading">
                  {{ editLoading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ─── Delete User Modal ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal">
            <div class="modal__icon">⚠️</div>
            <h2 class="modal__title modal__title--danger">Delete User</h2>
            <p class="modal__text">
              Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong> ({{ deleteTarget?.email }})?
              This action cannot be undone. All their notebooks and encrypted data will be permanently removed.
            </p>
            <div class="modal__actions">
              <button class="modal__btn modal__btn--ghost" @click="showDeleteModal = false">Cancel</button>
              <button class="modal__btn modal__btn--danger" :disabled="deleteLoading" @click="deleteUser">
                {{ deleteLoading ? 'Deleting...' : 'Delete User' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ─── Reset Password Modal ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showResetPwModal" class="modal-overlay" @click.self="showResetPwModal = false">
          <div class="modal">
            <h2 class="modal__title">Reset Password</h2>
            <p class="modal__text">
              Set a new password for <strong>{{ resetPwTarget?.name }}</strong>.
              <br /><br />
              <em class="modal__warning-text">⚠️ Note: This will NOT re-encrypt their vault. The user will need to log in with their new password and recover their vault using their recovery key.</em>
            </p>
            <form @submit.prevent="resetPassword" class="modal__form">
              <div class="modal__field">
                <label for="reset-password">New Password</label>
                <input id="reset-password" v-model="resetPwForm.password" type="password" placeholder="Minimum 8 characters" required />
                <span v-if="resetPwErrors.password" class="modal__error">{{ resetPwErrors.password[0] }}</span>
              </div>
              <div class="modal__field">
                <label for="reset-password-confirm">Confirm Password</label>
                <input id="reset-password-confirm" v-model="resetPwForm.password_confirmation" type="password" placeholder="Confirm password" required />
              </div>
              <div class="modal__actions">
                <button type="button" class="modal__btn modal__btn--ghost" @click="showResetPwModal = false">Cancel</button>
                <button type="submit" class="modal__btn modal__btn--primary" :disabled="resetPwLoading || !resetPwForm.password || resetPwForm.password !== resetPwForm.password_confirmation">
                  {{ resetPwLoading ? 'Resetting...' : 'Reset Password' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-users {
  max-width: 960px;
  margin: 0 auto;
}

.admin-users__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}

.admin-users__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.admin-users__subtitle {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: 0;
}

.admin-users__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.admin-users__add-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.admin-users__loading,
.admin-users__error {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.admin-users__error p {
  margin: 0 0 1rem;
  color: #f87171;
}

.admin-users__retry-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  cursor: pointer;
}

/* ─── Table ─── */
.admin-users__table-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.admin-users__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.admin-users__table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.admin-users__th-actions {
  text-align: right !important;
  width: 120px;
}

.admin-users__row {
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
}

.admin-users__row:last-child {
  border-bottom: none;
}

.admin-users__row:hover {
  background: var(--bg-hover);
}

.admin-users__table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.admin-users__cell-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-users__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.admin-users__user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-users__user-name {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.admin-users__you-badge {
  padding: 0.0625rem 0.375rem;
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 8px;
}

.admin-users__user-email {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.admin-users__role-badge {
  display: inline-block;
  padding: 0.1875rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.admin-users__role-badge--admin {
  background: rgba(110, 231, 168, 0.12);
  color: #6ee7a8;
}

.admin-users__cell-date {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.admin-users__cell-actions {
  text-align: right;
}

.admin-users__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.admin-users__action:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.admin-users__action--danger:hover {
  background: rgba(248, 113, 113, 0.08);
  color: #f87171;
}

/* ─── Modals ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 440px;
  width: 90%;
}

.modal__icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 0.75rem;
}

.modal__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.modal__title--danger {
  color: #f87171;
  text-align: center;
}

.modal__text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.modal__warning-text {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.modal__field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.modal__field input {
  padding: 0.625rem 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.modal__field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.modal__field input::placeholder {
  color: var(--text-muted);
}

.modal__error {
  font-size: 0.75rem;
  color: #e54545;
}

.modal__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.modal__checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal__checkbox input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  background: transparent;
}

.modal__checkbox input[type="checkbox"]:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.modal__checkbox input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.modal__checkbox input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.modal__checkbox-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.modal__btn--primary {
  background: var(--accent);
  color: #fff;
}

.modal__btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.modal__btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal__btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.modal__btn--ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal__btn--danger {
  background: #dc2626;
  color: #fff;
}

.modal__btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.modal__btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

/* ─── Responsive ─── */
@media (max-width: 767px) {
  .admin-users__header {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-users__add-btn {
    justify-content: center;
    min-height: 44px;
  }

  .admin-users__table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .admin-users__table {
    min-width: 640px;
  }

  .modal {
    width: calc(100vw - 2rem);
  }

  .modal__actions {
    flex-direction: column;
  }

  .modal__btn {
    min-height: 44px;
  }
}
</style>
