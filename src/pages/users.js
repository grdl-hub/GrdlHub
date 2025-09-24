import { db } from '../auth.js'
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  onSnapshot 
} from 'firebase/firestore'
import { showModal, hideModal, validateForm, setupResponsiveTable } from '../ui.js'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'
import { getRolePermissions, getAvailablePages, validatePermissions, updateUserPermissions } from '../accessControl.js'
import { loadActivePrivileges } from '../utils/privilegeManagement.js'

let usersData = []
let usersUnsubscribe = null
let currentEditingUserId = null // Track if we're editing a user
let privilegesCache = [] // Cache privileges for display names

// Initialize users page
export function initializeUsersPage() {
  try {
    setupUsersPage()
    loadPrivilegesCache()
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
  
  // User form submission handlers
  const addUserForm = document.getElementById('add-user-form')
  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUserSubmit)
  }
  
  const editUserForm = document.getElementById('edit-user-form')
  if (editUserForm) {
    editUserForm.addEventListener('submit', handleEditUserSubmit)
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
          </div>
        </div>
      </td>
      <td>${user.congregation || 'No Congregation'}</td>
      <td>${user.email}</td>
      <td>
        <span class="role-badge role-${user.role || 'user'}">${user.role || 'user'}</span>
      </td>
      <td>
        <span class="privilege-badge">${getPrivilegeDisplayName(user.privileges || user.privilege)}</span>
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
  const totalUsersCount = document.getElementById('total-users-count')
  
  if (totalUsersCount) {
    totalUsersCount.textContent = usersData.length
  }
}

// Filter users by search term
function filterUsers(searchTerm) {
  const filteredUsers = usersData.filter(user => {
    const searchStr = searchTerm.toLowerCase()
    return (
      (user.name || '').toLowerCase().includes(searchStr) ||
      user.email.toLowerCase().includes(searchStr) ||
      (user.congregation || '').toLowerCase().includes(searchStr) ||
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
  // Show modal first so elements are in DOM
  showModal('add-user-modal')
  
  // Reset the form to clear any previous values
  const form = document.getElementById('add-user-form')
  if (form) {
    form.reset()
  }
  
  // Then setup permissions checkboxes and privileges after modal is visible
  setTimeout(() => {
    setupPermissionsCheckboxes('add-user-permissions')
    loadPrivilegeOptions('add-user-privileges')
    
    // Ensure all privileges are unchecked for add user modal
    setTimeout(() => {
      const privilegeInputs = document.querySelectorAll('#add-user-privileges input[name="privileges"]')
      privilegeInputs.forEach(input => {
        input.checked = false
      })
    }, 50)
  }, 100)
}

// Setup permissions checkboxes
function setupPermissionsCheckboxes(containerId) {
  const permissionsContainer = document.getElementById(containerId)
  if (!permissionsContainer) return
  
  const availablePages = getAvailablePages()
  
  permissionsContainer.innerHTML = Object.entries(availablePages).map(([pageId, pageInfo]) => `
    <div class="permission-switch-item">
      <label class="permission-switch-label">
        <div class="permission-info">
          <span class="permission-icon">${pageInfo.icon}</span>
          <div class="permission-text">
            <span class="permission-name">${pageInfo.name} Page</span>
            <span class="permission-desc">Access to ${pageInfo.description}</span>
          </div>
        </div>
        <div class="permission-switch">
          <input type="checkbox" id="${containerId}-permission-${pageId}" name="permissions" value="${pageId}" class="permission-switch-input">
          <span class="permission-switch-slider"></span>
        </div>
      </label>
    </div>
  `).join('')
  
  // Handle role change to update default permissions
  const roleSelectId = containerId.replace('-permissions', '-role')
  const roleSelect = document.getElementById(roleSelectId)
  if (roleSelect) {
    // Remove existing listeners to prevent duplicates
    const newRoleSelect = roleSelect.cloneNode(true)
    roleSelect.parentNode.replaceChild(newRoleSelect, roleSelect)
    
    newRoleSelect.addEventListener('change', (e) => {
      const role = e.target.value
      if (role) {
        const defaultPermissions = getRolePermissions(role)
        updatePermissionsCheckboxes(containerId, defaultPermissions)
      }
    })
  }
}

// Update permissions checkboxes
function updatePermissionsCheckboxes(containerId, permissions) {
  const container = document.getElementById(containerId)
  if (!container) return
  
  const checkboxes = container.querySelectorAll('input[name="permissions"]')
  checkboxes.forEach(checkbox => {
    checkbox.checked = permissions.includes(checkbox.value)
  })
}

// Update privilege toggle switches
function updatePrivilegeCheckboxes(containerId, privileges) {
  const container = document.getElementById(containerId)
  if (!container) return
  
  const toggleInputs = container.querySelectorAll('input[name="privileges"]')
  toggleInputs.forEach(input => {
    input.checked = privileges.includes(input.value)
  })
}

// Load privilege options into checkbox grid
async function loadPrivilegeOptions(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return
  
  try {
    const privileges = await loadActivePrivileges()
    
    // Update cache for display names
    privilegesCache = privileges
    
    // Create iOS-style toggle switches
    container.innerHTML = privileges.map(privilege => `
      <div class="privilege-switch-item">
        <label class="privilege-switch-label">
          <span class="privilege-switch-name">${privilege.name}</span>
          <div class="privilege-switch">
            <input type="checkbox" id="${containerId}-privilege-${privilege.id}" name="privileges" value="${privilege.id}" class="privilege-switch-input">
            <span class="privilege-switch-slider"></span>
          </div>
        </label>
      </div>
    `).join('')
    
  } catch (error) {
    console.error('Error loading privileges:', error)
    container.innerHTML = '<div class="error-message">Error loading privileges</div>'
  }
}

// Get privilege display names by IDs (supports both single string and array)
function getPrivilegeDisplayName(privilegeData) {
  if (!privilegeData) return 'No Privileges'
  
  // Handle backward compatibility - convert single privilege to array
  let privilegeIds = []
  if (Array.isArray(privilegeData)) {
    privilegeIds = privilegeData
  } else if (typeof privilegeData === 'string' && privilegeData) {
    privilegeIds = [privilegeData]
  }
  
  if (privilegeIds.length === 0) return 'No Privileges'
  
  const privilegeNames = privilegeIds.map(id => {
    const privilege = privilegesCache.find(p => p.id === id)
    return privilege ? privilege.name : 'Unknown'
  }).filter(name => name !== 'Unknown')
  
  return privilegeNames.length > 0 ? privilegeNames.join(', ') : 'No Privileges'
}

// Load privileges cache for display names
async function loadPrivilegesCache() {
  try {
    privilegesCache = await loadActivePrivileges()
  } catch (error) {
    console.error('Error loading privileges cache:', error)
    privilegesCache = []
  }
}

// Check for duplicates in both local data and Firestore
async function checkForDuplicates(name, email, excludeUserId = null) {
  // Normalize data
  name = name.trim()
  email = email.trim().toLowerCase()
  
  // First check local data for immediate feedback
  const existingUserByEmail = usersData.find(user => 
    user.email.toLowerCase() === email.toLowerCase() && user.id !== excludeUserId
  )
  
  const existingUserByName = usersData.find(user => 
    user.name && user.name.toLowerCase() === name.toLowerCase() && user.id !== excludeUserId
  )
  
  if (existingUserByEmail) {
    return { isDuplicate: true, type: 'email', message: `A user with email "${email}" already exists` }
  }
  
  if (existingUserByName) {
    return { isDuplicate: true, type: 'name', message: `A user with name "${name}" already exists` }
  }
  
  // Additional Firestore-level check for extra safety
  try {
    const usersRef = collection(db, 'users')
    
    // Check email duplicates in Firestore
    const emailQuery = query(usersRef, where('email', '==', email.toLowerCase()))
    const emailSnapshot = await getDocs(emailQuery)
    
    if (!emailSnapshot.empty) {
      const existingEmailDoc = emailSnapshot.docs[0]
      if (existingEmailDoc.id !== excludeUserId) {
        return { isDuplicate: true, type: 'email', message: `A user with email "${email}" already exists in the database` }
      }
    }
    
    // Check name duplicates in Firestore
    const nameQuery = query(usersRef, where('name', '==', name))
    const nameSnapshot = await getDocs(nameQuery)
    
    if (!nameSnapshot.empty) {
      const existingNameDoc = nameSnapshot.docs[0]
      if (existingNameDoc.id !== excludeUserId) {
        return { isDuplicate: true, type: 'name', message: `A user with name "${name}" already exists in the database` }
      }
    }
    
  } catch (error) {
    console.error('Error checking duplicates in Firestore:', error)
    // Continue with local validation if Firestore check fails
  }
  
  return { isDuplicate: false }
}

// Handle add user form submission
async function handleAddUserSubmit(e) {
  e.preventDefault()
  
  if (!validateForm(e.target)) {
    return
  }
  
  const formData = new FormData(e.target)
  const name = formData.get('user-name').trim()
  const congregation = formData.get('user-congregation').trim()
  const email = formData.get('user-email').trim().toLowerCase()
  const role = formData.get('user-role')
  const privileges = Array.from(formData.getAll('privileges'))
  const permissions = Array.from(formData.getAll('permissions'))
  
  // Show loading state for duplicate check
  showLoading('Checking for duplicates...')
  
  // Check for duplicates
  const duplicateCheck = await checkForDuplicates(name, email)
  
  if (duplicateCheck.isDuplicate) {
    showNotification(duplicateCheck.message, 'error')
    hideLoading()
    return
  }
  
  try {
    showLoading('Adding user...')
    
    const userData = {
      name,
      congregation,
      email: email.toLowerCase(),
      role,
      privileges: privileges || [],
      permissions: validatePermissions(permissions),
      status: 'invited',
      createdAt: new Date()
    }
    
    // Create new user
    const userRef = doc(collection(db, 'users'))
    await setDoc(userRef, userData)
    
    // Apply permission changes immediately for new user
    await updateUserPermissions(userRef.id, userData.permissions)
    
    showNotification('User added successfully! Page access permissions applied immediately.', 'success')
    
    // Reset form after successful submission
    e.target.reset()
    
    hideModal('add-user-modal')
    hideLoading()
  } catch (error) {
    console.error('Error adding user:', error)
    showNotification('Error adding user', 'error')
    hideLoading()
  }
}

// Handle edit user form submission  
async function handleEditUserSubmit(e) {
  e.preventDefault()
  
  if (!validateForm(e.target)) {
    return
  }
  
  const formData = new FormData(e.target)
  const name = formData.get('user-name').trim()
  const congregation = formData.get('user-congregation').trim()
  const email = formData.get('user-email').trim().toLowerCase()
  const role = formData.get('user-role')
  const privileges = Array.from(formData.getAll('privileges'))
  const permissions = Array.from(formData.getAll('permissions'))
  
  // Show loading state for duplicate check
  showLoading('Checking for duplicates...')
  
  // Check for duplicates (excluding current user)
  const duplicateCheck = await checkForDuplicates(name, email, currentEditingUserId)
  
  if (duplicateCheck.isDuplicate) {
    showNotification(duplicateCheck.message, 'error')
    hideLoading()
    return
  }
  
  try {
    showLoading('Updating user...')
    
    const userData = {
      name,
      congregation,
      email: email.toLowerCase(),
      role,
      privileges: privileges || [],
      permissions: validatePermissions(permissions),
      updatedAt: new Date()
    }
    
    // Update existing user
    await setDoc(doc(db, 'users', currentEditingUserId), userData, { merge: true })
    
    // Apply permission changes immediately
    await updateUserPermissions(currentEditingUserId, userData.permissions)
    
    showNotification('User updated successfully! Permissions applied immediately.', 'success')
    
    hideModal('edit-user-modal')
    hideLoading()
    currentEditingUserId = null
  } catch (error) {
    console.error('Error updating user:', error)
    showNotification('Error updating user', 'error')
    hideLoading()
  }
}

// Edit user
window.editUser = function(userId) {
  const user = usersData.find(u => u.id === userId)
  if (!user) return
  
  // Set editing state
  currentEditingUserId = userId
  
  // Show modal first
  showModal('edit-user-modal')
  
  // Setup permissions and populate form after modal is visible
  setTimeout(() => {
    setupPermissionsCheckboxes('edit-user-permissions')
    loadPrivilegeOptions('edit-user-privileges')
    
    // Fill form with user data
    document.getElementById('edit-user-name').value = user.name || ''
    document.getElementById('edit-user-congregation').value = user.congregation || ''
    document.getElementById('edit-user-email').value = user.email
    document.getElementById('edit-user-role').value = user.role || 'user'
    
    // Setup permissions and select current ones (with slight delay to ensure DOM is ready)
    setTimeout(() => {
      updatePermissionsCheckboxes('edit-user-permissions', user.permissions || [])
      updatePrivilegeCheckboxes('edit-user-privileges', user.privileges || (user.privilege ? [user.privilege] : []))
    }, 50)
  }, 100)
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

// Sign out function
window.signOut = async function() {
  if (!confirm('Are you sure you want to sign out?')) {
    return
  }
  
  try {
    showLoading('Signing out...')
    
    // Import auth functions
    const { signOutUser } = await import('../auth-standalone.js')
    
    // Sign out user
    await signOutUser()
    
    // Clear any local data
    usersData = []
    
    // Redirect to auth page
    showNotification('Signed out successfully', 'success')
    setTimeout(() => {
      window.location.href = '/auth.html'
    }, 1000)
    
  } catch (error) {
    console.error('Error signing out:', error)
    showNotification('Error signing out', 'error')
    hideLoading()
  }
}

// Make functions available globally
window.showAddUserModal = showAddUserModal
