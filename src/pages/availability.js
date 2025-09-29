import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { isAdmin } from '../accessControl.js'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'

let availabilityData = []
let currentUserData = null
let isCurrentUserAdmin = false
let appointments = []
let userAvailabilities = {} // Store user availability: { appointmentId_date: boolean }
let currentDate = new Date()
let monthSubmissionStatus = {} // Track submission status per month: { "2025-10": { submitted: true, timestamp: "..." } }

// Initialize availability page with monthly calendar
export function initializeAvailability() {
  console.log('🔧 Initializing My Availability Calendar...')
  try {
    setupEventListeners()
    loadUserAvailability()
    loadAppointments()
    loadMonthSubmissionStatus()
    
    // Render calendar immediately after setup
    renderAvailabilityCalendar()
    
    console.log('✅ My Availability Calendar initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing availability calendar:', error)
  }
}

function setupEventListeners() {
  console.log('🔧 Setting up availability calendar event listeners...')
  
  // Calendar navigation buttons
  const prevMonthBtn = document.getElementById('availability-prev-month')
  const nextMonthBtn = document.getElementById('availability-next-month')
  
  if (prevMonthBtn && nextMonthBtn) {
    // Remove any existing listeners by cloning and replacing the buttons
    const newPrevBtn = prevMonthBtn.cloneNode(true)
    const newNextBtn = nextMonthBtn.cloneNode(true)
    prevMonthBtn.parentNode.replaceChild(newPrevBtn, prevMonthBtn)
    nextMonthBtn.parentNode.replaceChild(newNextBtn, nextMonthBtn)
    
    // Add fresh event listeners
    newPrevBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1)
      renderAvailabilityCalendar()
    })
    
    newNextBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1)
      renderAvailabilityCalendar()
    })
  }
}

// Load user's existing availability data
async function loadUserAvailability() {
  try {
    const user = await getCurrentUser()
    if (!user) return
    
    currentUserData = user
    isCurrentUserAdmin = await isAdmin(user.uid)
    console.log('📅 Loading availability for user:', user.email, '(Admin:', isCurrentUserAdmin, ')')
    
    const availabilityQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', user.uid)
    )
    
    const snapshot = await getDocs(availabilityQuery)
    userAvailabilities = {}
    
    snapshot.forEach(doc => {
      const data = doc.data()
      // Store availability by appointment ID and date
      const key = `${data.appointmentId}_${data.date}`
      // Handle both old format (isAvailable) and new format (available)
      userAvailabilities[key] = data.available !== undefined ? data.available : data.isAvailable
    })
    
    console.log('✅ Loaded availability data:', Object.keys(userAvailabilities).length, 'entries')
  } catch (error) {
    console.error('❌ Error loading availability:', error)
  }
}

// Load all appointments with real-time updates
let appointmentsUnsubscribe = null

// Filter appointments based on user privileges
async function filterAppointmentsByPrivileges(allAppointments, userId) {
  try {
    // Get user's privileges from users collection
    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    
    if (!userDoc.exists()) {
      console.warn('User document not found for userId:', userId)
      return []
    }
    
    const userData = userDoc.data()
    const userPrivilegeIds = userData.privileges || []
    
    console.log('👤 User privilege IDs:', userPrivilegeIds)
    
    // Load privilege names from privilege IDs
    const privilegeNames = []
    for (const privilegeId of userPrivilegeIds) {
      try {
        const privilegeDoc = await getDoc(doc(db, 'privileges', privilegeId))
        if (privilegeDoc.exists()) {
          const privilegeName = privilegeDoc.data().name
          privilegeNames.push(privilegeName)
          console.log(`🔍 Privilege ID ${privilegeId} → Name: "${privilegeName}"`)
        }
      } catch (error) {
        console.warn('Could not load privilege:', privilegeId, error)
      }
    }
    
    console.log('👤 User privilege names:', privilegeNames)
    
    // Filter appointments where title matches user's privilege names
    const filteredAppointments = allAppointments.filter(appointment => {
      const appointmentTitle = appointment.title
      const hasPrivilege = privilegeNames.includes(appointmentTitle)
      
      console.log('🔍 Checking appointment:', {
        title: appointmentTitle,
        titleLength: appointmentTitle?.length,
        titleEncoded: encodeURIComponent(appointmentTitle || ''),
        privilegeNames: privilegeNames,
        hasPrivilege: hasPrivilege
      })
      
      if (hasPrivilege) {
        console.log('✅ User can see appointment:', appointmentTitle)
      } else {
        console.log('❌ User CANNOT see appointment:', appointmentTitle, '(No matching privilege)')
      }
      
      return hasPrivilege
    })
    
    return filteredAppointments
    
  } catch (error) {
    console.error('❌ Error filtering appointments by privileges:', error)
    return []
  }
}

async function loadAppointments() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      console.log('No user signed in, cannot load appointments for availability')
      return
    }

    // Clean up any existing listener first
    if (appointmentsUnsubscribe) {
      console.log('🧹 Cleaning up existing appointments listener...')
      appointmentsUnsubscribe()
      appointmentsUnsubscribe = null
    }

    console.log('📅 Setting up real-time appointments listener for availability calendar...')
    
    const appointmentsCollection = collection(db, 'appointments')
    
    // Load ALL appointments (no user filter) - we'll filter by privileges
    const appointmentsQuery = query(appointmentsCollection, orderBy('date', 'asc'))
    
    // Set up real-time listener
    appointmentsUnsubscribe = onSnapshot(appointmentsQuery, async (snapshot) => {
      const allAppointments = []
      snapshot.forEach(doc => {
        allAppointments.push({ id: doc.id, ...doc.data() })
      })
      
      console.log('📋 Real-time snapshot received:', allAppointments.length, 'total appointments from Firebase')
      console.log('📋 All appointments:', allAppointments.map(apt => ({ id: apt.id, title: apt.title, date: apt.date })))
      
      // Filter appointments based on user privileges
      appointments = await filterAppointmentsByPrivileges(allAppointments, currentUser.uid)
      
      console.log('✅ Real-time update:', appointments.length, 'appointments visible for user', currentUser.uid)
      console.log('✅ Visible appointments:', appointments.map(apt => ({ id: apt.id, title: apt.title, date: apt.date })))
      renderAvailabilityCalendar()
    }, (error) => {
      console.error('❌ Error in appointments listener:', error)
      showNotification('Error loading appointments', 'error')
    })
    
  } catch (error) {
    console.error('❌ Error setting up appointments listener:', error)
    showNotification('Error loading appointments', 'error')
  }
}

// Render the monthly availability calendar
function renderAvailabilityCalendar() {
  const calendarGrid = document.getElementById('availability-calendar-grid')
  const monthYearDisplay = document.getElementById('availability-current-month-year')
  
  if (!calendarGrid || !monthYearDisplay) {
    console.log('Calendar elements not found')
    return
  }
  
  // Update month/year display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  monthYearDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  
  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Find the first Monday of the month
  let firstMonday = 1
  const firstDayOfWeek = firstDay.getDay() // 0=Sunday, 1=Monday, etc.
  
  if (firstDayOfWeek === 0) { // Sunday
    firstMonday = 2 // Next Monday is day 2
  } else if (firstDayOfWeek === 1) { // Monday
    firstMonday = 1 // First day is already Monday
  } else { // Tuesday(2) to Saturday(6)
    firstMonday = 8 - firstDayOfWeek + 1 // Next Monday
  }

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
  `

  // No trailing days - start directly with first Monday
  
  // Add days of month starting from first Monday
  for (let day = firstMonday; day <= daysInMonth; day++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    // Fix timezone issue by using local date string format (same as appointments.js)
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayAppointments = getAppointmentsForDate(dateString)
    
    const today = new Date()
    const isToday = dateObj.toDateString() === today.toDateString()
    
    let dayClass = 'calendar-day'
    if (isToday) dayClass += ' today'
    if (dayAppointments.length > 0) dayClass += ' has-appointments'
    
    let appointmentsHTML = ''
    const isMonthSubmitted = isCurrentMonthSubmitted()
    
    dayAppointments.forEach(apt => {
      const availabilityKey = `${apt.id}_${dateString}`
      const hasSubmitted = userAvailabilities[availabilityKey] !== undefined
      const isAvailable = userAvailabilities[availabilityKey] === true
      const isNotAvailable = userAvailabilities[availabilityKey] === false
      
      let availabilityClass, titleText, indicator
      
      if (!hasSubmitted) {
        // Default state: Available by default, not yet submitted
        availabilityClass = 'available-default'
        titleText = 'Tap to mark as NOT available'
        indicator = ''
      } else if (isAvailable) {
        // Explicitly marked as available
        availabilityClass = 'available'
        titleText = 'Tap to mark as NOT available'
        indicator = '<div class="availability-indicator">✅</div>'
      } else {
        // Explicitly marked as not available
        availabilityClass = 'not-available'
        titleText = 'Tap to mark as available'
        indicator = '<div class="availability-indicator">❌</div>'
      }
      
      const lockedClass = (isMonthSubmitted && !isCurrentUserAdmin) ? 'locked' : ''
      
      const clickHandler = (isMonthSubmitted && !isCurrentUserAdmin)
        ? `showNotification('🔒 Availability is locked for this month', 'warning')` 
        : `toggleAppointmentAvailability('${apt.id}', '${dateString}')`
      
      if (isMonthSubmitted && !isCurrentUserAdmin) {
        titleText = 'Availability is locked - contact admin for changes'
      }
      
      appointmentsHTML += `
        <div class="availability-appointment-item ${apt.type} ${availabilityClass} ${lockedClass}" 
             data-appointment-id="${apt.id}"
             data-occurrence-date="${dateString}"
             onclick="${clickHandler}"
             title="${titleText}">
          <div class="apt-time">${apt.time}</div>
          <div class="apt-title">${apt.title}</div>
          ${indicator}
          ${isMonthSubmitted ? '<div class="lock-indicator">🔒</div>' : ''}
        </div>
      `
    })

    calendarHTML += `
      <div class="${dayClass}" data-date="${dateString}">
        <div class="day-number">${day}</div>
        <div class="appointments-preview">${appointmentsHTML}</div>
      </div>
    `
  }

  // Calculate remaining days to complete the last week
  const lastDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), daysInMonth)
  const lastDayOfWeek = (lastDayDate.getDay() + 6) % 7 // Convert to Monday=0 format
  const remainingCells = (6 - lastDayOfWeek) % 7 // Days needed to complete the week
  
  // Add trailing days from next month to complete the calendar (if needed)
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day)
    // Fix timezone issue by using local date string format
    const dateString = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    calendarHTML += `<div class="calendar-day other-month" data-date="${dateString}">
      <div class="day-number">${day}</div>
    </div>`
  }
  
  calendarGrid.innerHTML = calendarHTML
  
  // Update submission UI for current month
  updateSubmissionUI()
}

// Get appointments for a specific date (including recurring ones)
function getAppointmentsForDate(dateString) {
  const dayAppointments = []
  
  appointments.forEach(apt => {
    // Check direct date match
    if (apt.date === dateString) {
      dayAppointments.push(apt)
      return
    }
    
    // Check recurring appointments
    if (apt.repeatPattern) {
      if (isRecurringAppointmentOnDate(apt, dateString)) {
        const recurringApt = { ...apt }
        recurringApt.occurrenceDate = dateString
        dayAppointments.push(recurringApt)
      }
    }
  })
  
  // Sort appointments by time
  dayAppointments.sort((a, b) => {
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    return timeA.localeCompare(timeB)
  })
  
  return dayAppointments
}

// Check if recurring appointment occurs on specific date
function isRecurringAppointmentOnDate(appointment, targetDate) {
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
  
  // Only check if target date is on or after appointment start date
  if (targetDateObj < aptDate) return false
  
  const diffTime = targetDateObj.getTime() - aptDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  switch (appointment.repeatPattern) {
    case 'weekly':
      return diffDays % 7 === 0
    case 'biweekly':
      return diffDays % 14 === 0
    case 'monthly':
      return aptDate.getUTCDate() === targetDateObj.getUTCDate()
    case 'yearly':
      return aptDate.getUTCMonth() === targetDateObj.getUTCMonth() && 
             aptDate.getUTCDate() === targetDateObj.getUTCDate()
    default:
      return false
  }
}

// Toggle user availability for a specific appointment
async function toggleAppointmentAvailability(appointmentId, date) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      showNotification('Please sign in to mark availability', 'error')
      return
    }

    // Check if current month is submitted (locked) - but allow admins to edit
    if (isCurrentMonthSubmitted()) {
      const userIsAdmin = await isAdmin(user.uid)
      if (!userIsAdmin) {
        showNotification('🔒 Availability is submitted and locked. Contact admin for changes.', 'warning', 5000)
        return
      } else {
        showNotification('🔧 Admin override: editing locked availability', 'info', 3000)
      }
    }
    
    const key = `${appointmentId}_${date}`
    const docId = `${user.uid}_${appointmentId}_${date}`
    const isCurrentlyNotAvailable = userAvailabilities[key] === false
    const hasSubmittedAvailability = userAvailabilities[key] !== undefined
    
    if (!hasSubmittedAvailability) {
      // User hasn't submitted anything yet, first click marks as NOT available
      await setDoc(doc(db, 'availabilities', docId), {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous User',
        userEmail: user.email || 'No email',
        appointmentId: appointmentId,
        date: date,
        available: false,
        updatedAt: new Date()
      })
      
      // Update local state
      userAvailabilities[key] = false
      showNotification('Marked as NOT available', 'warning')
      
    } else if (isCurrentlyNotAvailable) {
      // User is currently NOT available, clicking will make them available
      await setDoc(doc(db, 'availabilities', docId), {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous User',
        userEmail: user.email || 'No email',
        appointmentId: appointmentId,
        date: date,
        available: true,
        updatedAt: new Date()
      })
      
      // Update local state
      userAvailabilities[key] = true
      showNotification('Marked as available', 'success')
      
    } else {
      // User is currently available, clicking will make them NOT available
      await setDoc(doc(db, 'availabilities', docId), {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous User',
        userEmail: user.email || 'No email',
        appointmentId: appointmentId,
        date: date,
        available: false,
        updatedAt: new Date()
      })
      
      // Update local state
      userAvailabilities[key] = false
      showNotification('Marked as NOT available', 'warning')
    }
    
    // Re-render calendar
    renderAvailabilityCalendar()
    
  } catch (error) {
    console.error('❌ Error toggling availability:', error)
    showNotification('Error updating availability', 'error')
  }
}

// Cleanup function for when page is unloaded
export function cleanupAvailability() {
  console.log('🧹 Cleaning up availability page listeners...')
  if (appointmentsUnsubscribe) {
    appointmentsUnsubscribe()
    appointmentsUnsubscribe = null
  }
}

// Load month submission status from Firebase
async function loadMonthSubmissionStatus() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return

    console.log('📋 Loading month submission status...')
    
    // Get all submission records for this user
    const submissionQuery = query(
      collection(db, 'monthSubmissions'),
      where('userId', '==', currentUser.uid)
    )
    
    const submissionDocs = await getDocs(submissionQuery)
    monthSubmissionStatus = {}
    
    submissionDocs.forEach(doc => {
      const data = doc.data()
      monthSubmissionStatus[data.monthKey] = {
        submitted: true,
        timestamp: data.submittedAt,
        userName: data.userName || data.userEmail || 'Unknown User',
        userEmail: data.userEmail || 'No email',
        docId: doc.id
      }
    })
    
    console.log('📋 Loaded submission status:', monthSubmissionStatus)
    updateSubmissionUI()
    
  } catch (error) {
    console.error('❌ Error loading submission status:', error)
  }
}

// Update the submission UI based on current month status
function updateSubmissionUI() {
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const isSubmitted = monthSubmissionStatus[currentMonthKey]?.submitted || false
  
  const statusContainer = document.getElementById('availability-submission-status')
  if (!statusContainer) return

  const monthName = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (isSubmitted) {
    const submittedAt = new Date(monthSubmissionStatus[currentMonthKey].timestamp)
    const userName = monthSubmissionStatus[currentMonthKey].userName || 'Unknown User'
    statusContainer.innerHTML = `
      <div class="submission-status submitted">
        <div class="status-header">
          <span class="status-icon">🔒</span>
          <span class="status-title">Availability Submitted for ${monthName}</span>
        </div>
        <div class="status-details">
          Submitted by ${userName} on ${submittedAt.toLocaleDateString()} at ${submittedAt.toLocaleTimeString()}
        </div>
        <div class="status-message">
          ℹ️ Your availability is locked. Contact admin if changes are needed.
        </div>
      </div>
    `
  } else {
    statusContainer.innerHTML = `
      <div class="submission-status draft">
        <div class="status-header">
          <span class="status-icon">📝</span>
          <span class="status-title">Draft Mode - ${monthName} Availability</span>
        </div>
        <div class="status-details">
          You can freely edit your availability. Remember to submit when ready!
        </div>
        <button id="submit-month-availability" class="btn-submit-availability">
          📤 Submit ${monthName} Availability
        </button>
      </div>
    `
    
    // Add event listener for submit button
    const submitBtn = document.getElementById('submit-month-availability')
    if (submitBtn) {
      submitBtn.addEventListener('click', submitMonthAvailability)
    }
  }
}

// Submit availability for current month
async function submitMonthAvailability() {
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const monthName = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (!confirm(`Submit your availability for ${monthName}?\n\nOnce submitted, you cannot make changes without admin approval.`)) {
    return
  }

  try {
    showLoading('Submitting availability...')
    
    const currentUser = await getCurrentUser()
    
    // Get proper user name from users collection
    let userName = currentUser.displayName || 'Anonymous User'
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        userName = userData.name || userName
      }
    } catch (error) {
      console.log('Could not fetch user name from users collection, using displayName')
    }
    
    const submissionData = {
      userId: currentUser.uid,
      userName: userName,
      userEmail: currentUser.email || 'No email',
      monthKey: currentMonthKey,
      submittedAt: new Date().toISOString(),
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    }

    // Save submission record to Firebase
    const docRef = await setDoc(doc(db, 'monthSubmissions', `${currentUser.uid}_${currentMonthKey}`), submissionData)
    
    // Update local status
    monthSubmissionStatus[currentMonthKey] = {
      submitted: true,
      timestamp: submissionData.submittedAt,
      userName: submissionData.userName,
      userEmail: submissionData.userEmail,
      docId: `${currentUser.uid}_${currentMonthKey}`
    }

    showNotification(`✅ ${monthName} availability submitted successfully!`, 'success')
    updateSubmissionUI()
    renderAvailabilityCalendar() // Re-render to show locked state
    hideLoading()

  } catch (error) {
    console.error('❌ Error submitting availability:', error)
    showNotification('Error submitting availability', 'error')
    hideLoading()
  }
}

// Check if current month is submitted (prevents editing)
function isCurrentMonthSubmitted() {
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  return monthSubmissionStatus[currentMonthKey]?.submitted || false
}

// Utility function to clean up orphaned availability records
export async function cleanupOrphanedAvailabilities() {
  try {
    console.log('🧹 Starting cleanup of orphaned availability records...')
    
    // Get all availability records
    const availabilitySnapshot = await getDocs(collection(db, 'availabilities'))
    
    // Get all current appointment IDs
    const appointmentSnapshot = await getDocs(collection(db, 'appointments'))
    const validAppointmentIds = new Set()
    appointmentSnapshot.forEach(doc => {
      validAppointmentIds.add(doc.id)
    })
    
    // Find orphaned records
    const orphanedRecords = []
    availabilitySnapshot.forEach(doc => {
      const data = doc.data()
      if (!validAppointmentIds.has(data.appointmentId)) {
        orphanedRecords.push({
          id: doc.id,
          appointmentId: data.appointmentId
        })
      }
    })
    
    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned availability records found')
      return 0
    }
    
    // Delete orphaned records
    console.log(`🗑️ Deleting ${orphanedRecords.length} orphaned availability records`)
    const deletePromises = orphanedRecords.map(record => 
      deleteDoc(doc(db, 'availabilities', record.id))
    )
    
    await Promise.all(deletePromises)
    console.log('✅ Cleanup completed successfully')
    
    return orphanedRecords.length
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

// Make functions globally available
window.toggleAppointmentAvailability = toggleAppointmentAvailability
window.cleanupOrphanedAvailabilities = cleanupOrphanedAvailabilities