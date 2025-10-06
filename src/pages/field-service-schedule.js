// Field Service Schedule Page
// Shows appointments filtered by title "Reuniões para o Serviço de Campo"

import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { showNotification } from '../utils/notifications.js'

let currentUser = null
let appointments = []
let currentView = 'list' // 'list' or 'calendar'
let currentDate = new Date()

// Target title to filter
const TARGET_TITLE = 'Reuniões para o Serviço de Campo'

export async function initializeFieldServiceMeetings() {
  console.log('🏫 Initializing Field Service Schedule page...')
  
  try {
    currentUser = getCurrentUser()
    if (!currentUser) {
      console.error('No user logged in')
      window.navigateTo('login')
      return
    }
    
    await loadFieldServiceAppointments()
    renderPage()
    
    console.log('✅ Field Service Schedule page initialized')
  } catch (error) {
    console.error('❌ Error initializing Field Service Schedule page:', error)
    showNotification('Error loading Field Service Schedule', 'error')
  }
}

// Load appointments with specific title
async function loadFieldServiceAppointments() {
  try {
    console.log('📊 Loading Field Service appointments...')
    
    const appointmentsRef = collection(db, 'appointments')
    const q = query(
      appointmentsRef,
      where('title', '==', TARGET_TITLE)
    )
    
    const querySnapshot = await getDocs(q)
    const allAppointments = []
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      allAppointments.push({
        id: doc.id,
        ...data
      })
    })
    
    // Expand recurring appointments and filter future ones
    appointments = []
    allAppointments.forEach(apt => {
      const expanded = expandRecurringAppointment(apt, now)
      appointments.push(...expanded)
    })
    
    // Sort by date (earliest first)
    appointments.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    console.log(`✅ Loaded ${appointments.length} future Field Service appointments`)
  } catch (error) {
    console.error('Error loading appointments:', error)
    showNotification('Error loading appointments', 'error')
    appointments = []
  }
}

// Expand recurring appointments into individual occurrences
function expandRecurringAppointment(appointment, fromDate) {
  const occurrences = []
  
  // Convert Firestore timestamp to Date
  const startDate = appointment.startDate?.toDate ? appointment.startDate.toDate() : new Date(appointment.startDate)
  const endDate = appointment.endDate?.toDate ? appointment.endDate.toDate() : new Date(appointment.endDate)
  
  if (!appointment.repeatPattern || appointment.repeatPattern === 'none') {
    // Single occurrence
    if (startDate >= fromDate) {
      occurrences.push({
        ...appointment,
        date: startDate,
        isRecurring: false
      })
    }
  } else {
    // Recurring appointment - generate occurrences
    const pattern = appointment.repeatPattern
    let currentDate = new Date(startDate)
    const maxDate = new Date(endDate)
    const limitDate = new Date(fromDate)
    limitDate.setFullYear(limitDate.getFullYear() + 1) // Show up to 1 year ahead
    
    while (currentDate <= maxDate && currentDate <= limitDate) {
      if (currentDate >= fromDate) {
        occurrences.push({
          ...appointment,
          date: new Date(currentDate),
          isRecurring: true,
          originalStartDate: startDate
        })
      }
      
      // Move to next occurrence based on pattern
      if (pattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (pattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (pattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else {
        break // Unknown pattern
      }
    }
  }
  
  return occurrences
}

// Render main page
function renderPage() {
  const container = document.getElementById('field-service-meetings-container')
  if (!container) {
    console.error('Field Service Meetings container not found')
    return
  }

  container.innerHTML = `
    <div class="field-service-meetings-page">
      <div class="page-header">
        <h2 class="page-title">🏫 Field Service Schedule</h2>
        <p class="page-description">Schedule for ${TARGET_TITLE}</p>
      </div>

      <div class="view-controls">
        <div class="view-toggle">
          <button class="view-toggle-btn ${currentView === 'list' ? 'active' : ''}" onclick="fieldServiceMeetings.switchView('list')">
            📋 List View
          </button>
          <button class="view-toggle-btn ${currentView === 'calendar' ? 'active' : ''}" onclick="fieldServiceMeetings.switchView('calendar')">
            📅 Calendar View
          </button>
        </div>
        <button class="btn btn-secondary" onclick="fieldServiceMeetings.refresh()">
          🔄 Refresh
        </button>
      </div>

      <div id="view-content">
        ${currentView === 'list' ? renderListView() : renderCalendarView()}
      </div>
    </div>
  `
}

// Render card list view
function renderListView() {
  if (appointments.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No Upcoming Meetings</h3>
        <p>There are no scheduled field service meetings at this time.</p>
      </div>
    `
  }

  const cards = appointments.map(apt => {
    const dateStr = formatDate(apt.date)
    const timeStr = apt.time || 'Time not set'
    const location = apt.location || 'Location not set'
    const isRecurring = apt.isRecurring ? '🔄' : ''
    
    return `
      <div class="appointment-card">
        <div class="appointment-header">
          <h3 class="appointment-title">${isRecurring} ${apt.title}</h3>
          <span class="appointment-date">${dateStr}</span>
        </div>
        <div class="appointment-body">
          <div class="appointment-detail">
            <span class="detail-icon">🕐</span>
            <span class="detail-text">${timeStr}</span>
          </div>
          <div class="appointment-detail">
            <span class="detail-icon">📍</span>
            <span class="detail-text">${location}</span>
          </div>
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="appointments-list">
      <div class="list-header">
        <h3>Upcoming Meetings (${appointments.length})</h3>
      </div>
      <div class="cards-grid">
        ${cards}
      </div>
    </div>
  `
}

// Render monthly calendar view
function renderCalendarView() {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  return `
    <div class="calendar-view">
      <div class="calendar-header">
        <button class="btn btn-icon" onclick="fieldServiceMeetings.previousMonth()">
          ◀
        </button>
        <h3 class="calendar-title">${getMonthName(month)} ${year}</h3>
        <button class="btn btn-icon" onclick="fieldServiceMeetings.nextMonth()">
          ▶
        </button>
      </div>
      <div class="calendar-grid">
        ${renderCalendarGrid(year, month)}
      </div>
    </div>
  `
}

// Render calendar grid
function renderCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  let html = '<div class="calendar-days-header">'
  dayNames.forEach(day => {
    html += `<div class="calendar-day-name">${day}</div>`
  })
  html += '</div><div class="calendar-days-grid">'
  
  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>'
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayAppointments = getAppointmentsForDate(date)
    const isToday = isSameDate(date, new Date())
    const hasAppointments = dayAppointments.length > 0
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasAppointments ? 'has-appointments' : ''}">
        <div class="day-number">${day}</div>
        ${hasAppointments ? `
          <div class="day-appointments">
            ${dayAppointments.map(apt => `
              <div class="day-appointment" title="${apt.title} - ${apt.time || 'No time'} - ${apt.location || 'No location'}">
                🏫 ${apt.time || ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  }
  
  html += '</div>'
  return html
}

// Get appointments for specific date
function getAppointmentsForDate(date) {
  return appointments.filter(apt => isSameDate(apt.date, date))
}

// Helper: Check if two dates are the same day
function isSameDate(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// Format date for display
function formatDate(date) {
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

// Get month name
function getMonthName(month) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return monthNames[month]
}

// Public API for window object
window.fieldServiceMeetings = {
  switchView: function(view) {
    currentView = view
    renderPage()
  },
  
  previousMonth: function() {
    currentDate.setMonth(currentDate.getMonth() - 1)
    renderPage()
  },
  
  nextMonth: function() {
    currentDate.setMonth(currentDate.getMonth() + 1)
    renderPage()
  },
  
  refresh: async function() {
    await loadFieldServiceAppointments()
    renderPage()
    showNotification('Field Service Schedule refreshed', 'success')
  }
}
