// Appointments Page Module - Handles recurring appointments and scheduling
import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { showNotification } from '../utils/notifications.js'
import { 
  loadAppointmentTitles, 
  generateTitleOptionsHTML,
  initializeDefaultTitles 
} from '../utils/appointmentTitles.js'

let currentDate = new Date()
let appointments = []

// Global function for title selection handling
window.handleTitleSelection = function(selectElement) {
  const customInput = selectElement.parentElement.querySelector('#apt-title')
  const selectedValue = selectElement.value
  
  if (selectedValue === 'custom') {
    // Show custom input and hide select requirement
    customInput.style.display = 'block'
    customInput.required = true
    customInput.focus()
    selectElement.required = false
  } else if (selectedValue !== '') {
    // Hide custom input and use selected value
    customInput.style.display = 'none'
    customInput.required = false
    customInput.value = selectedValue
    selectElement.required = true
  } else {
    // No selection made
    customInput.style.display = 'none'
    customInput.required = false
    customInput.value = ''
    selectElement.required = true
  }
}

// Helper function to get the current title value
function getCurrentTitleValue() {
  const selectElement = document.getElementById('apt-title-select')
  const inputElement = document.getElementById('apt-title')
  
  if (selectElement && selectElement.value === 'custom') {
    return inputElement.value.trim()
  } else if (selectElement && selectElement.value !== '') {
    return selectElement.value
  } else {
    return inputElement.value.trim()
  }
}

// Helper function to initialize the title dropdown for editing
async function initializeEditTitleDropdown(currentTitle) {
  try {
    const titles = await loadAppointmentTitles()
    const selectElement = document.getElementById('apt-title-select')
    const inputElement = document.getElementById('apt-title')
    
    if (!selectElement || !inputElement) {
      console.error('Title dropdown elements not found')
      return
    }
    
    // Check if current title matches any predefined option
    const matchingTitle = titles.find(title => title.title === currentTitle)
    
    if (matchingTitle) {
      selectElement.value = currentTitle
      inputElement.style.display = 'none'
      inputElement.required = false
      selectElement.required = true
    } else {
      // Use custom option
      selectElement.value = 'custom'
      inputElement.style.display = 'block'
      inputElement.value = currentTitle
      inputElement.required = true
      selectElement.required = false
    }
  } catch (error) {
    console.error('Error initializing edit title dropdown:', error)
  }
}

// Helper function to create title dropdown HTML dynamically
async function createTitleDropdownHTML(selectedTitle = '') {
  try {
    const titles = await loadAppointmentTitles()
    return `
      <select id="apt-title-select" class="form-select" onchange="handleTitleSelection(this)" required>
        ${generateTitleOptionsHTML(titles, selectedTitle)}
      </select>
      <input type="text" id="apt-title" class="form-input" placeholder="Enter custom title..." style="display: none; margin-top: 8px;" value="${selectedTitle}" required>
    `
  } catch (error) {
    console.error('Error loading titles for dropdown:', error)
    // Fallback to hardcoded options
    return `
      <select id="apt-title-select" class="form-select" onchange="handleTitleSelection(this)" required>
        <option value="">Select title...</option>
        <option value="Testemunho Público" ${selectedTitle === 'Testemunho Público' ? 'selected' : ''}>🎤 Testemunho Público</option>
        <option value="Reunião VMC" ${selectedTitle === 'Reunião VMC' ? 'selected' : ''}>📋 Reunião VMC</option>
        <option value="Reunião de Oração" ${selectedTitle === 'Reunião de Oração' ? 'selected' : ''}>🙏 Reunião de Oração</option>
        <option value="Estudo Bíblico" ${selectedTitle === 'Estudo Bíblico' ? 'selected' : ''}>📖 Estudo Bíblico</option>
        <option value="Culto Dominical" ${selectedTitle === 'Culto Dominical' ? 'selected' : ''}>⛪ Culto Dominical</option>
        <option value="custom">✏️ Custom...</option>
      </select>
      <input type="text" id="apt-title" class="form-input" placeholder="Enter custom title..." style="display: none; margin-top: 8px;" value="${selectedTitle}" required>
    `
  }
}

export function initializeAppointmentsPage() {
  console.log('🔧 Initializing appointments page...')
  
  // Initialize default appointment titles if needed
  initializeDefaultTitlesWithCheck()
  
  setupEventListeners()
  loadAppointments()
  renderCalendar()
  
  console.log('✅ Appointments page initialized')
}

// Helper function to initialize default titles with better error handling
async function initializeDefaultTitlesWithCheck() {
  try {
    await initializeDefaultTitles()
  } catch (error) {
    console.error('Failed to initialize default titles:', error)
    // Show a user-friendly message
    setTimeout(() => {
      showNotification('Note: Using default appointment titles. Admin can add custom titles later.', 'info')
    }, 2000)
  }
}

function setupEventListeners() {
  // Calendar navigation
  const prevMonthBtn = document.getElementById('prev-month')
  const nextMonthBtn = document.getElementById('next-month')
  
  if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1)
      renderCalendar()
    })
    
    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1)
      renderCalendar()
    })
  }
  
  // Floating Action Button - Add appointment
  const addAppointmentBtn = document.getElementById('add-appointment-btn')
  if (addAppointmentBtn) {
    addAppointmentBtn.addEventListener('click', () => {
      openAppointmentModal()
    })
  }
}

async function openAppointmentModal(preselectedDate = null) {
  await createAppointmentModal(preselectedDate)
}

// Make it globally available
window.openAppointmentModal = openAppointmentModal

// Debug function to manually initialize appointment titles (temporary)
window.initAppointmentTitlesManually = async function() {
  try {
    console.log('🔧 Manually initializing appointment titles...')
    await initializeDefaultTitles()
    showNotification('Appointment titles initialized successfully!', 'success')
    
    // Refresh the page to load the new titles
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error) {
    console.error('❌ Failed to initialize appointment titles:', error)
    showNotification('Failed to initialize appointment titles. Check console for details.', 'error')
  }
}

async function editAppointmentFromCalendar(appointmentId, occurrenceDate) {
  const appointment = appointments.find(apt => apt.id === appointmentId)
  if (!appointment) {
    showNotification('Appointment not found', 'error')
    return
  }
  
  if (appointment.repeatPattern && occurrenceDate) {
    // This is a recurring appointment - edit specific occurrence
    editAppointmentOccurrence(appointmentId, occurrenceDate)
  } else {
    // This is a single appointment or edit the entire series
    await openEditAppointmentModal(appointment)
  }
}

async function createAppointmentModal(preselectedDate = null) {
  // Remove any existing modal
  const existingModal = document.querySelector('.appointment-modal-overlay')
  if (existingModal) {
    existingModal.remove()
  }

  const today = new Date().toISOString().split('T')[0]
  const defaultDate = preselectedDate || today
  
  const now = new Date()
  now.setHours(now.getHours() + 1, 0, 0, 0)
  const defaultTime = now.toTimeString().slice(0, 5)

  // Get dynamic title dropdown HTML
  const titleDropdownHTML = await createTitleDropdownHTML()

  const modal = document.createElement('div')
  modal.className = 'appointment-modal-overlay'
  modal.innerHTML = `
    <div class="appointment-modal">
      <div class="appointment-modal-header">
        <h3>➕ Create New Appointment</h3>
        <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
      </div>
      <div class="appointment-modal-content">
        <form id="appointment-form" class="appointment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="apt-title-select" class="form-label">Title</label>
              ${titleDropdownHTML}
            </div>
            
            <div class="form-group">
              <label for="apt-place" class="form-label">Location/Place</label>
              <input type="text" id="apt-place" class="form-input" placeholder="Meeting room, address, or online..." list="place-suggestions">
              <datalist id="place-suggestions">
                <option value="Conference Room A">
                <option value="Conference Room B">
                <option value="Online - Zoom">
                <option value="Online - Teams">
                <option value="Client Office">
              </datalist>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-type" class="form-label">Type</label>
              <select id="apt-type" class="form-select">
                <option value="">Select type...</option>
                <option value="meeting">📋 Meeting</option>
                <option value="task">✅ Task</option>
                <option value="event">🎉 Event</option>
                <option value="reminder">⏰ Reminder</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="apt-duration" class="form-label">Duration (minutes)</label>
              <select id="apt-duration" class="form-select">
                <option value="15">15 min</option>
                <option value="30" selected>30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-date" class="form-label">Date</label>
              <input type="date" id="apt-date" class="form-input" value="${defaultDate}" required>
            </div>
            
            <div class="form-group">
              <label for="apt-time" class="form-label">Time</label>
              <input type="time" id="apt-time" class="form-input" value="${defaultTime}" required>
            </div>
          </div>

          <!-- Recurring Option Toggle -->
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="apt-is-recurring" class="form-checkbox">
              <span class="checkbox-text">🔄 Make this a recurring appointment</span>
            </label>
          </div>

          <!-- Hidden Recurring Options (shown when toggle is checked) -->
          <div id="recurring-options" class="recurring-options" style="display: none;">
            <div class="form-row">
              <div class="form-group">
                <label for="apt-repeat" class="form-label">Repeat Pattern</label>
                <select id="apt-repeat" class="form-select">
                  <option value="weekly">🔄 Weekly</option>
                  <option value="biweekly">🔄 Every 2 weeks</option>
                  <option value="monthly">🔄 Monthly</option>
                  <option value="quarterly">🔄 Quarterly</option>
                  <option value="yearly">🔄 Yearly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="apt-end-date" class="form-label">End Repeat (optional)</label>
                <input type="date" id="apt-end-date" class="form-input" placeholder="Leave empty for indefinite">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="apt-description" class="form-label">Description (optional)</label>
            <textarea id="apt-description" class="form-textarea" rows="3" placeholder="Additional notes or agenda..."></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.appointment-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">📅 Create Appointment</button>
          </div>
        </form>
      </div>
    </div>
  `

  document.body.appendChild(modal)
  
  // Setup modal event listeners
  setupModalEventListeners(modal)
  
  // Focus on title field
  setTimeout(() => {
    document.getElementById('apt-title').focus()
  }, 100)
  
  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Close modal on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
}

async function openEditAppointmentModal(appointment) {
  // Remove any existing modal
  const existingModal = document.querySelector('.appointment-modal-overlay')
  if (existingModal) {
    existingModal.remove()
  }

  // Get dynamic title dropdown HTML with current appointment title
  const titleDropdownHTML = await createTitleDropdownHTML(appointment.title)

  const modal = document.createElement('div')
  modal.className = 'appointment-modal-overlay'
  modal.innerHTML = `
    <div class="appointment-modal">
      <div class="appointment-modal-header">
        <h3>✏️ Edit ${appointment.repeatPattern ? 'Recurring ' : ''}Appointment</h3>
        <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
      </div>
      <div class="appointment-modal-content">
        <form id="appointment-form" class="appointment-form" data-editing-id="${appointment.id}">
          <div class="form-row">
            <div class="form-group">
              <label for="apt-title-select" class="form-label">Title</label>
              ${titleDropdownHTML}
            </div>
            
            <div class="form-group">
              <label for="apt-type" class="form-label">Type</label>
              <select id="apt-type" class="form-select" required>
                <option value="meeting" ${appointment.type === 'meeting' ? 'selected' : ''}>📋 Meeting</option>
                <option value="task" ${appointment.type === 'task' ? 'selected' : ''}>✅ Task</option>
                <option value="event" ${appointment.type === 'event' ? 'selected' : ''}>🎉 Event</option>
                <option value="reminder" ${appointment.type === 'reminder' ? 'selected' : ''}>⏰ Reminder</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-date" class="form-label">Date</label>
              <input type="date" id="apt-date" class="form-input" value="${appointment.date}" required>
            </div>
            
            <div class="form-group">
              <label for="apt-time" class="form-label">Time</label>
              <input type="time" id="apt-time" class="form-input" value="${appointment.time}" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="apt-place" class="form-label">Location/Place</label>
              <input type="text" id="apt-place" class="form-input" value="${appointment.place || ''}" placeholder="Meeting room, address, or online..." list="place-suggestions">
              <datalist id="place-suggestions">
                <option value="Conference Room A">
                <option value="Conference Room B">
                <option value="Online - Zoom">
                <option value="Online - Teams">
                <option value="Client Office">
              </datalist>
            </div>
            
            <div class="form-group">
              <label for="apt-duration" class="form-label">Duration (minutes)</label>
              <select id="apt-duration" class="form-select">
                <option value="15" ${appointment.duration === 15 ? 'selected' : ''}>15 min</option>
                <option value="30" ${appointment.duration === 30 ? 'selected' : ''}>30 min</option>
                <option value="45" ${appointment.duration === 45 ? 'selected' : ''}>45 min</option>
                <option value="60" ${appointment.duration === 60 ? 'selected' : ''}>1 hour</option>
                <option value="90" ${appointment.duration === 90 ? 'selected' : ''}>1.5 hours</option>
                <option value="120" ${appointment.duration === 120 ? 'selected' : ''}>2 hours</option>
              </select>
            </div>
          </div>

          <!-- Recurring Option Toggle -->
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="apt-is-recurring" class="form-checkbox" ${appointment.repeatPattern ? 'checked' : ''}>
              <span class="checkbox-text">🔄 Make this a recurring appointment</span>
            </label>
          </div>

          <!-- Hidden Recurring Options (shown when toggle is checked) -->
          <div id="recurring-options" class="recurring-options" style="display: ${appointment.repeatPattern ? 'block' : 'none'};">
            <div class="form-row">
              <div class="form-group">
                <label for="apt-repeat" class="form-label">Repeat Pattern</label>
                <select id="apt-repeat" class="form-select">
                  <option value="weekly" ${appointment.repeatPattern === 'weekly' ? 'selected' : ''}>🔄 Weekly</option>
                  <option value="biweekly" ${appointment.repeatPattern === 'biweekly' ? 'selected' : ''}>🔄 Every 2 weeks</option>
                  <option value="monthly" ${appointment.repeatPattern === 'monthly' ? 'selected' : ''}>🔄 Monthly</option>
                  <option value="quarterly" ${appointment.repeatPattern === 'quarterly' ? 'selected' : ''}>🔄 Quarterly</option>
                  <option value="yearly" ${appointment.repeatPattern === 'yearly' ? 'selected' : ''}>🔄 Yearly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="apt-end-date" class="form-label">End Repeat (optional)</label>
                <input type="date" id="apt-end-date" class="form-input" value="${appointment.endDate || ''}" placeholder="Leave empty for indefinite">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="apt-description" class="form-label">Description (optional)</label>
            <textarea id="apt-description" class="form-textarea" rows="3" placeholder="Additional notes or agenda...">${appointment.description || ''}</textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.appointment-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Update Appointment</button>
          </div>
        </form>
      </div>
    </div>
  `

  document.body.appendChild(modal)
  
  // Setup modal event listeners
  setupModalEventListeners(modal)
  
  // Focus on title field
  setTimeout(() => {
    const titleSelect = document.getElementById('apt-title-select')
    const titleInput = document.getElementById('apt-title')
    if (titleSelect && titleSelect.value === 'custom') {
      titleInput.focus()
    } else if (titleSelect) {
      titleSelect.focus()
    }
  }, 100)
  
  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Close modal on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
}

function setupModalEventListeners(modal) {
  // Appointment form submission
  const appointmentForm = modal.querySelector('#appointment-form')
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', handleCreateAppointment)
  }

  // Recurring appointment toggle
  const recurringCheckbox = modal.querySelector('#apt-is-recurring')
  const recurringOptions = modal.querySelector('#recurring-options')
  
  if (recurringCheckbox && recurringOptions) {
    recurringCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        recurringOptions.style.display = 'block'
        recurringOptions.classList.add('show')
      } else {
        recurringOptions.style.display = 'none'
        recurringOptions.classList.remove('show')
        // Clear the repeat pattern when unchecked
        modal.querySelector('#apt-repeat').value = ''
        modal.querySelector('#apt-end-date').value = ''
      }
    })
  }
}

async function handleCreateAppointment(e) {
  e.preventDefault()
  
  try {
    const formData = new FormData(e.target)
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      showNotification('You must be signed in to create appointments', 'error')
      return
    }
    
    // Check if we're editing an existing appointment
    const form = e.target
    const editingId = form.dataset.editingId
    const isEditing = !!editingId
    
    // Check if user wants recurring appointment
    const isRecurring = document.getElementById('apt-is-recurring').checked
    
    const appointmentData = {
      title: getCurrentTitleValue(),
      type: document.getElementById('apt-type').value,
      date: document.getElementById('apt-date').value,
      time: document.getElementById('apt-time').value,
      place: document.getElementById('apt-place').value,
      duration: parseInt(document.getElementById('apt-duration').value),
      repeatPattern: isRecurring ? document.getElementById('apt-repeat').value : null,
      endDate: isRecurring ? (document.getElementById('apt-end-date').value || null) : null,
      description: document.getElementById('apt-description').value
    }
    
    // Only set these fields for new appointments
    if (!isEditing) {
      appointmentData.exceptions = [] // Track cancelled/modified occurrences
      appointmentData.createdAt = Timestamp.now()
      appointmentData.createdBy = currentUser.uid
    }
    
    console.log(`${isEditing ? 'Updating' : 'Creating'} appointment with data:`, appointmentData)
    
    // Validate required fields
    if (!appointmentData.title || !appointmentData.type || !appointmentData.date || !appointmentData.time) {
      showNotification('Please fill in all required fields', 'error')
      return
    }
    
    // Enhanced validation
    const validationErrors = validateAppointmentForm(appointmentData)
    if (validationErrors.length > 0) {
      showNotification(validationErrors.join(' '), 'error')
      return
    }
    
    if (isEditing) {
      // Update existing appointment
      await updateDoc(doc(db, 'appointments', editingId), appointmentData)
      const updateMessage = isRecurring ? 
        'Recurring appointment updated successfully! All future occurrences will reflect the changes.' :
        'Appointment updated successfully!'
      showNotification(updateMessage, 'success')
      
      // Reset form from edit mode
      const submitBtn = form.querySelector('button[type="submit"]')
      submitBtn.textContent = '📅 Create Appointment'
      delete form.dataset.editingId
      
    } else {
      // Create new appointment
      await addDoc(collection(db, 'appointments'), appointmentData)
      const createMessage = isRecurring ? 
        'Recurring appointment created successfully! 🔄' :
        'Appointment created successfully! 📅'
      showNotification(createMessage, 'success')
    }
    
    // Close modal if we're in modal context
    const modal = document.querySelector('.appointment-modal-overlay')
    if (modal) {
      modal.remove()
    } else {
      // Clear inline form if not in modal
      clearForm()
    }
    
    await loadAppointments()
    renderCalendar()
    
  } catch (error) {
    console.error('Error creating appointment:', error)
    showNotification('Error creating appointment', 'error')
  }
}

function clearForm() {
  const form = document.getElementById('appointment-form')
  if (form) {
    form.reset()
    
    // Reset from edit mode if needed
    const submitBtn = form.querySelector('button[type="submit"]')
    if (submitBtn) {
      submitBtn.textContent = '📅 Create Appointment'
    }
    delete form.dataset.editingId
    
    // Reset to default values
    const today = new Date().toISOString().split('T')[0]
    document.getElementById('apt-date').value = today
    
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0)
    document.getElementById('apt-time').value = now.toTimeString().slice(0, 5)
    
    document.getElementById('apt-duration').value = '30'
    
    // Reset recurring options
    const recurringCheckbox = document.getElementById('apt-is-recurring')
    const recurringOptions = document.getElementById('recurring-options')
    if (recurringCheckbox && recurringOptions) {
      recurringCheckbox.checked = false
      recurringOptions.style.display = 'none'
      recurringOptions.classList.remove('show')
    }
  }
}

async function loadAppointments() {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      console.log('No user signed in, cannot load appointments')
      return
    }
    
    const appointmentsRef = collection(db, 'appointments')
    
    // First try with composite query (requires index)
    try {
      const q = query(
        appointmentsRef, 
        where('createdBy', '==', currentUser.uid),
        orderBy('date', 'asc')
      )
      const querySnapshot = await getDocs(q)
      
      appointments = []
      querySnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      console.log(`Loaded ${appointments.length} appointments for user ${currentUser.uid}`)
      
      // Re-render calendar after loading appointments
      renderCalendar()
      
    } catch (indexError) {
      console.warn('Index not ready yet, falling back to simple query:', indexError.message)
      
      // Fallback: Query without orderBy, then sort in JavaScript
      const q = query(appointmentsRef, where('createdBy', '==', currentUser.uid))
      const querySnapshot = await getDocs(q)
      
      appointments = []
      querySnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      // Sort in JavaScript
      appointments.sort((a, b) => new Date(a.date) - new Date(b.date))
      
      console.log(`Loaded ${appointments.length} appointments for user ${currentUser.uid} (sorted in JS)`)
      
      // Re-render calendar after loading appointments
      renderCalendar()
    }
    
  } catch (error) {
    console.error('Error loading appointments:', error)
    showNotification('Error loading appointments', 'error')
  }
}

function renderCalendar() {
  const calendarGrid = document.getElementById('calendar-grid')
  const monthYearDisplay = document.getElementById('current-month-year')
  
  if (!calendarGrid || !monthYearDisplay) return
  
  // Update month/year display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  monthYearDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  
  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  // Adjust for Monday start: 0=Sunday becomes 6, 1=Monday becomes 0, etc.
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  // Build calendar HTML - Starting with Monday
  let calendarHTML = `
    <div class="calendar-header-row">
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
      <div class="calendar-day-header">Sun</div>
    </div>
  `  // Add empty cells for days before first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>'
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    // Fix timezone issue by using local date string format
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Check if there are appointments on this day
    const dayAppointments = getAppointmentsForDate(dateString)
    const isToday = dayDate.toDateString() === new Date().toDateString()
    
    let dayClass = 'calendar-day'
    if (isToday) dayClass += ' today'
    if (dayAppointments.length > 0) dayClass += ' has-appointments'
    
    let appointmentsHTML = ''
    dayAppointments.slice(0, 3).forEach(apt => {
      let itemClass = `appointment-item ${apt.type}`
      let titleText = apt.title
      let timeText = apt.time
      
      // Add exception styling
      if (apt.exception) {
        if (apt.exception.action === 'cancelled') {
          itemClass += ' cancelled'
          titleText = `${apt.title}`
        } else if (apt.exception.action === 'modified') {
          itemClass += ' modified'
          titleText = `${apt.title}`
        }
      }
      
      appointmentsHTML += `
        <div class="${itemClass}" 
             title="${titleText} at ${timeText}"
             data-appointment-id="${apt.id}"
             data-occurrence-date="${dateString}">
          <div class="apt-time">${timeText}</div>
          <div class="apt-title ${apt.exception?.action === 'cancelled' ? 'strikethrough' : ''}">${titleText}</div>
        </div>
      `
    })
    
    if (dayAppointments.length > 3) {
      appointmentsHTML += `<div class="appointment-more">+${dayAppointments.length - 3} more</div>`
    }
    
    calendarHTML += `
      <div class="${dayClass}" data-date="${dateString}">
        <div class="day-number">${day}</div>
        <div class="appointments-preview">${appointmentsHTML}</div>
      </div>
    `
  }
  
  calendarGrid.innerHTML = calendarHTML
  
  // Add click handlers for calendar days
  const calendarDays = calendarGrid.querySelectorAll('.calendar-day[data-date]')
  calendarDays.forEach(day => {
    day.addEventListener('click', (e) => {
      const date = e.currentTarget.dataset.date
      
      // Check if click was on an appointment item
      const appointmentItem = e.target.closest('.appointment-item')
      if (appointmentItem) {
        // Click was on an appointment - open edit modal
        const appointmentId = appointmentItem.dataset.appointmentId
        const occurrenceDate = appointmentItem.dataset.occurrenceDate
        
        if (appointmentId) {
          editAppointmentFromCalendar(appointmentId, occurrenceDate)
        }
        return
      }
      
      // Click was on day number or empty space - open creation modal
      openAppointmentModal(date)
    })
  })
}

function getAppointmentsForDate(dateString) {
  const dayAppointments = []
  
  // Debug: Only log if we have appointments
  if (appointments.length > 0) {
    console.log(`Checking appointments for date: ${dateString} (${appointments.length} total appointments)`)
  }
  
  appointments.forEach(apt => {
    // Check direct date match
    if (apt.date === dateString) {
      console.log(`✅ Direct date match: ${apt.title}`)
      dayAppointments.push(apt)
      return
    }
    
    // Check recurring appointments
    if (apt.repeatPattern) {
      console.log(`🔄 Checking recurring: ${apt.title} (${apt.repeatPattern}) | Start: ${apt.date} | Target: ${dateString}`)
      
      // Parse dates using UTC to avoid timezone issues (same as isRecurringAppointmentOnDate)
      const aptDateParts = apt.date.split('-')
      const targetDateParts = dateString.split('-')
      
      const aptDate = new Date(Date.UTC(
        parseInt(aptDateParts[0]), 
        parseInt(aptDateParts[1]) - 1, 
        parseInt(aptDateParts[2])
      ))
      
      const targetDate = new Date(Date.UTC(
        parseInt(targetDateParts[0]), 
        parseInt(targetDateParts[1]) - 1, 
        parseInt(targetDateParts[2])
      ))
      
      // Only check if target date is on or after appointment start date
      if (targetDate >= aptDate) {
        const isRecurring = isRecurringAppointmentOnDate(apt, dateString)
        console.log(`   Result: ${isRecurring ? '✅ MATCH' : '❌ No match'}`)
        
        if (isRecurring) {
          // Check if this occurrence has an exception
          const exception = getExceptionForDate(apt, dateString)
          
          if (exception) {
            // Create a modified appointment object for this occurrence
            const modifiedApt = { ...apt }
            modifiedApt.occurrenceDate = dateString
            modifiedApt.exception = exception
            
            if (exception.action === 'modified') {
              // Apply modifications
              Object.assign(modifiedApt, exception.modifiedData)
            }
            
            dayAppointments.push(modifiedApt)
          } else {
            // Normal recurring appointment
            const normalApt = { ...apt }
            normalApt.occurrenceDate = dateString
            dayAppointments.push(normalApt)
          }
        }
      }
    }
  })
  
  // Sort appointments by time (hour) - enhanced sorting with proper time parsing
  dayAppointments.sort((a, b) => {
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    
    // Parse times to ensure proper sorting (HH:MM format)
    const [hoursA, minutesA] = timeA.split(':').map(Number)
    const [hoursB, minutesB] = timeB.split(':').map(Number)
    
    // Convert to minutes for easier comparison
    const totalMinutesA = hoursA * 60 + minutesA
    const totalMinutesB = hoursB * 60 + minutesB
    
    // Primary sort by time
    if (totalMinutesA !== totalMinutesB) {
      return totalMinutesA - totalMinutesB
    }
    
    // Secondary sort by title for consistent ordering when times are the same
    return (a.title || '').localeCompare(b.title || '')
  })
  
  // Debug: Log sorted appointments for verification
  if (dayAppointments.length > 1) {
    console.log(`📅 Sorted appointments for ${dateString}:`)
    dayAppointments.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.time} - ${apt.title}`)
    })
  }
  
  return dayAppointments
}

function isRecurringAppointmentOnDate(appointment, targetDate) {
  // Parse dates using UTC to avoid timezone issues
  const aptDateParts = appointment.date.split('-')
  const targetDateParts = targetDate.split('-')
  
  const aptDate = new Date(Date.UTC(
    parseInt(aptDateParts[0]), 
    parseInt(aptDateParts[1]) - 1, 
    parseInt(aptDateParts[2])
  ))
  
  const targetDateObj = new Date(Date.UTC(
    parseInt(targetDateParts[0]), 
    parseInt(targetDateParts[1]) - 1, 
    parseInt(targetDateParts[2])
  ))
  
  // Debug logging
  console.log(`Checking recurring: ${appointment.title} | Start: ${appointment.date} | Target: ${targetDate}`)
  console.log(`Pattern: ${appointment.repeatPattern}`)
  console.log(`UTC dates - Start: ${aptDate.toISOString()}, Target: ${targetDateObj.toISOString()}`)
  
  // Target date must be on or after the start date
  if (targetDateObj < aptDate) {
    console.log('Target date is before start date')
    return false
  }
  
  // If there's an end date and target is after it, return false
  if (appointment.endDate && targetDate > appointment.endDate) {
    console.log('Target date is after end date')
    return false
  }
  
  switch (appointment.repeatPattern) {
    case 'weekly':
      // Check if target date falls on the same day of week as start date
      const daysDiff = Math.floor((targetDateObj - aptDate) / (24 * 60 * 60 * 1000))
      const isWeeklyMatch = daysDiff >= 0 && daysDiff % 7 === 0
      console.log(`Weekly check: daysDiff=${daysDiff}, match=${isWeeklyMatch}`)
      return isWeeklyMatch
      
    case 'biweekly':
      // Check if target date falls on same day of week and is 14-day multiple
      const biweeklyDaysDiff = Math.floor((targetDateObj - aptDate) / (24 * 60 * 60 * 1000))
      const isBiweeklyMatch = biweeklyDaysDiff >= 0 && biweeklyDaysDiff % 14 === 0
      console.log(`Biweekly check: daysDiff=${biweeklyDaysDiff}, match=${isBiweeklyMatch}`)
      return isBiweeklyMatch
      
    case 'monthly':
      // Check if target date is same day of month
      const monthsDiff = (targetDateObj.getFullYear() - aptDate.getFullYear()) * 12 + 
                        (targetDateObj.getMonth() - aptDate.getMonth())
      const isMonthlyMatch = monthsDiff >= 0 && aptDate.getDate() === targetDateObj.getDate()
      console.log(`Monthly check: monthsDiff=${monthsDiff}, startDay=${aptDate.getDate()}, targetDay=${targetDateObj.getDate()}, match=${isMonthlyMatch}`)
      return isMonthlyMatch
      
    case 'quarterly':
      // Check if target date is same day and month is 3-month multiple
      const quarterMonthsDiff = (targetDateObj.getFullYear() - aptDate.getFullYear()) * 12 + 
                               (targetDateObj.getMonth() - aptDate.getMonth())
      const isQuarterlyMatch = quarterMonthsDiff >= 0 && quarterMonthsDiff % 3 === 0 && 
             aptDate.getDate() === targetDateObj.getDate()
      console.log(`Quarterly check: monthsDiff=${quarterMonthsDiff}, match=${isQuarterlyMatch}`)
      return isQuarterlyMatch
      
    case 'yearly':
      // Check if target date is same month and day
      const yearsDiff = targetDateObj.getFullYear() - aptDate.getFullYear()
      const isYearlyMatch = yearsDiff >= 0 && 
             aptDate.getMonth() === targetDateObj.getMonth() && 
             aptDate.getDate() === targetDateObj.getDate()
      console.log(`Yearly check: yearsDiff=${yearsDiff}, match=${isYearlyMatch}`)
      return isYearlyMatch
             
    default:
      console.log('No repeat pattern or unknown pattern')
      return false
  }
}

function showDayAppointments(dateString) {
  const dayAppointments = getAppointmentsForDate(dateString)
  
  if (dayAppointments.length === 0) {
    showNotification(`No appointments on ${formatDateForDisplay(dateString)}`, 'info')
    return
  }
  
  // Create detailed appointment modal
  const appointmentsHTML = dayAppointments.map(apt => {
    let itemClass = `day-appointment-item ${apt.type}`
    let statusHTML = ''
    let actionsHTML = ''
    
    if (apt.exception) {
      if (apt.exception.action === 'cancelled') {
        itemClass += ' cancelled'
        statusHTML = '<div class="appointment-status cancelled">❌ CANCELLED</div>'
        actionsHTML = `
          <button class="btn btn-small btn-success" onclick="restoreAppointmentOccurrence('${apt.id}', '${dateString}')">
            🔄 Restore
          </button>
        `
      } else if (apt.exception.action === 'modified') {
        itemClass += ' modified'
        statusHTML = '<div class="appointment-status modified">✏️ MODIFIED</div>'
        actionsHTML = `
          <button class="btn btn-small btn-secondary" onclick="editAppointmentOccurrence('${apt.id}', '${dateString}')">
            ✏️ Edit This
          </button>
          <button class="btn btn-small btn-warning" onclick="cancelAppointmentOccurrence('${apt.id}', '${dateString}')">
            ❌ Cancel This
          </button>
          <button class="btn btn-small btn-info" onclick="restoreAppointmentOccurrence('${apt.id}', '${dateString}')">
            🔄 Reset to Original
          </button>
        `
      }
    } else if (apt.repeatPattern) {
      // Normal recurring appointment - simplified actions
      actionsHTML = `
        <button class="btn btn-small btn-secondary" onclick="editAppointmentOccurrence('${apt.id}', '${dateString}')">
          ✏️ Edit
        </button>
        <button class="btn btn-small btn-warning" onclick="cancelAppointmentOccurrence('${apt.id}', '${dateString}')">
          ❌ Cancel This
        </button>
        <button class="btn btn-small btn-danger" onclick="deleteAppointment('${apt.id}')">
          🗑️ Delete Series
        </button>
      `
    } else {
      // One-time appointment
      actionsHTML = `
        <button class="btn btn-small btn-secondary" onclick="editAppointment('${apt.id}')">✏️ Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteAppointment('${apt.id}')">🗑️ Delete</button>
      `
    }
    
    return `
      <div class="${itemClass}">
        ${statusHTML}
        <div class="appointment-time">${apt.time}</div>
        <div class="appointment-details">
          <h4 class="${apt.exception?.action === 'cancelled' ? 'strikethrough' : ''}">${apt.title}</h4>
          <p><strong>Type:</strong> ${apt.type}</p>
          <p><strong>Place:</strong> ${apt.place || 'Not specified'}</p>
          <p><strong>Duration:</strong> ${apt.duration} minutes</p>
          ${apt.description ? `<p><strong>Notes:</strong> ${apt.description}</p>` : ''}
          ${apt.repeatPattern ? `<p><strong>Repeats:</strong> ${apt.repeatPattern}</p>` : ''}
          ${apt.exception?.reason ? `<p><strong>Reason:</strong> ${apt.exception.reason}</p>` : ''}
        </div>
        <div class="appointment-actions">
          ${actionsHTML}
        </div>
      </div>
    `
  }).join('')
  
  // Create and show modal
  const modal = document.createElement('div')
  modal.className = 'appointment-modal-overlay'
  modal.innerHTML = `
    <div class="appointment-modal">
      <div class="appointment-modal-header">
        <h3>📅 Appointments for ${formatDateForDisplay(dateString)}</h3>
        <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
      </div>
      <div class="appointment-modal-content">
        ${appointmentsHTML}
        <div class="day-modal-actions">
          <button class="btn btn-primary" onclick="openAppointmentModal('${dateString}'); this.closest('.appointment-modal-overlay').remove();">
            ➕ Create Appointment for This Day
          </button>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

function getNextOccurrence(appointment) {
  if (!appointment.repeatPattern) return null
  
  const today = new Date()
  const aptDate = new Date(appointment.date)
  
  // If appointment date is in the future, return it
  if (aptDate > today) return aptDate
  
  // Calculate next occurrence based on repeat pattern
  let nextDate = new Date(aptDate)
  
  while (nextDate <= today) {
    switch (appointment.repeatPattern) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      default:
        return null
    }
  }
  
  // Check if next occurrence is beyond end date
  if (appointment.endDate && nextDate > new Date(appointment.endDate)) {
    return null
  }
  
  return nextDate
}

// Get exception for a specific date
function getExceptionForDate(appointment, dateString) {
  if (!appointment.exceptions || !Array.isArray(appointment.exceptions)) {
    return null
  }
  
  return appointment.exceptions.find(exception => exception.date === dateString) || null
}

// Enhanced validation and error handling for appointments
function validateAppointmentForm(formData) {
  const errors = []
  
  if (!formData.title || formData.title.trim().length < 2) {
    errors.push('Title must be at least 2 characters long')
  }
  
  if (!formData.type) {
    errors.push('Please select an appointment type')
  }
  
  if (!formData.time) {
    errors.push('Please specify a time')
  }
  
  if (!formData.duration || formData.duration < 5 || formData.duration > 480) {
    errors.push('Duration must be between 5 and 480 minutes')
  }
  
  return errors
}

// Enhanced date formatting for better UX
function formatDateForDisplay(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
}

// Bulk operations for managing appointments
window.bulkCancelSeries = async function(appointmentId, fromDate) {
  if (!confirm('Cancel all future occurrences of this appointment series?')) return
  
  try {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return
    
    // Set end date to the day before the cancellation date
    const endDate = new Date(fromDate)
    endDate.setDate(endDate.getDate() - 1)
    
    await updateDoc(doc(db, 'appointments', appointmentId), {
      endDate: endDate.toISOString().split('T')[0]
    })
    
    showNotification('All future appointments in series cancelled', 'success')
    
    // Refresh views
    await loadAppointments()
    renderCalendar()
    
  } catch (error) {
    console.error('Error cancelling appointment series:', error)
    showNotification('Error cancelling appointment series', 'error')
  }
}

// Global functions for appointment actions
window.editAppointment = async function(appointmentId) {
  const appointment = appointments.find(apt => apt.id === appointmentId)
  if (!appointment) return
  
  // If it's a recurring appointment, ask for confirmation
  if (appointment.repeatPattern) {
    const confirmEdit = confirm(
      `This will edit the ENTIRE recurring appointment series "${appointment.title}".\n\n` +
      `Changes will apply to ALL future occurrences of this appointment.\n\n` +
      `Are you sure you want to continue?`
    )
    
    if (!confirmEdit) return
  }
  
  // Populate form with existing data
  document.getElementById('apt-title').value = appointment.title
  document.getElementById('apt-type').value = appointment.type
  document.getElementById('apt-date').value = appointment.date
  document.getElementById('apt-time').value = appointment.time
  document.getElementById('apt-place').value = appointment.place || ''
  document.getElementById('apt-duration').value = appointment.duration
  document.getElementById('apt-description').value = appointment.description || ''
  
  // Handle recurring options
  const recurringCheckbox = document.getElementById('apt-is-recurring')
  const recurringOptions = document.getElementById('recurring-options')
  
  if (appointment.repeatPattern) {
    // This is a recurring appointment
    recurringCheckbox.checked = true
    recurringOptions.style.display = 'block'
    recurringOptions.classList.add('show')
    document.getElementById('apt-repeat').value = appointment.repeatPattern
    document.getElementById('apt-end-date').value = appointment.endDate || ''
  } else {
    // This is a single appointment
    recurringCheckbox.checked = false
    recurringOptions.style.display = 'none'
    recurringOptions.classList.remove('show')
    document.getElementById('apt-repeat').value = ''
    document.getElementById('apt-end-date').value = ''
  }
  
  // Change form to edit mode
  const form = document.getElementById('appointment-form')
  const submitBtn = form.querySelector('button[type="submit"]')
  
  if (appointment.repeatPattern) {
    submitBtn.textContent = '🔧 Update Recurring Series'
  } else {
    submitBtn.textContent = '✏️ Update Appointment'
  }
  
  // Store the ID for updating
  form.dataset.editingId = appointmentId
  
  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' })
  
  if (appointment.repeatPattern) {
    showNotification(`Editing recurring appointment series: ${appointment.title}. Changes will affect all future occurrences.`, 'info')
  } else {
    showNotification('Appointment loaded for editing', 'info')
  }
}

window.deleteAppointment = async function(appointmentId) {
  if (!confirm('Are you sure you want to delete this appointment?')) return
  
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId))
    showNotification('Appointment deleted successfully', 'success')
    
    await loadAppointments()
    renderCalendar()
    
  } catch (error) {
    console.error('Error deleting appointment:', error)
    showNotification('Error deleting appointment', 'error')
  }
}

// Global functions for single occurrence actions
window.cancelAppointmentOccurrence = async function(appointmentId, dateString) {
  const reason = prompt('Reason for cancellation (optional):')
  if (reason === null) return // User cancelled prompt
  
  try {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      showNotification('Appointment not found', 'error')
      return
    }
    
    // Create exception for this occurrence
    const exception = {
      date: dateString,
      action: 'cancelled',
      reason: reason || '',
      timestamp: new Date().toISOString(),
      userId: getCurrentUser()?.uid
    }
    
    // Update appointment with new exception
    const updatedExceptions = appointment.exceptions || []
    
    // Remove any existing exception for this date
    const filteredExceptions = updatedExceptions.filter(ex => ex.date !== dateString)
    filteredExceptions.push(exception)
    
    await updateDoc(doc(db, 'appointments', appointmentId), {
      exceptions: filteredExceptions
    })
    
    showNotification('Appointment occurrence cancelled', 'success')
    
    // Refresh the view
    await loadAppointments()
    renderCalendar()
    
    // Close any open modals
    const modal = document.querySelector('.appointment-modal-overlay')
    if (modal) modal.remove()
    
    // Show the updated day view
    setTimeout(() => showDayAppointments(dateString), 300)
    
  } catch (error) {
    console.error('Error cancelling appointment occurrence:', error)
    showNotification('Error cancelling appointment occurrence', 'error')
  }
}

window.restoreAppointmentOccurrence = async function(appointmentId, dateString) {
  if (!confirm('Restore this appointment occurrence to its original state?')) return
  
  try {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      showNotification('Appointment not found', 'error')
      return
    }
    
    // Remove exception for this date
    const updatedExceptions = (appointment.exceptions || []).filter(ex => ex.date !== dateString)
    
    await updateDoc(doc(db, 'appointments', appointmentId), {
      exceptions: updatedExceptions
    })
    
    showNotification('Appointment occurrence restored', 'success')
    
    // Refresh the view
    await loadAppointments()
    renderCalendar()
    
    // Close any open modals
    const modal = document.querySelector('.appointment-modal-overlay')
    if (modal) modal.remove()
    
    // Show the updated day view
    setTimeout(() => showDayAppointments(dateString), 300)
    
  } catch (error) {
    console.error('Error restoring appointment occurrence:', error)
    showNotification('Error restoring appointment occurrence', 'error')
  }
}

window.editAppointmentOccurrence = async function(appointmentId, dateString) {
  const appointment = appointments.find(apt => apt.id === appointmentId)
  if (!appointment) {
    showNotification('Appointment not found', 'error')
    return
  }
  
  // Get current values (either from exception or original)
  const exception = getExceptionForDate(appointment, dateString)
  const currentValues = exception?.action === 'modified' ? 
    { ...appointment, ...exception.modifiedData } : appointment
  
  // Create edit form modal
  const modal = document.createElement('div')
  modal.className = 'appointment-modal-overlay'
  modal.innerHTML = `
    <div class="appointment-modal">
      <div class="appointment-modal-header">
        <h3>✏️ Edit ${appointment.repeatPattern ? 'Recurring ' : ''}Appointment - ${formatDateForDisplay(dateString)}</h3>
        <button class="modal-close" onclick="this.closest('.appointment-modal-overlay').remove()">✕</button>
      </div>
      <div class="appointment-modal-content">
        <form id="edit-occurrence-form" class="appointment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="edit-title">Title</label>
              <input type="text" id="edit-title" value="${currentValues.title}" required>
            </div>
            <div class="form-group">
              <label for="edit-type">Type</label>
              <select id="edit-type" required>
                <option value="meeting" ${currentValues.type === 'meeting' ? 'selected' : ''}>📋 Meeting</option>
                <option value="task" ${currentValues.type === 'task' ? 'selected' : ''}>✅ Task</option>
                <option value="event" ${currentValues.type === 'event' ? 'selected' : ''}>🎉 Event</option>
                <option value="reminder" ${currentValues.type === 'reminder' ? 'selected' : ''}>⏰ Reminder</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-time">Time</label>
              <input type="time" id="edit-time" value="${currentValues.time}" required>
            </div>
            <div class="form-group">
              <label for="edit-duration">Duration (minutes)</label>
              <input type="number" id="edit-duration" value="${currentValues.duration}" min="5" max="480" step="5" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="edit-place">Place</label>
            <input type="text" id="edit-place" value="${currentValues.place || ''}" placeholder="Location or meeting room">
          </div>
          
          <div class="form-group">
            <label for="edit-description">Notes</label>
            <textarea id="edit-description" rows="3" placeholder="Additional notes or description">${currentValues.description || ''}</textarea>
          </div>
          
          ${appointment.repeatPattern ? `
            <div class="recurring-notice">
              <p><strong>🔄 This is a recurring appointment (${appointment.repeatPattern})</strong></p>
              <p>When you save changes, you'll be asked if you want to apply them to all future occurrences.</p>
            </div>
          ` : ''}
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.appointment-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Handle form submission
  const form = modal.querySelector('#edit-occurrence-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    try {
      const modifiedData = {
        title: document.getElementById('edit-title').value,
        type: document.getElementById('edit-type').value,
        time: document.getElementById('edit-time').value,
        duration: parseInt(document.getElementById('edit-duration').value),
        place: document.getElementById('edit-place').value,
        description: document.getElementById('edit-description').value
      }
      
      // Validate form data
      const validationErrors = validateAppointmentForm(modifiedData)
      if (validationErrors.length > 0) {
        showNotification(validationErrors.join(', '), 'error')
        return
      }
      
      // Close the edit modal first
      modal.remove()
      
      // For recurring appointments, ask if changes should apply to all future events
      if (appointment.repeatPattern) {
        const applyToFuture = confirm(
          `Do you want to apply these changes to all future occurrences of this recurring appointment?\n\n` +
          `✅ YES = Update this and all future occurrences\n` +
          `❌ NO = Update only this specific occurrence\n\n` +
          `Current change: ${formatDateForDisplay(dateString)} and forward`
        )
        
        if (applyToFuture) {
          // Apply to all future occurrences by updating the series from this date
          await updateRecurringSeriesFromDate(appointmentId, dateString, modifiedData)
        } else {
          // Apply only to this occurrence (create exception)
          await updateSingleOccurrence(appointmentId, dateString, modifiedData)
        }
      } else {
        // Non-recurring appointment - just update it
        await updateDoc(doc(db, 'appointments', appointmentId), modifiedData)
        showNotification('Appointment updated successfully', 'success')
      }
      
      // Refresh the view
      await loadAppointments()
      renderCalendar()
      
      // Show the updated day view
      setTimeout(() => showDayAppointments(dateString), 300)
      
    } catch (error) {
      console.error('Error updating appointment:', error)
      showNotification('Error updating appointment', 'error')
    }
  })
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// Helper function to get the previous day
function getPreviousDay(dateString) {
  const date = new Date(dateString)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

// Helper function to update a recurring series from a specific date forward
async function updateRecurringSeriesFromDate(appointmentId, fromDate, newData) {
  try {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) throw new Error('Appointment not found')
    
    // End the original series the day before the change date
    const previousDay = getPreviousDay(fromDate)
    await updateDoc(doc(db, 'appointments', appointmentId), {
      endDate: previousDay
    })
    
    // Create a new series starting from the change date
    const newSeriesData = {
      ...appointment,
      ...newData,
      date: fromDate, // Start the new series from the selected date
      exceptions: [], // Reset exceptions for the new series
      createdAt: Timestamp.now(),
      createdBy: getCurrentUser()?.uid
    }
    
    // Remove the ID from the new series data (Firestore will create a new one)
    delete newSeriesData.id
    
    await addDoc(collection(db, 'appointments'), newSeriesData)
    
    showNotification(`Recurring appointment updated from ${formatDateForDisplay(fromDate)} forward`, 'success')
    
  } catch (error) {
    console.error('Error updating recurring series:', error)
    showNotification('Error updating recurring series', 'error')
    throw error
  }
}

// Helper function to update only a single occurrence (create exception)
async function updateSingleOccurrence(appointmentId, dateString, modifiedData) {
  try {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) throw new Error('Appointment not found')
    
    // Create exception for this occurrence
    const newException = {
      date: dateString,
      action: 'modified',
      modifiedData: modifiedData,
      reason: 'Single occurrence modification',
      timestamp: new Date().toISOString(),
      userId: getCurrentUser()?.uid
    }
    
    // Update appointment with new exception
    const updatedExceptions = appointment.exceptions || []
    
    // Remove any existing exception for this date
    const filteredExceptions = updatedExceptions.filter(ex => ex.date !== dateString)
    filteredExceptions.push(newException)
    
    await updateDoc(doc(db, 'appointments', appointmentId), {
      exceptions: filteredExceptions
    })
    
    showNotification('Single appointment occurrence updated', 'success')
    
  } catch (error) {
    console.error('Error updating single occurrence:', error)
    showNotification('Error updating single occurrence', 'error')
    throw error
  }
}

// ...existing code...
