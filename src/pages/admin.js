// Admin Page - Appointment Titles Management
import { 
  loadAppointmentTitles,
  addAppointmentTitle,
  updateAppointmentTitle,
  deleteAppointmentTitle,
  reorderAppointmentTitles
} from '../utils/appointmentTitles.js'
import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { 
  collection, 
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore'
import { showNotification } from '../utils/notifications.js'

let appointmentTitles = []

export function initializeAdminPage() {
  console.log('🔧 Initializing admin page...')
  
  // Check if user is admin
  checkAdminAccess()
  
  setupAdminEventListeners()
  loadTitlesForAdmin()
  
  console.log('✅ Admin page initialized')
}

// Check if current user has admin access
async function checkAdminAccess() {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    showNotification('Please log in to access admin features', 'error')
    return false
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      showNotification('Admin access required', 'error')
      document.getElementById('admin-content').innerHTML = `
        <div class="access-denied">
          <h2>🔒 Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
        </div>
      `
      return false
    }
    return true
  } catch (error) {
    console.error('Error checking admin access:', error)
    showNotification('Error checking permissions', 'error')
    return false
  }
}

function setupAdminEventListeners() {
  // Add new title button
  const addTitleBtn = document.getElementById('add-title-btn')
  if (addTitleBtn) {
    addTitleBtn.addEventListener('click', openAddTitleModal)
  }
  
  // Refresh titles button
  const refreshBtn = document.getElementById('refresh-titles-btn')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadTitlesForAdmin(true))
  }
}

async function loadTitlesForAdmin(forceRefresh = false) {
  try {
    console.log('📋 Loading appointment titles for admin...')
    
    // Load all titles (including inactive ones for admin view)
    const allTitlesQuery = query(
      collection(db, 'appointmentTitles'),
      orderBy('displayOrder', 'asc'),
      orderBy('title', 'asc')
    )
    
    const snapshot = await getDocs(allTitlesQuery)
    appointmentTitles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    renderTitlesTable()
    await loadUsageStats()
    
  } catch (error) {
    console.error('❌ Error loading titles for admin:', error)
    showNotification('Failed to load appointment titles', 'error')
  }
}

async function loadUsageStats() {
  try {
    // Get usage count for each title
    for (const title of appointmentTitles) {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('title', '==', title.title)
      )
      
      const snapshot = await getDocs(appointmentsQuery)
      title.usageCount = snapshot.size
    }
    
    renderTitlesTable()
    
  } catch (error) {
    console.error('Error loading usage stats:', error)
  }
}

function renderTitlesTable() {
  const container = document.getElementById('titles-table-container')
  if (!container) return
  
  const html = `
    <div class="admin-titles-header">
      <h3>📋 Appointment Titles Management</h3>
      <div class="admin-actions">
        <button id="add-title-btn" class="btn btn-primary">
          ➕ Add New Title
        </button>
        <button id="refresh-titles-btn" class="btn btn-secondary">
          🔄 Refresh
        </button>
      </div>
    </div>
    
    <div class="titles-table-wrapper">
      <table class="titles-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Title</th>
            <th>Emoji</th>
            <th>Status</th>
            <th>Usage</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${appointmentTitles.map(title => renderTitleRow(title)).join('')}
        </tbody>
      </table>
    </div>
    
    ${appointmentTitles.length === 0 ? `
      <div class="empty-state">
        <p>No appointment titles found. Create your first title to get started.</p>
      </div>
    ` : ''}
  `
  
  container.innerHTML = html
  
  // Re-attach event listeners
  setupAdminEventListeners()
  setupTableEventListeners()
}

function renderTitleRow(title) {
  const createdDate = title.createdAt ? 
    new Date(title.createdAt.seconds * 1000).toLocaleDateString() : 
    'Unknown'
  
  const statusBadge = title.isActive ? 
    '<span class="status-badge active">Active</span>' : 
    '<span class="status-badge inactive">Inactive</span>'
  
  const usageCount = title.usageCount || 0
  const usageBadge = usageCount > 0 ? 
    `<span class="usage-badge">${usageCount} appointments</span>` : 
    '<span class="usage-badge zero">No usage</span>'
  
  return `
    <tr data-title-id="${title.id}" class="${!title.isActive ? 'inactive-row' : ''}">
      <td>
        <span class="order-number">${title.displayOrder}</span>
        <div class="order-controls">
          <button class="order-btn" onclick="moveTitle('${title.id}', 'up')" title="Move up">↑</button>
          <button class="order-btn" onclick="moveTitle('${title.id}', 'down')" title="Move down">↓</button>
        </div>
      </td>
      <td class="title-cell">
        <strong>${title.title}</strong>
      </td>
      <td class="emoji-cell">
        <span class="emoji-display">${title.emoji || '—'}</span>
      </td>
      <td>${statusBadge}</td>
      <td>${usageBadge}</td>
      <td class="date-cell">${createdDate}</td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="editTitle('${title.id}')">
          ✏️ Edit
        </button>
        ${title.isActive ? `
          <button class="btn btn-small btn-warning" onclick="deactivateTitle('${title.id}', '${title.title}', ${usageCount})">
            🚫 Remove
          </button>
        ` : `
          <button class="btn btn-small btn-success" onclick="reactivateTitle('${title.id}')">
            ✅ Restore
          </button>
        `}
      </td>
    </tr>
  `
}

function setupTableEventListeners() {
  // Event listeners are set up through onclick attributes in the HTML
  // This approach is used for dynamically generated content
}

// Global functions for table actions
window.editTitle = function(titleId) {
  const title = appointmentTitles.find(t => t.id === titleId)
  if (title) {
    openEditTitleModal(title)
  }
}

window.deactivateTitle = function(titleId, titleName, usageCount) {
  if (usageCount > 0) {
    const confirmed = confirm(
      `"${titleName}" is used in ${usageCount} appointment(s).\n\n` +
      `Removing it will:\n` +
      `• Hide it from future appointment forms\n` +
      `• Keep existing appointments unchanged\n\n` +
      `Are you sure you want to remove this title?`
    )
    
    if (!confirmed) return
  } else {
    const confirmed = confirm(`Are you sure you want to remove "${titleName}"?`)
    if (!confirmed) return
  }
  
  performDeactivateTitle(titleId)
}

window.reactivateTitle = function(titleId) {
  const title = appointmentTitles.find(t => t.id === titleId)
  if (title) {
    updateAppointmentTitle(titleId, { isActive: true })
      .then(() => {
        showNotification(`"${title.title}" restored successfully`, 'success')
        loadTitlesForAdmin(true)
      })
      .catch(error => {
        console.error('Error reactivating title:', error)
        showNotification('Failed to restore title', 'error')
      })
  }
}

window.moveTitle = function(titleId, direction) {
  const currentIndex = appointmentTitles.findIndex(t => t.id === titleId)
  if (currentIndex === -1) return
  
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  
  if (newIndex < 0 || newIndex >= appointmentTitles.length) return
  
  // Swap display orders
  const current = appointmentTitles[currentIndex]
  const target = appointmentTitles[newIndex]
  
  const updates = [
    { id: current.id, displayOrder: target.displayOrder },
    { id: target.id, displayOrder: current.displayOrder }
  ]
  
  reorderAppointmentTitles(updates)
    .then(() => {
      loadTitlesForAdmin(true)
    })
    .catch(error => {
      console.error('Error reordering titles:', error)
      showNotification('Failed to reorder titles', 'error')
    })
}

async function performDeactivateTitle(titleId) {
  try {
    await updateAppointmentTitle(titleId, { isActive: false })
    
    const title = appointmentTitles.find(t => t.id === titleId)
    showNotification(`"${title.title}" removed from dropdown`, 'success')
    
    loadTitlesForAdmin(true)
    
  } catch (error) {
    console.error('Error deactivating title:', error)
    showNotification('Failed to remove title', 'error')
  }
}

function openAddTitleModal() {
  const modal = document.createElement('div')
  modal.className = 'admin-modal-overlay'
  modal.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <h3>➕ Add New Appointment Title</h3>
        <button class="modal-close" onclick="this.closest('.admin-modal-overlay').remove()">✕</button>
      </div>
      <div class="admin-modal-content">
        <form id="add-title-form" class="admin-form">
          <div class="form-group">
            <label for="new-title" class="form-label">Title</label>
            <input type="text" id="new-title" class="form-input" placeholder="Enter title..." required>
          </div>
          
          <div class="form-group">
            <label for="new-emoji" class="form-label">Emoji (optional)</label>
            <input type="text" id="new-emoji" class="form-input emoji-input" placeholder="🎤" maxlength="2">
            <small class="form-help">Choose an emoji to represent this title</small>
          </div>
          
          <div class="form-group">
            <label for="new-order" class="form-label">Display Order</label>
            <input type="number" id="new-order" class="form-input" value="${appointmentTitles.length + 1}" min="1">
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Add Title</button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Setup form submission
  const form = document.getElementById('add-title-form')
  form.addEventListener('submit', handleAddTitle)
  
  // Focus on title input
  setTimeout(() => {
    document.getElementById('new-title').focus()
  }, 100)
}

function openEditTitleModal(title) {
  const modal = document.createElement('div')
  modal.className = 'admin-modal-overlay'
  modal.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <h3>✏️ Edit Appointment Title</h3>
        <button class="modal-close" onclick="this.closest('.admin-modal-overlay').remove()">✕</button>
      </div>
      <div class="admin-modal-content">
        <form id="edit-title-form" class="admin-form" data-title-id="${title.id}">
          <div class="form-group">
            <label for="edit-title" class="form-label">Title</label>
            <input type="text" id="edit-title" class="form-input" value="${title.title}" required>
          </div>
          
          <div class="form-group">
            <label for="edit-emoji" class="form-label">Emoji (optional)</label>
            <input type="text" id="edit-emoji" class="form-input emoji-input" value="${title.emoji || ''}" maxlength="2">
          </div>
          
          <div class="form-group">
            <label for="edit-order" class="form-label">Display Order</label>
            <input type="number" id="edit-order" class="form-input" value="${title.displayOrder}" min="1">
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Update Title</button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Setup form submission
  const form = document.getElementById('edit-title-form')
  form.addEventListener('submit', handleEditTitle)
  
  // Focus on title input
  setTimeout(() => {
    document.getElementById('edit-title').focus()
  }, 100)
}

async function handleAddTitle(e) {
  e.preventDefault()
  
  const titleData = {
    title: document.getElementById('new-title').value.trim(),
    emoji: document.getElementById('new-emoji').value.trim(),
    displayOrder: parseInt(document.getElementById('new-order').value)
  }
  
  if (!titleData.title) {
    showNotification('Title is required', 'error')
    return
  }
  
  try {
    await addAppointmentTitle(titleData)
    
    // Close modal
    document.querySelector('.admin-modal-overlay').remove()
    
    // Reload titles
    loadTitlesForAdmin(true)
    
  } catch (error) {
    console.error('Error adding title:', error)
    showNotification('Failed to add title', 'error')
  }
}

async function handleEditTitle(e) {
  e.preventDefault()
  
  const titleId = e.target.dataset.titleId
  const updates = {
    title: document.getElementById('edit-title').value.trim(),
    emoji: document.getElementById('edit-emoji').value.trim(),
    displayOrder: parseInt(document.getElementById('edit-order').value)
  }
  
  if (!updates.title) {
    showNotification('Title is required', 'error')
    return
  }
  
  try {
    await updateAppointmentTitle(titleId, updates)
    
    // Close modal
    document.querySelector('.admin-modal-overlay').remove()
    
    // Reload titles
    loadTitlesForAdmin(true)
    
  } catch (error) {
    console.error('Error updating title:', error)
    showNotification('Failed to update title', 'error')
  }
}