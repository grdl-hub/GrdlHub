import { db } from '../auth.js'
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore'
import { showModal, hideModal, validateForm, setupResponsiveTable } from '../ui.js'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'
import { getRolePermissions, getAvailablePages, validatePermissions } from '../accessControl.js'

let usersData = []
let usersUnsubscribe = null

// Initialize users page
export function initializeUsersPage() {
  try {
    setupUsersPage()
    console.log('Users page initialized')
  } catch (error) {
    console.error('Error initializing users page:', error)
  }
}

// Setup users page functionality
function setupUsersPage() {
  // Add user button
  const addUserBtn = document.getElementById('add-user-btn')
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      showAddUserModal()
    })
  }
  
  // Search functionality
  const searchInput = document.getElementById('search-input')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterUsers(e.target.value)
    })
  }
  
  // Role filter
  const roleFilter = document.getElementById('role-filter')
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      filterUsersByRole(e.target.value)
    })
  }
  
  // User form
  const userForm = document.getElementById('user-form')
  if (userForm) {
    userForm.addEventListener('submit', handleUserFormSubmit)
  }
  
  // Setup responsive table
  const usersTable = document.getElementById('users-table')
  setupResponsiveTable(usersTable)
  
  // Load users when on users page
  const usersSection = document.getElementById('users')
  if (usersSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (usersSection.classList.contains('active')) {
            loadUsers()
          } else {
            unsubscribeFromUsers()
          }
        }
      })
    })
    
    observer.observe(usersSection, { attributes: true })
  }
}

// Load users from Firestore
async function loadUsers() {
  try {
    showLoading('Loading users...')
    
    // Set up real-time listener
    const usersRef = collection(db, 'users')
    const q = query(usersRef, orderBy('name'))
    
    usersUnsubscribe = onSnapshot(q, (snapshot) => {
      usersData = []
      snapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      renderUsers(usersData)
      updateUserStats()
      hideLoading()
    }, (error) => {
      console.error('Error loading users:', error)
      showNotification('Error loading users', 'error')
      hideLoading()
    })
  } catch (error) {
    console.error('Error setting up users listener:', error)
    showNotification('Error loading users', 'error')
    hideLoading()
  }
}

// Unsubscribe from users updates
function unsubscribeFromUsers() {
  if (usersUnsubscribe) {
    usersUnsubscribe()
    usersUnsubscribe = null
  }
}

// Render users table
function renderUsers(users) {
  const tbody = document.getElementById('users-tbody')
  if (!tbody) return
  
  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>No users found</p>
          <button class="btn btn-primary" onclick="showAddUserModal()">Add First User</button>
        </td>
      </tr>
    `
    return
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div class="user-info">
          <div class="user-avatar">${(user.name || user.email).charAt(0).toUpperCase()}</div>
          <div>
            <div class="user-name">${user.name || 'No Name'}</div>
            <div class="user-id">${user.id}</div>
          </div>
        </div>
      </td>
      <td>${user.email}</td>
      <td>
        <span class="role-badge role-${user.role || 'user'}">${user.role || 'user'}</span>
      </td>
      <td>
        <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
      </td>
      <td>
        <span class="last-login">
          ${user.lastLogin ? formatDate(user.lastLogin.toDate()) : 'Never'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-edit" onclick="editUser('${user.id}')" title="Edit">
            ✏️
          </button>
          <button class="btn-action btn-invite" onclick="sendInvite('${user.id}')" title="Send Invite">
            📧
          </button>
          <button class="btn-action btn-delete" onclick="deleteUser('${user.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

// Update user statistics
function updateUserStats() {
  const usersCount = document.getElementById('users-count')
  if (usersCount) {
    usersCount.textContent = usersData.length
  }
}

// Filter users by search term
function filterUsers(searchTerm) {
  const filteredUsers = usersData.filter(user => {
    const searchStr = searchTerm.toLowerCase()
    return (
      (user.name || '').toLowerCase().includes(searchStr) ||
      user.email.toLowerCase().includes(searchStr) ||
      (user.role || '').toLowerCase().includes(searchStr)
    )
  })
  
  renderUsers(filteredUsers)
}

// Filter users by role
function filterUsersByRole(role) {
  if (!role) {
    renderUsers(usersData)
    return
  }
  
  const filteredUsers = usersData.filter(user => (user.role || 'user') === role)
  renderUsers(filteredUsers)
}

// Show add user modal
function showAddUserModal() {
  const modal = document.getElementById('user-modal')
  const modalTitle = document.getElementById('user-modal-title')
  const saveBtn = document.getElementById('save-user-btn')
  
  modalTitle.textContent = 'Add New User'
  saveBtn.textContent = 'Save User'
  
  // Reset form
  document.getElementById('user-form').reset()
  
  // Setup permissions checkboxes
  setupPermissionsCheckboxes()
  
  showModal('user-modal')
}

// Setup permissions checkboxes
function setupPermissionsCheckboxes() {
  const permissionsContainer = document.getElementById('user-permissions')
  if (!permissionsContainer) return
  
  const availablePages = getAvailablePages()
  
  permissionsContainer.innerHTML = Object.entries(availablePages).map(([pageId, pageInfo]) => `
    <div class="permission-item">
      <input type="checkbox" id="permission-${pageId}" name="permissions" value="${pageId}">
      <label for="permission-${pageId}" class="permission-label">
        <span class="permission-icon">${pageInfo.icon}</span>
        <span class="permission-name">${pageInfo.name}</span>
        <span class="permission-desc">${pageInfo.description}</span>
      </label>
    </div>
  `).join('')
  
  // Handle role change to update default permissions
  const roleSelect = document.getElementById('user-role')
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      const role = e.target.value
      if (role) {
        const defaultPermissions = getRolePermissions(role)
        updatePermissionsCheckboxes(defaultPermissions)
      }
    })
  }
}

// Update permissions checkboxes
function updatePermissionsCheckboxes(permissions) {
  const checkboxes = document.querySelectorAll('input[name="permissions"]')
  checkboxes.forEach(checkbox => {
    checkbox.checked = permissions.includes(checkbox.value)
  })
}

// Handle user form submission
async function handleUserFormSubmit(e) {
  e.preventDefault()
  
  if (!validateForm(e.target)) {
    return
  }
  
  const formData = new FormData(e.target)
  const name = formData.get('user-name')
  const email = formData.get('user-email')
  const role = formData.get('user-role')
  const permissions = Array.from(formData.getAll('permissions'))
  
  try {
    showLoading('Saving user...')
    
    const userData = {
      name,
      email,
      role,
      permissions: validatePermissions(permissions),
      status: 'invited',
      createdAt: new Date()
    }
    
    // Create user document
    const userRef = doc(collection(db, 'users'))
    await setDoc(userRef, userData)
    
    showNotification('User added successfully!', 'success')
    hideModal('user-modal')
    hideLoading()
  } catch (error) {
    console.error('Error saving user:', error)
    showNotification('Error saving user', 'error')
    hideLoading()
  }
}

// Edit user
window.editUser = function(userId) {
  const user = usersData.find(u => u.id === userId)
  if (!user) return
  
  const modal = document.getElementById('user-modal')
  const modalTitle = document.getElementById('user-modal-title')
  const saveBtn = document.getElementById('save-user-btn')
  
  modalTitle.textContent = 'Edit User'
  saveBtn.textContent = 'Update User'
  
  // Fill form with user data
  document.getElementById('user-name').value = user.name || ''
  document.getElementById('user-email').value = user.email
  document.getElementById('user-role').value = user.role || 'user'
  
  // Setup permissions and select current ones
  setupPermissionsCheckboxes()
  updatePermissionsCheckboxes(user.permissions || [])
  
  // Update form handler for editing
  const userForm = document.getElementById('user-form')
  userForm.onsubmit = async (e) => {
    e.preventDefault()
    await updateUser(userId, e.target)
  }
  
  showModal('user-modal')
}

// Update user
async function updateUser(userId, form) {
  if (!validateForm(form)) {
    return
  }
  
  const formData = new FormData(form)
  const name = formData.get('user-name')
  const email = formData.get('user-email')
  const role = formData.get('user-role')
  const permissions = Array.from(formData.getAll('permissions'))
  
  try {
    showLoading('Updating user...')
    
    const userData = {
      name,
      email,
      role,
      permissions: validatePermissions(permissions),
      updatedAt: new Date()
    }
    
    await setDoc(doc(db, 'users', userId), userData, { merge: true })
    
    showNotification('User updated successfully!', 'success')
    hideModal('user-modal')
    hideLoading()
  } catch (error) {
    console.error('Error updating user:', error)
    showNotification('Error updating user', 'error')
    hideLoading()
  }
}

// Delete user
window.deleteUser = async function(userId) {
  const user = usersData.find(u => u.id === userId)
  if (!user) return
  
  if (!confirm(`Are you sure you want to delete ${user.name || user.email}?`)) {
    return
  }
  
  try {
    showLoading('Deleting user...')
    await deleteDoc(doc(db, 'users', userId))
    showNotification('User deleted successfully!', 'success')
    hideLoading()
  } catch (error) {
    console.error('Error deleting user:', error)
    showNotification('Error deleting user', 'error')
    hideLoading()
  }
}

// Send invite
window.sendInvite = async function(userId) {
  const user = usersData.find(u => u.id === userId)
  if (!user) return
  
  try {
    showLoading('Sending invite...')
    
    // Import auth functions
    const { sendInviteLink } = await import('../auth.js')
    
    // Send invite link
    const inviteLink = await sendInviteLink(user.email, userId)
    
    // Show invite modal with link
    showInviteModal(user, inviteLink)
    
    hideLoading()
  } catch (error) {
    console.error('Error sending invite:', error)
    showNotification('Error sending invite', 'error')
    hideLoading()
  }
}

// Show invite modal
function showInviteModal(user, inviteLink) {
  const authResult = document.createElement('div')
  authResult.className = 'modal'
  authResult.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Invite Sent</h3>
        <button class="close-btn" onclick="closeInviteModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>Invite link for <strong>${user.name || user.email}</strong>:</p>
        <div class="invite-link-container">
          <input type="text" value="${inviteLink}" readonly class="form-input" id="invite-link-input">
          <button class="btn btn-secondary btn-small" onclick="copyInviteLink()">Copy</button>
        </div>
        <p class="invite-instructions">
          Share this link with the user so they can create their account and access the PWA.
          <br><strong>Note:</strong> This link expires in 24 hours.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeInviteModal()">Close</button>
      </div>
    </div>
  `
  
  document.body.appendChild(authResult)
  
  // Make functions available globally
  window.closeInviteModal = function() {
    document.body.removeChild(authResult)
    delete window.closeInviteModal
    delete window.copyInviteLink
  }
  
  window.copyInviteLink = function() {
    const input = document.getElementById('invite-link-input')
    input.select()
    navigator.clipboard.writeText(input.value).then(() => {
      showNotification('Invite link copied to clipboard', 'success')
    })
  }
}

// Format date
function formatDate(date) {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Make functions available globally
window.showAddUserModal = showAddUserModal
