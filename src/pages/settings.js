// Settings management functionality
import { 
  loadAppointmentTitles,
  addAppointmentTitle,
  updateAppointmentTitle,
  deleteAppointmentTitle,
  reorderAppointmentTitles
} from '../utils/appointmentTitles.js'
import {
  loadActivePrivileges,
  createPrivilege,
  updatePrivilege,
  deletePrivilege,
  initializeDefaultPrivileges
} from '../utils/privilegeManagement.js'
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
let privileges = []

export function initializeSettingsPage() {
  console.log('🔧 Initializing settings page...')
  
  // Debug: Check if the containers exist
  const appointmentContainer = document.getElementById('appointment-titles-management')
  const privilegesContainer = document.getElementById('privileges-management')
  console.log('📋 Appointment titles container found:', !!appointmentContainer)
  console.log('👥 Privileges container found:', !!privilegesContainer)
  
  setupSettingsEventListeners()
  loadAppointmentTitlesForSettings()
  loadPrivilegesForSettings()
  
  console.log('✅ Settings page initialized')
}

function setupSettingsEventListeners() {
  // Add new title button
  const addTitleBtn = document.getElementById('add-title-btn')
  if (addTitleBtn) {
    addTitleBtn.addEventListener('click', openAddTitleModal)
  }
  
  // Refresh titles button
  const refreshBtn = document.getElementById('refresh-titles-btn')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAppointmentTitlesForSettings(true))
  }
}

async function checkAdminAccess() {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    return false
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
    return userDoc.exists() && userDoc.data().role === 'admin'
  } catch (error) {
    console.error('Error checking admin access:', error)
    return false
  }
}

async function loadAppointmentTitlesForSettings(forceRefresh = false) {
  try {
    console.log('🔍 Starting to load appointment titles for settings...')
    
    const isAdmin = await checkAdminAccess()
    console.log('👤 Admin access check result:', isAdmin)
    
    if (!isAdmin) {
      const container = document.getElementById('appointment-titles-management')
      console.log('📋 Container found for non-admin message:', !!container)
      if (container) {
        container.innerHTML = `
          <div class="access-info">
            <p class="text-muted">👤 Admin access required to manage appointment titles</p>
          </div>
        `
        console.log('✅ Non-admin message displayed')
      }
      return
    }
    
    console.log('📋 Loading appointment titles for settings...')
    
    // Load all titles (including inactive ones for admin view)
    const allTitlesQuery = query(
      collection(db, 'appointmentTitles'),
      orderBy('displayOrder', 'asc')
    )
    
    const snapshot = await getDocs(allTitlesQuery)
    appointmentTitles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by displayOrder first, then by title as fallback (in case of same displayOrder)
    appointmentTitles.sort((a, b) => {
      const orderA = a.displayOrder ?? 999
      const orderB = b.displayOrder ?? 999
      
      if (orderA === orderB) {
        return a.title.localeCompare(b.title)
      }
      return orderA - orderB
    })
    
    console.log('📋 Loaded appointment titles:', appointmentTitles.length)
    
    await loadUsageStats()
    renderTitlesInSettings()
    
  } catch (error) {
    console.error('❌ Error loading titles for settings:', error)
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
  } catch (error) {
    console.error('Error loading usage stats:', error)
  }
}

function renderTitlesInSettings() {
  const container = document.getElementById('appointment-titles-management')
  console.log('🎨 Rendering titles in settings, container found:', !!container)
  console.log('📋 Titles to render:', appointmentTitles.length)
  
  if (!container) return
  
  const html = `
    <div class="titles-management-header">
      <div class="titles-actions">
        <button id="add-title-btn" class="btn btn-primary btn-small">
          ➕ Add Title
        </button>
        <button id="refresh-titles-btn" class="btn btn-secondary btn-small">
          🔄 Refresh
        </button>
      </div>
      <p class="drag-instruction">💡 Drag and drop titles to reorder them</p>
    </div>
    
    <div class="titles-list" id="titles-list">
      ${appointmentTitles.length > 0 ? 
        appointmentTitles.map(title => renderTitleItem(title)).join('') :
        '<p class="text-muted">No appointment titles found.</p>'
      }
    </div>
  `
  
  container.innerHTML = html
  console.log('✅ HTML set in container')
  
  // Re-attach event listeners
  setupSettingsEventListeners()
  setupDragAndDrop()
  console.log('✅ Event listeners reattached')
}

function renderTitleItem(title) {
  const usageCount = title.usageCount || 0
  const statusClass = title.isActive ? 'active' : 'inactive'
  
  return `
    <div class="title-item ${statusClass}" 
         data-title-id="${title.id}" 
         draggable="true"
         data-display-order="${title.displayOrder}">
      <div class="title-info">
        <div class="title-main">
          <span class="drag-handle">⋮⋮</span>
          <span class="title-emoji">${title.emoji || '📄'}</span>
          <span class="title-text">${title.title}</span>
          ${!title.isActive ? '<span class="inactive-badge">Inactive</span>' : ''}
        </div>
        ${usageCount > 0 ? `
          <div class="title-meta">
            <span class="title-usage">${usageCount} appointment${usageCount !== 1 ? 's' : ''}</span>
          </div>
        ` : ''}
      </div>
      <div class="title-actions">
        <button class="btn-icon" onclick="editTitleInSettings('${title.id}')" title="Edit">
          ✏️
        </button>
        ${title.isActive ? `
          <button class="btn-icon warning" onclick="deactivateTitleInSettings('${title.id}', '${title.title}', ${usageCount})" title="Remove">
            🚫
          </button>
        ` : `
          <button class="btn-icon success" onclick="reactivateTitleInSettings('${title.id}')" title="Restore">
            ✅
          </button>
        `}
      </div>
    </div>
  `
}

// Global functions for title management in settings
let draggedElement = null
let draggedIndex = null

function setupDragAndDrop() {
  const titlesList = document.getElementById('titles-list')
  if (!titlesList) return
  
  // Add event listeners to all title items
  const titleItems = titlesList.querySelectorAll('.title-item')
  
  titleItems.forEach((item, index) => {
    // Drag start
    item.addEventListener('dragstart', (e) => {
      draggedElement = item
      draggedIndex = index
      item.classList.add('dragging')
      
      // Set drag data
      e.dataTransfer.setData('text/plain', item.dataset.titleId)
      e.dataTransfer.effectAllowed = 'move'
      
      console.log('🎯 Drag started:', item.dataset.titleId, 'from index', index)
    })
    
    // Drag end
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging')
      
      // Remove all drop indicators
      titleItems.forEach(ti => ti.classList.remove('drop-above', 'drop-below'))
      
      draggedElement = null
      draggedIndex = null
    })
    
    // Drag over
    item.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      
      if (draggedElement && draggedElement !== item) {
        const rect = item.getBoundingClientRect()
        const midpoint = rect.top + rect.height / 2
        const mouseY = e.clientY
        
        // Remove previous indicators
        titleItems.forEach(ti => ti.classList.remove('drop-above', 'drop-below'))
        
        // Add appropriate indicator
        if (mouseY < midpoint) {
          item.classList.add('drop-above')
        } else {
          item.classList.add('drop-below')
        }
      }
    })
    
    // Drop
    item.addEventListener('drop', (e) => {
      e.preventDefault()
      
      if (draggedElement && draggedElement !== item) {
        const currentIndex = Array.from(titleItems).indexOf(item)
        const rect = item.getBoundingClientRect()
        const midpoint = rect.top + rect.height / 2
        const mouseY = e.clientY
        
        let newIndex = currentIndex
        if (mouseY > midpoint) {
          newIndex = currentIndex + 1
        }
        
        // Adjust for dragging from above
        if (draggedIndex < newIndex) {
          newIndex--
        }
        
        console.log('📍 Drop target:', newIndex, 'from', draggedIndex)
        
        // Perform the reorder
        reorderTitlesByDrop(draggedIndex, newIndex)
      }
      
      // Clean up indicators
      titleItems.forEach(ti => ti.classList.remove('drop-above', 'drop-below'))
    })
  })
}

function reorderTitlesByDrop(fromIndex, toIndex) {
  if (fromIndex === toIndex) return
  
  console.log('🔄 Reordering by drag: from', fromIndex, 'to', toIndex)
  
  // Create new array with reordered items
  const reorderedTitles = [...appointmentTitles]
  const [movedTitle] = reorderedTitles.splice(fromIndex, 1)
  reorderedTitles.splice(toIndex, 0, movedTitle)
  
  // Assign new display orders
  const updates = reorderedTitles.map((title, index) => ({
    id: title.id,
    displayOrder: index + 1
  }))
  
  console.log('📝 Display order updates:', updates)
  
  // Update in database
  reorderAppointmentTitles(updates)
    .then(() => {
      console.log('✅ Drag reordering successful')
      // Only need to refresh the settings view
      loadAppointmentTitlesForSettings(true)
    })
    .catch(error => {
      console.error('❌ Error in drag reordering:', error)
      showNotification('Failed to reorder titles', 'error')
    })
}

// Global functions for title management in settings
window.editTitleInSettings = function(titleId) {
  const title = appointmentTitles.find(t => t.id === titleId)
  if (title) {
    openEditTitleModal(title)
  }
}

window.deactivateTitleInSettings = function(titleId, titleName, usageCount) {
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

window.reactivateTitleInSettings = function(titleId) {
  const title = appointmentTitles.find(t => t.id === titleId)
  if (title) {
    updateAppointmentTitle(titleId, { isActive: true })
      .then(() => {
        showNotification(`"${title.title}" restored successfully`, 'success')
        // Only need to refresh the settings view
        loadAppointmentTitlesForSettings(true)
      })
      .catch(error => {
        console.error('Error reactivating title:', error)
        showNotification('Failed to restore title', 'error')
      })
  }
}

window.moveTitleInSettings = function(titleId, direction) {
  console.log('🔄 Moving title:', titleId, direction)
  
  const currentIndex = appointmentTitles.findIndex(t => t.id === titleId)
  if (currentIndex === -1) {
    console.error('Title not found:', titleId)
    return
  }
  
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  
  if (newIndex < 0 || newIndex >= appointmentTitles.length) {
    console.log('Cannot move further in that direction')
    return
  }
  
  console.log('Moving from index', currentIndex, 'to', newIndex)
  
  // Create a new array with the titles reordered
  const reorderedTitles = [...appointmentTitles]
  const [movedTitle] = reorderedTitles.splice(currentIndex, 1)
  reorderedTitles.splice(newIndex, 0, movedTitle)
  
  // Assign new display orders based on the new positions
  const updates = reorderedTitles.map((title, index) => ({
    id: title.id,
    displayOrder: index + 1
  }))
  
  console.log('Display order updates:', updates)
  
  reorderAppointmentTitles(updates)
    .then(() => {
      console.log('✅ Reordering successful')
      // Only need to refresh the settings view
      loadAppointmentTitlesForSettings(true)
    })
    .catch(error => {
      console.error('❌ Error reordering titles:', error)
      showNotification('Failed to reorder titles', 'error')
    })
}

async function performDeactivateTitle(titleId) {
  try {
    await updateAppointmentTitle(titleId, { isActive: false })
    
    const title = appointmentTitles.find(t => t.id === titleId)
    showNotification(`"${title.title}" removed from dropdown`, 'success')
    
    // Only need to refresh the settings view
    loadAppointmentTitlesForSettings(true)
    
  } catch (error) {
    console.error('Error deactivating title:', error)
    showNotification('Failed to remove title', 'error')
  }
}

function openAddTitleModal() {
  const modal = document.createElement('div')
  modal.className = 'modal-overlay'
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>➕ Add New Appointment Title</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-content">
        <form id="add-title-form" class="form">
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
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
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
  modal.className = 'modal-overlay'
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>✏️ Edit Appointment Title</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-content">
        <form id="edit-title-form" class="form" data-title-id="${title.id}">
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
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
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
    document.querySelector('.modal-overlay').remove()
    
    // Reload titles in settings only
    loadAppointmentTitlesForSettings(true)
    
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
    document.querySelector('.modal-overlay').remove()
    
    // Reload titles in settings only
    loadAppointmentTitlesForSettings(true)
    
  } catch (error) {
    console.error('Error updating title:', error)
    showNotification('Failed to update title', 'error')
  }
}

// === PRIVILEGE MANAGEMENT FUNCTIONS ===

async function loadPrivilegesForSettings(forceRefresh = false) {
  try {
    console.log('🔧 Checking admin access for privileges...')
    
    const isAdmin = await checkAdminAccess()
    console.log('👤 Admin access check result:', isAdmin)
    
    if (!isAdmin) {
      const container = document.getElementById('privileges-management')
      console.log('👥 Container found for non-admin message:', !!container)
      if (container) {
        container.innerHTML = `
          <div class="access-info">
            <p class="text-muted">👤 Admin access required to manage privileges</p>
          </div>
        `
        console.log('✅ Non-admin message displayed')
      }
      return
    }
    
    console.log('👥 Loading privileges for settings...')
    
    // Load all privileges (including inactive ones for admin view)
    const allPrivileges = await loadActivePrivileges(true) // Pass true to get all privileges
    privileges = allPrivileges
    
    console.log('👥 Privileges loaded:', privileges.length)
    
    renderPrivilegesManagement()
    
  } catch (error) {
    console.error('❌ Error loading privileges:', error)
    showNotification('Failed to load privileges', 'error')
  }
}

function renderPrivilegesManagement() {
  const container = document.getElementById('privileges-management')
  if (!container) {
    console.log('❌ Privileges management container not found')
    return
  }
  
  console.log('🎨 Rendering privileges management UI...')
  
  container.innerHTML = `
    <div class="management-header">
      <button id="add-privilege-btn" class="btn btn-primary btn-sm">
        ➕ Add Privilege
      </button>
      <button id="refresh-privileges-btn" class="btn btn-secondary btn-sm">
        🔄 Refresh
      </button>
    </div>
    
    <div class="privileges-list" id="privileges-list">
      ${renderPrivilegesList()}
    </div>
  `
  
  setupPrivilegeEventListeners()
  console.log('✅ Privileges management UI rendered')
}

function renderPrivilegesList() {
  if (privileges.length === 0) {
    return `
      <div class="empty-state">
        <p>No privileges found</p>
        <button class="btn btn-primary btn-sm" onclick="initializeDefaultPrivileges().then(() => loadPrivilegesForSettings(true))">
          Initialize Default Privileges
        </button>
      </div>
    `
  }
  
  return privileges.map(privilege => `
    <div class="privilege-item ${!privilege.active ? 'inactive' : ''}" data-id="${privilege.id}">
      <div class="privilege-info">
        <span class="privilege-name">${privilege.name}</span>
        <span class="privilege-status ${privilege.active ? 'active' : 'inactive'}">
          ${privilege.active ? '✅ Active' : '❌ Inactive'}
        </span>
      </div>
      <div class="privilege-actions">
        <button class="btn-action btn-edit" onclick="editPrivilege('${privilege.id}')" title="Edit">
          ✏️
        </button>
        <button class="btn-action btn-delete" onclick="confirmDeletePrivilege('${privilege.id}')" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `).join('')
}

function setupPrivilegeEventListeners() {
  // Add privilege button
  const addBtn = document.getElementById('add-privilege-btn')
  if (addBtn) {
    addBtn.addEventListener('click', openAddPrivilegeModal)
  }
  
  // Refresh button  
  const refreshBtn = document.getElementById('refresh-privileges-btn')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadPrivilegesForSettings(true))
  }
  
  // Modal form submissions
  const addForm = document.getElementById('add-privilege-form')
  if (addForm) {
    addForm.addEventListener('submit', handleAddPrivilegeSubmit)
  }
  
  const editForm = document.getElementById('edit-privilege-form')
  if (editForm) {
    editForm.addEventListener('submit', handleEditPrivilegeSubmit)
  }
  
  // Modal close buttons
  document.querySelectorAll('.modal-close, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', closePrivilegeModals)
  })
}

function openAddPrivilegeModal() {
  const modal = document.getElementById('add-privilege-modal')
  if (modal) {
    // Reset form
    document.getElementById('add-privilege-form').reset()
    document.getElementById('add-privilege-active').checked = true
    
    // Show modal
    modal.classList.remove('hidden')
    
    // Focus on name input
    document.getElementById('add-privilege-name').focus()
  }
}

async function handleAddPrivilegeSubmit(e) {
  e.preventDefault()
  
  const name = document.getElementById('add-privilege-name').value.trim()
  const active = document.getElementById('add-privilege-active').checked
  
  if (!name) {
    showNotification('Privilege name is required', 'error')
    return
  }
  
  try {
    await createPrivilege({ name, active })
    showNotification('Privilege added successfully!', 'success')
    
    // Close modal and refresh
    closePrivilegeModals()
    loadPrivilegesForSettings(true)
    
  } catch (error) {
    console.error('Error adding privilege:', error)
    showNotification('Failed to add privilege', 'error')
  }
}

window.editPrivilege = function(privilegeId) {
  const privilege = privileges.find(p => p.id === privilegeId)
  if (!privilege) return
  
  // Fill form
  document.getElementById('edit-privilege-name').value = privilege.name
  document.getElementById('edit-privilege-active').checked = privilege.active
  
  // Store current editing ID
  window.currentEditingPrivilegeId = privilegeId
  
  // Show modal
  const modal = document.getElementById('edit-privilege-modal')
  if (modal) {
    modal.classList.remove('hidden')
    document.getElementById('edit-privilege-name').focus()
  }
}

async function handleEditPrivilegeSubmit(e) {
  e.preventDefault()
  
  const privilegeId = window.currentEditingPrivilegeId
  if (!privilegeId) return
  
  const name = document.getElementById('edit-privilege-name').value.trim()
  const active = document.getElementById('edit-privilege-active').checked
  
  if (!name) {
    showNotification('Privilege name is required', 'error')
    return
  }
  
  try {
    await updatePrivilege(privilegeId, { name, active })
    showNotification('Privilege updated successfully!', 'success')
    
    // Close modal and refresh
    closePrivilegeModals()
    loadPrivilegesForSettings(true)
    
  } catch (error) {
    console.error('Error updating privilege:', error)
    showNotification('Failed to update privilege', 'error')
  }
}

window.confirmDeletePrivilege = async function(privilegeId) {
  const privilege = privileges.find(p => p.id === privilegeId)
  if (!privilege) return
  
  if (confirm(`Are you sure you want to delete the privilege "${privilege.name}"?\n\nThis action cannot be undone.`)) {
    try {
      await deletePrivilege(privilegeId)
      showNotification('Privilege deleted successfully!', 'success')
      loadPrivilegesForSettings(true)
    } catch (error) {
      console.error('Error deleting privilege:', error)
      showNotification('Failed to delete privilege', 'error')
    }
  }
}

function closePrivilegeModals() {
  document.getElementById('add-privilege-modal').classList.add('hidden')
  document.getElementById('edit-privilege-modal').classList.add('hidden')
  window.currentEditingPrivilegeId = null
}
