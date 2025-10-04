import { db } from '../auth.js'
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc
} from 'firebase/firestore'
import { showModal, hideModal, validateForm } from '../ui.js'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'
import { getCurrentUser } from '../auth.js'
import { registerPage } from '../utils/pageRegistry.js'

let templatesData = []
let templatesUnsubscribe = null
let currentEditingTemplateId = null

// Initialize templates page
export function initializeTemplatesPage() {
  console.log('🔧 Initializing Templates page...')
  
  // Register the page in the auto-updating registry and trigger event
  registerPage('templates', {
    name: 'Templates',
    icon: '📋',
    description: 'Appointment templates management',
    category: 'main'
  })
  
  // Trigger page registry update event
  window.dispatchEvent(new CustomEvent('pageRegistryUpdated', {
    detail: { action: 'register', pageId: 'templates' }
  }))
  
  setupTemplatesPage()
  loadTemplates()
}

// Setup templates page functionality
function setupTemplatesPage() {
  // Add new template button
  const addTemplateBtn = document.getElementById('add-template-btn')
  if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', () => {
      currentEditingTemplateId = null
      openTemplateModal()
    })
  }

  // Template form submission
  const templateForm = document.getElementById('template-form')
  if (templateForm) {
    templateForm.addEventListener('submit', handleTemplateSubmit)
  }

  // Search functionality
  const searchInput = document.getElementById('templates-search')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTemplates(e.target.value)
    })
  }
}

// Load templates from Firestore
async function loadTemplates() {
  try {
    showLoading('Loading templates...')
    
    // Set up real-time listener
    const templatesRef = collection(db, 'templates')
    const q = query(templatesRef, orderBy('createdAt', 'desc'))
    
    templatesUnsubscribe = onSnapshot(q, (snapshot) => {
      templatesData = []
      snapshot.forEach((doc) => {
        templatesData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      renderTemplatesTable()
      hideLoading()
    }, (error) => {
      console.error('Error loading templates:', error)
      showNotification('Error loading templates', 'error')
      hideLoading()
    })
    
  } catch (error) {
    console.error('Error setting up templates listener:', error)
    showNotification('Error loading templates', 'error')
    hideLoading()
  }
}

// Render templates table
function renderTemplatesTable() {
  const tbody = document.querySelector('#templates-table tbody')
  if (!tbody) return

  if (templatesData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-data">
          <div class="no-data-content">
            <span class="no-data-icon">📋</span>
            <span class="no-data-text">No templates found</span>
            <button class="btn btn-primary" onclick="document.getElementById('add-template-btn').click()">
              Create Your First Template
            </button>
          </div>
        </td>
      </tr>
    `
    return
  }

  tbody.innerHTML = templatesData.map(template => `
    <tr>
      <td>
        <div class="template-name">
          <strong>${escapeHtml(template.name)}</strong>
          ${template.description ? `<br><small class="text-muted">${escapeHtml(template.description)}</small>` : ''}
        </div>
      </td>
      <td>
        <span class="badge badge-info">${template.appointments?.length || 0} appointments</span>
      </td>
      <td>
        <small class="text-muted">
          ${template.createdAt ? new Date(template.createdAt.toDate()).toLocaleDateString() : 'N/A'}
        </small>
      </td>
      <td>
        <small class="text-muted">
          ${template.updatedAt ? new Date(template.updatedAt.toDate()).toLocaleDateString() : 'N/A'}
        </small>
      </td>
      <td class="actions">
        <button class="btn btn-sm btn-info" onclick="previewTemplate('${template.id}')" title="Preview Template">
          👁️
        </button>
        <button class="btn btn-sm btn-secondary" onclick="editTemplate('${template.id}')" title="Edit Template">
          ✏️
        </button>
        <button class="btn btn-sm btn-secondary" onclick="duplicateTemplate('${template.id}')" title="Duplicate Template">
          📋
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${template.id}')" title="Delete Template">
          🗑️
        </button>
      </td>
    </tr>
  `).join('')

  // Update templates count
  const countElement = document.getElementById('templates-count')
  if (countElement) {
    countElement.textContent = templatesData.length
  }
}

// Open template modal
function openTemplateModal(template = null) {
  const modal = document.getElementById('template-modal')
  const modalTitle = document.getElementById('template-modal-title')
  const form = document.getElementById('template-form')
  
  if (!modal || !modalTitle || !form) return

  // Reset form
  form.reset()
  
  if (template) {
    // Edit mode
    modalTitle.textContent = 'Edit Template'
    document.getElementById('template-name').value = template.name || ''
    document.getElementById('template-description').value = template.description || ''
    
    // Populate appointments
    const appointmentsContainer = document.getElementById('template-appointments')
    appointmentsContainer.innerHTML = ''
    
    if (template.appointments && template.appointments.length > 0) {
      template.appointments.forEach((appointment, index) => {
        addAppointmentField(appointment, index)
      })
    } else {
      addAppointmentField()
    }
  } else {
    // Add mode
    modalTitle.textContent = 'Create New Template'
    
    // Add one empty appointment field
    const appointmentsContainer = document.getElementById('template-appointments')
    appointmentsContainer.innerHTML = ''
    addAppointmentField()
  }

  showModal('template-modal')
}

// Add appointment field
function addAppointmentField(appointment = null, index = null) {
  const container = document.getElementById('template-appointments')
  const fieldIndex = index !== null ? index : container.children.length
  
  const appointmentDiv = document.createElement('div')
  appointmentDiv.className = 'appointment-field'
  appointmentDiv.innerHTML = `
    <div class="appointment-field-header">
      <span class="appointment-number">Appointment ${fieldIndex + 1}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeAppointmentField(this)" title="Remove">
        ❌
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Title</label>
        <input type="text" name="appointment-title" class="form-input" value="${appointment?.title || ''}" required>
      </div>
      <div class="form-group">
        <label>Type</label>
        <select name="appointment-type" class="form-select" required>
          <option value="">Select Type</option>
          <option value="meeting" ${appointment?.type === 'meeting' ? 'selected' : ''}>Meeting</option>
          <option value="service" ${appointment?.type === 'service' ? 'selected' : ''}>Service</option>
          <option value="event" ${appointment?.type === 'event' ? 'selected' : ''}>Event</option>
          <option value="other" ${appointment?.type === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Duration (minutes)</label>
        <input type="number" name="appointment-duration" class="form-input" value="${appointment?.duration || 60}" min="15" max="480" step="15">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" name="appointment-location" class="form-input" value="${appointment?.location || ''}" placeholder="Optional">
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea name="appointment-description" class="form-textarea" rows="2" placeholder="Optional">${appointment?.description || ''}</textarea>
    </div>
  `
  
  container.appendChild(appointmentDiv)
  updateAppointmentNumbers()
}

// Remove appointment field
window.removeAppointmentField = function(button) {
  const appointmentField = button.closest('.appointment-field')
  const container = document.getElementById('template-appointments')
  
  // Don't allow removing the last appointment
  if (container.children.length <= 1) {
    showNotification('At least one appointment is required', 'warning')
    return
  }
  
  appointmentField.remove()
  updateAppointmentNumbers()
}

// Update appointment numbers
function updateAppointmentNumbers() {
  const fields = document.querySelectorAll('.appointment-field')
  fields.forEach((field, index) => {
    const numberSpan = field.querySelector('.appointment-number')
    if (numberSpan) {
      numberSpan.textContent = `Appointment ${index + 1}`
    }
  })
}

// Add appointment button
window.addAppointment = function() {
  addAppointmentField()
}

// Handle template form submission
async function handleTemplateSubmit(e) {
  e.preventDefault()
  
  const formData = new FormData(e.target)
  const user = getCurrentUser()
  
  if (!user) {
    showNotification('You must be logged in to save templates', 'error')
    return
  }

  try {
    showLoading('Saving template...')

    // Get form data
    const templateData = {
      name: formData.get('template-name').trim(),
      description: formData.get('template-description').trim(),
      appointments: [],
      updatedAt: new Date(),
      updatedBy: user.uid
    }

    // Collect appointments
    const appointmentFields = document.querySelectorAll('.appointment-field')
    appointmentFields.forEach(field => {
      const appointment = {
        title: field.querySelector('[name="appointment-title"]').value.trim(),
        type: field.querySelector('[name="appointment-type"]').value,
        duration: parseInt(field.querySelector('[name="appointment-duration"]').value) || 60,
        location: field.querySelector('[name="appointment-location"]').value.trim(),
        description: field.querySelector('[name="appointment-description"]').value.trim()
      }
      
      if (appointment.title && appointment.type) {
        templateData.appointments.push(appointment)
      }
    })

    // Validation
    if (!templateData.name) {
      showNotification('Template name is required', 'error')
      hideLoading()
      return
    }

    if (templateData.appointments.length === 0) {
      showNotification('At least one appointment is required', 'error')
      hideLoading()
      return
    }

    // Save to Firestore
    if (currentEditingTemplateId) {
      // Update existing template
      await updateDoc(doc(db, 'templates', currentEditingTemplateId), templateData)
      showNotification('Template updated successfully', 'success')
    } else {
      // Create new template
      templateData.createdAt = new Date()
      templateData.createdBy = user.uid
      await addDoc(collection(db, 'templates'), templateData)
      showNotification('Template created successfully', 'success')
    }

    hideModal('template-modal')
    hideLoading()
    
  } catch (error) {
    console.error('Error saving template:', error)
    showNotification('Error saving template', 'error')
    hideLoading()
  }
}

// Edit template
window.editTemplate = async function(templateId) {
  try {
    currentEditingTemplateId = templateId
    const template = templatesData.find(t => t.id === templateId)
    
    if (template) {
      openTemplateModal(template)
    } else {
      showNotification('Template not found', 'error')
    }
  } catch (error) {
    console.error('Error loading template for editing:', error)
    showNotification('Error loading template', 'error')
  }
}

// Duplicate template
window.duplicateTemplate = async function(templateId) {
  try {
    const template = templatesData.find(t => t.id === templateId)
    if (!template) {
      showNotification('Template not found', 'error')
      return
    }

    const user = getCurrentUser()
    if (!user) {
      showNotification('You must be logged in to duplicate templates', 'error')
      return
    }

    showLoading('Duplicating template...')

    const duplicatedTemplate = {
      name: `${template.name} (Copy)`,
      description: template.description,
      appointments: [...template.appointments],
      createdAt: new Date(),
      createdBy: user.uid,
      updatedAt: new Date(),
      updatedBy: user.uid
    }

    await addDoc(collection(db, 'templates'), duplicatedTemplate)
    showNotification('Template duplicated successfully', 'success')
    hideLoading()
    
  } catch (error) {
    console.error('Error duplicating template:', error)
    showNotification('Error duplicating template', 'error')
    hideLoading()
  }
}

// Delete template
window.deleteTemplate = async function(templateId) {
  const template = templatesData.find(t => t.id === templateId)
  if (!template) return

  const confirmed = confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)
  if (!confirmed) return

  try {
    showLoading('Deleting template...')
    await deleteDoc(doc(db, 'templates', templateId))
    showNotification('Template deleted successfully', 'success')
    hideLoading()
  } catch (error) {
    console.error('Error deleting template:', error)
    showNotification('Error deleting template', 'error')
    hideLoading()
  }
}

// Filter templates
function filterTemplates(searchTerm) {
  const tbody = document.querySelector('#templates-table tbody')
  if (!tbody) return

  const rows = tbody.querySelectorAll('tr')
  
  rows.forEach(row => {
    const templateName = row.querySelector('.template-name')
    if (templateName) {
      const text = templateName.textContent.toLowerCase()
      const matches = text.includes(searchTerm.toLowerCase())
      row.style.display = matches ? '' : 'none'
    }
  })
}

// Preview template
window.previewTemplate = async function(templateId) {
  try {
    const template = templatesData.find(t => t.id === templateId)
    if (!template) {
      showNotification('Template not found', 'error')
      return
    }

    // Build preview content
    const previewContent = generatePreviewHTML(template)
    
    // Show preview modal
    const modal = document.getElementById('template-preview-modal')
    const previewContainer = document.getElementById('template-preview-content')
    const previewTitle = document.getElementById('template-preview-title')
    const submitBtn = document.getElementById('submit-template-btn')
    
    if (modal && previewContainer && previewTitle) {
      previewTitle.textContent = template.name
      previewContainer.innerHTML = previewContent
      
      // Setup submit button with template data
      if (submitBtn) {
        // Remove existing listeners
        const newSubmitBtn = submitBtn.cloneNode(true)
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn)
        
        // Add new listener for this template
        newSubmitBtn.addEventListener('click', () => {
          submitTemplate(template)
        })
      }
      
      showModal('template-preview-modal')
    }
    
  } catch (error) {
    console.error('Error previewing template:', error)
    showNotification('Error loading template preview', 'error')
  }
}

// Generate preview HTML for a template
function generatePreviewHTML(template) {
  const totalDuration = template.appointments?.reduce((sum, apt) => sum + (apt.duration || 0), 0) || 0
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60
  
  return `
    <div class="template-preview">
      <div class="preview-header">
        <h3>${escapeHtml(template.name)}</h3>
        ${template.description ? `<p class="template-description">${escapeHtml(template.description)}</p>` : ''}
        <div class="template-stats">
          <span class="stat-item">
            <strong>${template.appointments?.length || 0}</strong> appointments
          </span>
          <span class="stat-item">
            <strong>${hours > 0 ? hours + 'h ' : ''}${minutes}min</strong> total duration
          </span>
        </div>
      </div>
      
      <div class="appointments-preview">
        <h4>📅 Appointments Schedule</h4>
        ${template.appointments?.length > 0 ? 
          template.appointments.map((appointment, index) => `
            <div class="appointment-preview-item">
              <div class="appointment-header">
                <span class="appointment-index">${index + 1}.</span>
                <span class="appointment-title">${escapeHtml(appointment.title)}</span>
                <span class="appointment-duration">${appointment.duration || 0} min</span>
              </div>
              <div class="appointment-details">
                <span class="appointment-type badge-${appointment.type}">${appointment.type}</span>
                ${appointment.location ? `<span class="appointment-location">📍 ${escapeHtml(appointment.location)}</span>` : ''}
              </div>
              ${appointment.description ? `<p class="appointment-description">${escapeHtml(appointment.description)}</p>` : ''}
            </div>
          `).join('') : 
          '<p class="no-appointments">No appointments defined</p>'
        }
      </div>
      
      <div class="preview-timeline">
        <h4>⏰ Timeline Preview</h4>
        ${generateTimelinePreview(template.appointments || [])}
      </div>
    </div>
  `
}

// Submit template (use the template for actual appointment creation)
async function submitTemplate(template) {
  try {
    const user = getCurrentUser()
    if (!user) {
      showNotification('You must be logged in to submit templates', 'error')
      return
    }

    showLoading('Processing template submission...')

    // Here you can implement the actual submission logic
    // For example, create appointments based on the template
    
    // For now, we'll show a success message and close the modal
    // You can customize this based on your specific needs
    
    console.log('📋 Submitting template:', template)
    
    // Example: Create appointments from template
    const appointmentPromises = template.appointments.map(async (appointment, index) => {
      const appointmentData = {
        title: appointment.title,
        type: appointment.type,
        duration: appointment.duration || 60,
        location: appointment.location || '',
        description: appointment.description || '',
        templateId: template.id,
        templateName: template.name,
        order: index + 1,
        createdBy: user.uid,
        createdAt: new Date(),
        status: 'scheduled'
      }
      
      // Add to appointments collection
      await addDoc(collection(db, 'appointments'), appointmentData)
      return appointmentData
    })
    
    await Promise.all(appointmentPromises)
    
    hideLoading()
    hideModal('template-preview-modal')
    
    showNotification(`Template "${template.name}" submitted successfully! ${template.appointments.length} appointments created.`, 'success')
    
    // Optional: Navigate to appointments page to show the created appointments
    // window.location.hash = '#appointments'
    
  } catch (error) {
    console.error('Error submitting template:', error)
    hideLoading()
    showNotification('Error submitting template', 'error')
  }
}

// Generate timeline preview
function generateTimelinePreview(appointments) {
  if (!appointments.length) return '<p class="no-timeline">No timeline available</p>'
  
  let currentTime = 0
  const startTime = new Date()
  startTime.setHours(9, 0, 0, 0) // Default start at 9:00 AM
  
  return appointments.map((appointment, index) => {
    const appointmentStart = new Date(startTime.getTime() + currentTime * 60000)
    const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration || 0) * 60000)
    
    const timeRange = `${appointmentStart.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })} - ${appointmentEnd.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })}`
    
    currentTime += appointment.duration || 0
    
    return `
      <div class="timeline-item">
        <div class="timeline-time">${timeRange}</div>
        <div class="timeline-content">
          <div class="timeline-title">${escapeHtml(appointment.title)}</div>
          <div class="timeline-type">${appointment.type}</div>
        </div>
      </div>
    `
  }).join('')
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Cleanup on page unload
export function cleanupTemplatesPage() {
  if (templatesUnsubscribe) {
    templatesUnsubscribe()
    templatesUnsubscribe = null
  }
}