import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'
import { getAvailablePages } from '../accessControl.js'

let availabilityData = []
let currentUserData = null

// Initialize availability page
export function initializeAvailability() {
  console.log('🔧 Initializing availability page...')
  try {
    setupEventListeners()
    setDefaultDateRange()
    console.log('✅ Availability page initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing availability:', error)
  }
}

function setupEventListeners() {
  console.log('🔧 Setting up availability event listeners...')
  
  // Load appointments button
  const loadBtn = document.getElementById('load-availability')
  console.log('Load button found:', !!loadBtn)
  if (loadBtn) {
    loadBtn.addEventListener('click', loadAvailableAppointments)
  }

  // Auto-load when dates change
  const startDate = document.getElementById('availability-start-date')
  const endDate = document.getElementById('availability-end-date')
  console.log('Date inputs found:', !!startDate, !!endDate)
  
  if (startDate && endDate) {
    startDate.addEventListener('change', loadAvailableAppointments)
    endDate.addEventListener('change', loadAvailableAppointments)
  }
  
  // Check if availability section exists
  const availabilitySection = document.getElementById('availability')
  console.log('Availability section found:', !!availabilitySection)
}

function setDefaultDateRange() {
  const today = new Date()
  const nextMonth = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
  
  const startInput = document.getElementById('availability-start-date')
  const endInput = document.getElementById('availability-end-date')
  
  if (startInput && endInput) {
    startInput.value = today.toISOString().split('T')[0]
    endInput.value = nextMonth.toISOString().split('T')[0]
    
    // Auto-load appointments for default range
    setTimeout(() => {
      loadAvailableAppointments()
    }, 500)
  }
}

async function loadAvailableAppointments() {
  const startDate = document.getElementById('availability-start-date')?.value
  const endDate = document.getElementById('availability-end-date')?.value
  
  if (!startDate || !endDate) {
    showNotification('Please select both start and end dates', 'error')
    return
  }

  if (new Date(startDate) > new Date(endDate)) {
    showNotification('Start date must be before end date', 'error')
    return
  }

  try {
    showLoading('Loading appointments...')
    
    const user = await getCurrentUser()
    if (!user) {
      showNotification('Please log in to view availability', 'error')
      hideLoading()
      return
    }

    // Get user permissions to filter appointments
    const userPermissions = user.permissions || []
    const availablePages = getAvailablePages()

    // Query appointments in date range
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date')
    )

    const snapshot = await getDocs(appointmentsQuery)
    const appointments = []

    snapshot.forEach(doc => {
      const appointment = { id: doc.id, ...doc.data() }
      
      // For debugging: show all appointments first
      console.log('Found appointment:', appointment.title, 'User permissions:', userPermissions)
      
      // Simplified permission check - if user is admin or has Meeting permission, show all
      const hasPermission = userPermissions.includes('admin') || 
                          userPermissions.includes('Meeting') || 
                          userPermissions.length > 0 // Any permission for now
      
      console.log('Has permission:', hasPermission)

      if (hasPermission || true) { // Always include for debugging
        appointments.push(appointment)
      }
    })

    await renderAppointmentsList(appointments)
    hideLoading()

  } catch (error) {
    console.error('Error loading appointments:', error)
    showNotification('Error loading appointments', 'error')
    hideLoading()
  }
}

async function renderAppointmentsList(appointments) {
  const container = document.getElementById('appointments-list')
  const emptyMessage = document.getElementById('no-appointments-message')
  
  if (!container) return

  if (appointments.length === 0) {
    container.innerHTML = ''
    if (emptyMessage) emptyMessage.style.display = 'block'
    return
  }

  if (emptyMessage) emptyMessage.style.display = 'none'

  // Load user's current availability status for these appointments
  const userAvailability = await loadUserAvailabilityStatus(appointments.map(a => a.id))

  container.innerHTML = appointments.map(appointment => {
    const isAvailable = userAvailability[appointment.id] || false
    const appointmentDate = new Date(appointment.date + 'T' + appointment.time)
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <div class="availability-appointment-card">
        <div class="appointment-info">
          <h3 class="appointment-title">${appointment.title || 'Appointment'}</h3>
          <div class="appointment-details">
            <div class="appointment-datetime">
              <span class="appointment-date">📅 ${formattedDate}</span>
              <span class="appointment-time">🕒 ${formattedTime}</span>
            </div>
            ${appointment.location ? `<div class="appointment-location">📍 ${appointment.location}</div>` : ''}
            ${appointment.description ? `<div class="appointment-description">${appointment.description}</div>` : ''}
          </div>
        </div>
        
        <div class="availability-actions">
          <div class="availability-toggle">
            <label class="availability-switch-label">
              <span class="availability-status-text">${isAvailable ? 'Available' : 'Not Available'}</span>
              <div class="availability-switch">
                <input 
                  type="checkbox" 
                  id="availability-${appointment.id}" 
                  class="availability-switch-input" 
                  ${isAvailable ? 'checked' : ''}
                  onchange="toggleAvailability('${appointment.id}', this.checked)"
                >
                <span class="availability-switch-slider"></span>
              </div>
            </label>
          </div>
        </div>
      </div>
    `
  }).join('')
}

async function loadUserAvailabilityStatus(appointmentIds) {
  if (!currentUserData) return {}

  try {
    const availabilityQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', currentUserData.uid),
      where('appointmentId', 'in', appointmentIds.slice(0, 10)) // Firestore limit
    )

    const snapshot = await getDocs(availabilityQuery)
    const availability = {}

    snapshot.forEach(doc => {
      const data = doc.data()
      availability[data.appointmentId] = data.isAvailable
    })

    return availability

  } catch (error) {
    console.error('Error loading user availability:', error)
    return {}
  }
}

// Toggle user availability for an appointment
window.toggleAvailability = async function(appointmentId, isAvailable) {
  if (!currentUserData) {
    showNotification('Please log in to update availability', 'error')
    return
  }

  try {
    showLoading('Updating availability...')

    const availabilityId = `${currentUserData.uid}_${appointmentId}`
    const availabilityRef = doc(db, 'availabilities', availabilityId)

    if (isAvailable) {
      // Mark as available
      await setDoc(availabilityRef, {
        userId: currentUserData.uid,
        userName: currentUserData.displayName || currentUserData.email,
        appointmentId: appointmentId,
        isAvailable: true,
        submittedAt: new Date()
      })
      
      showNotification('Marked as available!', 'success')
    } else {
      // Remove availability
      await deleteDoc(availabilityRef)
      showNotification('Removed availability', 'success')
    }

    // Update the status text
    const statusText = document.querySelector(`#availability-${appointmentId}`).closest('.availability-toggle').querySelector('.availability-status-text')
    if (statusText) {
      statusText.textContent = isAvailable ? 'Available' : 'Not Available'
    }

    hideLoading()

  } catch (error) {
    console.error('Error updating availability:', error)
    showNotification('Error updating availability', 'error')
    hideLoading()
    
    // Revert checkbox state
    const checkbox = document.querySelector(`#availability-${appointmentId}`)
    if (checkbox) {
      checkbox.checked = !isAvailable
    }
  }
}

async function loadUserAvailability() {
  // This function can be used to load and sync user availability in real-time
  if (!currentUserData) return

  try {
    const availabilityQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', currentUserData.uid)
    )

    // Set up real-time listener
    onSnapshot(availabilityQuery, (snapshot) => {
      // Update UI when availability changes
      // This could be used for real-time updates if needed
    })

  } catch (error) {
    console.error('Error setting up availability listener:', error)
  }
}

// Export for use in main app
export { loadAvailableAppointments }