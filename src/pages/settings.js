// Settings management functionality
import { 
  loadAppointmentTitles,
  addAppointmentTitle,
  updateAppointmentTitle,
  deleteAppointmentTitle,
  reorderAppointmentTitles
} from '../utils/appointmentTitles.js'
import {
  loadHomeSections,
  addHomeSection,
  updateHomeSection,
  deleteHomeSection,
  reorderHomeSections,
  getAvailablePages,
  initializeDefaultSections
} from '../utils/homeSections.js'
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
let homeSections = []
let privileges = []

export function initializeSettingsPage() {
  console.log('🔧 Initializing settings page...')
  
  // Debug: Check if the containers exist
  const appointmentContainer = document.getElementById('appointment-titles-management')
  const homeSectionsContainer = document.getElementById('home-sections-management')
  const privilegesContainer = document.getElementById('privileges-management')
  console.log('📋 Appointment titles container found:', !!appointmentContainer)
  console.log('🏠 Home sections container found:', !!homeSectionsContainer)
  console.log('👥 Privileges container found:', !!privilegesContainer)
  
  setupSettingsEventListeners()
  loadAppointmentTitlesForSettings()
  loadHomeSectionsForSettings()
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

// === HOME SECTIONS MANAGEMENT FUNCTIONS ===

async function loadHomeSectionsForSettings(forceRefresh = false) {
  try {
    console.log('🏠 Loading home sections for settings...')
    
    const isAdmin = await checkAdminAccess()
    console.log('👤 Admin access check result:', isAdmin)
    
    if (!isAdmin) {
      const container = document.getElementById('home-sections-management')
      if (container) {
        container.innerHTML = `
          <div class="admin-required">
            <p class="text-muted">👤 Admin access required to manage home sections</p>
          </div>
        `
      }
      return
    }
    
    console.log('🏠 Loading home sections from Firestore...')
    
    homeSections = await loadHomeSections()
    console.log('🏠 Loaded home sections:', homeSections.length)
    
    renderHomeSectionsInSettings()
    
  } catch (error) {
    console.error('❌ Error loading home sections for settings:', error)
    showNotification('Failed to load home sections', 'error')
  }
}

function renderHomeSectionsInSettings() {
  const container = document.getElementById('home-sections-management')
  console.log('🎨 Rendering home sections in settings, container found:', !!container)
  console.log('🏠 Sections to render:', homeSections.length)
  
  if (!container) return
  
  const availablePages = getAvailablePages()
  
  const html = `
    <div class="sections-management-header">
      <div class="sections-actions">
        <button id="add-section-btn" class="btn btn-primary btn-small">
          ➕ Add Section
        </button>
        <button id="refresh-sections-btn" class="btn btn-secondary btn-small">
          🔄 Refresh
        </button>
      </div>
      <p class="drag-instruction">💡 Drag and drop sections to reorder them</p>
    </div>
    
    <div class="sections-list" id="sections-list">
      ${homeSections.length > 0 ? 
        homeSections.map(section => renderHomeSectionItem(section, availablePages)).join('') :
        '<p class="text-muted">No home sections found. <button class="btn btn-link" onclick="initializeDefaultSections().then(() => loadHomeSectionsForSettings(true))">Initialize defaults</button></p>'
      }
    </div>
  `
  
  container.innerHTML = html
  console.log('✅ Home sections HTML set in container')
  
  // Re-attach event listeners
  setupHomeSectionsEventListeners()
  setupHomeSectionsDragAndDrop()
  console.log('✅ Home sections event listeners attached')
}

function renderHomeSectionItem(section, availablePages) {
  return `
    <div class="section-item" data-section-id="${section.firestoreId}" data-order="${section.order}">
      <div class="section-drag-handle">⋮⋮</div>
      <div class="section-info">
        <div class="section-header">
          <span class="section-title">${section.title}</span>
        </div>
      </div>
      <div class="section-actions">
        <button class="btn btn-secondary btn-small edit-section-btn" data-section-id="${section.firestoreId}">
          ✏️ Edit
        </button>
        <button class="btn btn-danger btn-small delete-section-btn" data-section-id="${section.firestoreId}">
          🗑️ Delete
        </button>
      </div>
    </div>
  `
}

function setupHomeSectionsEventListeners() {
  // Add section button
  const addSectionBtn = document.getElementById('add-section-btn')
  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', openAddSectionModal)
  }
  
  // Refresh sections button
  const refreshSectionsBtn = document.getElementById('refresh-sections-btn')
  if (refreshSectionsBtn) {
    refreshSectionsBtn.addEventListener('click', () => loadHomeSectionsForSettings(true))
  }
  
  // Initialize defaults button
  const initDefaultBtn = document.getElementById('init-default-sections-btn')
  if (initDefaultBtn) {
    initDefaultBtn.addEventListener('click', async () => {
      if (confirm('Reset to default sections? This will replace all current sections.')) {
        try {
          await initializeDefaultSections()
          loadHomeSectionsForSettings(true)
        } catch (error) {
          console.error('Error initializing defaults:', error)
        }
      }
    })
  }
  
  // Edit and delete buttons
  document.querySelectorAll('.edit-section-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionId = e.target.dataset.sectionId
      openEditSectionModal(sectionId)
    })
  })
  
  document.querySelectorAll('.delete-section-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionId = e.target.dataset.sectionId
      deleteSectionWithConfirm(sectionId)
    })
  })
}

function setupHomeSectionsDragAndDrop() {
  const sectionsList = document.getElementById('sections-list')
  if (!sectionsList) return
  
  let draggedElement = null
  
  sectionsList.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('section-item')) {
      draggedElement = e.target
      e.target.style.opacity = '0.5'
    }
  })
  
  sectionsList.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('section-item')) {
      e.target.style.opacity = '1'
      draggedElement = null
    }
  })
  
  sectionsList.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
  
  sectionsList.addEventListener('drop', async (e) => {
    e.preventDefault()
    
    if (!draggedElement) return
    
    const targetElement = e.target.closest('.section-item')
    if (!targetElement || targetElement === draggedElement) return
    
    // Reorder logic similar to appointment titles
    const allItems = Array.from(sectionsList.querySelectorAll('.section-item'))
    const draggedIndex = allItems.indexOf(draggedElement)
    const targetIndex = allItems.indexOf(targetElement)
    
    if (draggedIndex < targetIndex) {
      targetElement.insertAdjacentElement('afterend', draggedElement)
    } else {
      targetElement.insertAdjacentElement('beforebegin', draggedElement)
    }
    
    // Update order in database
    await updateHomeSectionsOrder()
  })
  
  // Make items draggable
  document.querySelectorAll('.section-item').forEach(item => {
    item.draggable = true
  })
}

async function updateHomeSectionsOrder() {
  try {
    const sectionItems = document.querySelectorAll('.section-item')
    const sectionsWithNewOrder = Array.from(sectionItems).map((item, index) => ({
      firestoreId: item.dataset.sectionId,
      order: index + 1
    }))
    
    await reorderHomeSections(sectionsWithNewOrder)
    loadHomeSectionsForSettings(true)
  } catch (error) {
    console.error('Error updating sections order:', error)
    showNotification('Failed to update sections order', 'error')
  }
}

function getPageCheckboxes(selectedPages = []) {
  // Organize pages in logical groups with better ordering
  const availablePages = [
    // Main Content & Activity
    { id: 'monthly', label: '📅 Monthly View', category: 'main' },
    { id: 'appointments', label: '📋 Appointments', category: 'main' },
    { id: 'reports', label: '📊 Reports', category: 'main' },
    
    // People Management
    { id: 'availability', label: '🗓️ Availability', category: 'people' },
    { id: 'users', label: '👥 Users', category: 'people' },
    
    // Content & System
    { id: 'content', label: '📝 Content', category: 'system' },
    { id: 'pages', label: '📄 Pages', category: 'system' },
    { id: 'settings', label: '⚙️ Settings', category: 'system' },
    { id: 'admin', label: '🔧 Admin', category: 'system' }
  ]
  
  // Group pages by category for better organization
  const categories = {
    main: 'Main Features',
    people: 'People Management', 
    system: 'System & Admin'
  }
  
  let html = ''
  
  // Add selected pages section first (for reordering)
  if (selectedPages.length > 0) {
    html += `
      <div class="selected-pages-section">
        <div class="selected-pages-list" id="selected-pages-sortable">
    `
    
    // Show selected pages in their current order
    selectedPages.forEach((pageId, index) => {
      const page = availablePages.find(p => p.id === pageId)
      if (page) {
        html += `
          <div class="selected-page-item" data-page-id="${pageId}">
            <div class="drag-handle">⋮⋮</div>
            <span class="page-icon">${page.label}</span>
            <button type="button" class="remove-page-btn" onclick="removePageFromSelection('${pageId}')">×</button>
          </div>
        `
      }
    })
    
    html += `
        </div>
      </div>
    `
  }
  
  // Add available pages section
  html += `
    <div class="available-pages-section">
      <div class="available-pages-header">
        <span>Available Pages</span>
      </div>
      <div class="available-pages-list">
  `
  
  // List all pages in a simple flat list
  availablePages.forEach(page => {
    const isSelected = selectedPages.includes(page.id)
    html += `
      <label class="checkbox-item ${isSelected ? 'already-selected' : ''}">
        <input 
          type="checkbox" 
          name="available-pages" 
          value="${page.id}" 
          ${isSelected ? 'checked disabled' : ''}
          onchange="handlePageSelection('${page.id}', this.checked)"
        >
        ${page.label}
        ${isSelected ? '<span class="already-selected-badge">Added</span>' : ''}
      </label>
    `
  })
  
  html += `
      </div>
    </div>
    <input type="hidden" name="pages" id="pages-order" value="${selectedPages.join(',')}">
  `
  
  return html
}

// Global functions for page order management
window.handlePageSelection = function(pageId, isChecked) {
  const orderInput = document.getElementById('pages-order')
  let currentOrder = orderInput.value ? orderInput.value.split(',') : []
  
  if (isChecked) {
    // Add page to the end of the order
    if (!currentOrder.includes(pageId)) {
      currentOrder.push(pageId)
    }
  } else {
    // Remove page from order
    currentOrder = currentOrder.filter(id => id !== pageId)
  }
  
  // Update hidden input
  orderInput.value = currentOrder.join(',')
  
  // Refresh the display
  refreshPageOrderDisplay()
}

window.removePageFromSelection = function(pageId) {
  const orderInput = document.getElementById('pages-order')
  let currentOrder = orderInput.value ? orderInput.value.split(',') : []
  currentOrder = currentOrder.filter(id => id !== pageId)
  orderInput.value = currentOrder.join(',')
  
  // Uncheck the corresponding checkbox
  const checkbox = document.querySelector(`input[value="${pageId}"]`)
  if (checkbox) {
    checkbox.checked = false
    checkbox.disabled = false
    checkbox.closest('.checkbox-item').classList.remove('already-selected')
    const badge = checkbox.closest('.checkbox-item').querySelector('.already-selected-badge')
    if (badge) badge.remove()
  }
  
  refreshPageOrderDisplay()
}

function refreshPageOrderDisplay() {
  const modal = document.querySelector('.appointment-modal-overlay')
  if (!modal) return
  
  const orderInput = document.getElementById('pages-order')
  const currentOrder = orderInput.value ? orderInput.value.split(',') : []
  
  // Regenerate the checkbox area with new order
  const checkboxGroup = modal.querySelector('.checkbox-group')
  if (checkboxGroup) {
    checkboxGroup.innerHTML = getPageCheckboxes(currentOrder)
    setupPageOrderingSortable()
  }
}

function setupPageOrderingSortable() {
  const sortableList = document.getElementById('selected-pages-sortable')
  if (!sortableList) return
  
  // Simple drag and drop implementation
  let draggedElement = null
  
  sortableList.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('selected-page-item')) {
      draggedElement = e.target
      e.target.style.opacity = '0.5'
    }
  })
  
  sortableList.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('selected-page-item')) {
      e.target.style.opacity = '1'
      draggedElement = null
    }
  })
  
  sortableList.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
  
  sortableList.addEventListener('drop', (e) => {
    e.preventDefault()
    if (draggedElement && e.target.classList.contains('selected-page-item') && e.target !== draggedElement) {
      const rect = e.target.getBoundingClientRect()
      const middle = rect.top + rect.height / 2
      
      if (e.clientY < middle) {
        sortableList.insertBefore(draggedElement, e.target)
      } else {
        sortableList.insertBefore(draggedElement, e.target.nextSibling)
      }
      
      updatePageOrderFromDOM()
    }
  })
  
  // Make items draggable
  sortableList.querySelectorAll('.selected-page-item').forEach(item => {
    item.draggable = true
  })
}

function updatePageOrderFromDOM() {
  const sortableList = document.getElementById('selected-pages-sortable')
  if (!sortableList) return
  
  const pageIds = Array.from(sortableList.querySelectorAll('.selected-page-item'))
    .map(item => item.dataset.pageId)
  
  const orderInput = document.getElementById('pages-order')
  orderInput.value = pageIds.join(',')
}

function openAddSectionModal() {
  try {
    console.log('🏠 Opening add section modal')
    
    // Create the modal
    const modal = document.createElement('div')
    modal.className = 'appointment-modal-overlay'
    modal.innerHTML = `
      <div class="appointment-modal">
        <div class="appointment-modal-header">
          <h3>🏠 Add New Section</h3>
          <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
        </div>
        <div class="appointment-modal-content">
          <form id="add-section-form" class="appointment-form">
            <div class="form-group">
              <label for="add-section-title" class="form-label">Section Title *</label>
              <input 
                type="text" 
                id="add-section-title" 
                name="title" 
                class="form-input"
                required 
                maxlength="50"
                placeholder="Enter section title"
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Available Pages</label>
              <div class="checkbox-group" id="add-section-pages">
                ${getPageCheckboxes([])}
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.appointment-modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Add Section</button>
            </div>
          </form>
        </div>
      </div>
    `
    
    // Add modal to page
    document.body.appendChild(modal)
    
    // Focus on title input
    setTimeout(() => {
      document.getElementById('add-section-title').focus()
    }, 100)
    
    // Handle form submission
    const form = document.getElementById('add-section-form')
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const formData = new FormData(form)
      const pagesOrder = document.getElementById('pages-order').value
      const selectedPages = pagesOrder ? pagesOrder.split(',').filter(id => id.trim()) : []
      
      const newSection = {
        id: formData.get('title').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        title: formData.get('title').trim(),
        icon: '',
        enabled: true,
        pages: selectedPages
      }
      
      // Validate
      if (!newSection.title) {
        showNotification('Section title is required', 'error')
        return
      }
      
      if (selectedPages.length === 0) {
        showNotification('At least one page must be selected', 'error')
        return
      }
      
      try {
        // Add section to Firestore
        await addHomeSection(newSection)
        
        // Close modal
        modal.remove()
        
        // Refresh the sections list
        await loadHomeSectionsForSettings(true)
        
        showNotification('Section added successfully! 🎉', 'success')
        
      } catch (error) {
        console.error('Error adding section:', error)
        showNotification('Failed to add section', 'error')
      }
    })
    
    // Setup sortable after modal is added
    setTimeout(() => {
      setupPageOrderingSortable()
    }, 100)
    
  } catch (error) {
    console.error('Error opening add section modal:', error)
    showNotification('Failed to open add modal', 'error')
  }
}

async function openEditSectionModal(sectionId) {
  try {
    console.log('🏠 Opening edit section modal for:', sectionId)
    
    // Load the current sections to find the one to edit
    const sections = await loadHomeSections()
    const sectionToEdit = sections.find(s => s.firestoreId === sectionId)
    
    if (!sectionToEdit) {
      showNotification('Section not found', 'error')
      return
    }
    
    // Create the modal
    const modal = document.createElement('div')
    modal.className = 'appointment-modal-overlay'
    modal.innerHTML = `
      <div class="appointment-modal">
        <div class="appointment-modal-header">
          <h3>🏠 Edit Section</h3>
          <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
        </div>
        <div class="appointment-modal-content">
          <form id="edit-section-form" class="appointment-form">
            <div class="form-group">
              <label for="edit-section-title" class="form-label">Section Title *</label>
              <input 
                type="text" 
                id="edit-section-title" 
                name="title" 
                class="form-input"
                value="${sectionToEdit.title}" 
                required 
                maxlength="50"
                placeholder="Enter section title"
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Available Pages</label>
              <div class="checkbox-group" id="edit-section-pages">
                ${getPageCheckboxes(sectionToEdit.pages)}
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.appointment-modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Update Section</button>
            </div>
          </form>
        </div>
      </div>
    `
    
    // Add modal to page
    document.body.appendChild(modal)
    
    // Focus on title input
    setTimeout(() => {
      document.getElementById('edit-section-title').focus()
    }, 100)
    
    // Handle form submission
    const form = document.getElementById('edit-section-form')
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const formData = new FormData(form)
      const pagesOrder = document.getElementById('pages-order').value
      const selectedPages = pagesOrder ? pagesOrder.split(',').filter(id => id.trim()) : []
      
      const updatedSection = {
        title: formData.get('title').trim(),
        icon: sectionToEdit.icon || '',
        enabled: true,
        pages: selectedPages
      }
      
      // Validate
      if (!updatedSection.title) {
        showNotification('Section title is required', 'error')
        return
      }
      
      if (selectedPages.length === 0) {
        showNotification('At least one page must be selected', 'error')
        return
      }
      
      try {
        // Update section in Firestore
        await updateHomeSection(sectionId, updatedSection)
        
        // Close modal
        modal.remove()
        
        // Refresh the sections list
        await loadHomeSectionsForSettings(true)
        
        showNotification('Section updated successfully! 🎉', 'success')
        
      } catch (error) {
        console.error('Error updating section:', error)
        showNotification('Failed to update section', 'error')
      }
    })
    
    // Setup sortable after modal is added
    setTimeout(() => {
      setupPageOrderingSortable()
    }, 100)
    
  } catch (error) {
    console.error('Error opening edit section modal:', error)
    showNotification('Failed to open edit modal', 'error')
  }
}

async function deleteSectionWithConfirm(sectionId) {
  const section = homeSections.find(s => s.firestoreId === sectionId)
  if (!section) return
  
  if (confirm(`Delete section "${section.title}"? This action cannot be undone.`)) {
    try {
      await deleteHomeSection(sectionId)
      loadHomeSectionsForSettings(true)
    } catch (error) {
      console.error('Error deleting section:', error)
    }
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
