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

// Target event type to filter
const TARGET_EVENT_TYPE = 'field-service-meeting'

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

// Load appointments with specific event type
async function loadFieldServiceAppointments() {
  try {
    console.log('📊 Loading Field Service appointments...')
    
    const appointmentsRef = collection(db, 'appointments')
    const q = query(
      appointmentsRef,
      where('eventType', '==', TARGET_EVENT_TYPE)
    )
    
    const querySnapshot = await getDocs(q)
    const allAppointments = []
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      console.log('📋 Found appointment:', data)
      allAppointments.push({
        id: doc.id,
        ...data
      })
    })
    
    console.log(`📦 Total appointments from Firestore: ${allAppointments.length}`)
    
    // Expand recurring appointments and filter future ones
    appointments = []
    allAppointments.forEach(apt => {
      console.log(`🔄 Processing: ${apt.title}, date: ${apt.date}, repeatPattern: ${apt.repeatPattern}`)
      const expanded = expandRecurringAppointment(apt, now)
      console.log(`   Expanded into ${expanded.length} occurrences`)
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
  
  // Parse date string (format: "YYYY-MM-DD")
  if (!appointment.date) {
    console.warn('⚠️ Appointment missing date field:', appointment)
    return occurrences
  }
  
  const appointmentDate = new Date(appointment.date + 'T00:00:00')
  
  if (!appointment.repeatPattern || appointment.repeatPattern === 'none') {
    // Single occurrence
    if (appointmentDate >= fromDate) {
      occurrences.push({
        ...appointment,
        date: appointmentDate,
        isRecurring: false
      })
    }
  } else {
    // Recurring appointment - generate occurrences
    const pattern = appointment.repeatPattern
    let currentDate = new Date(appointmentDate)
    const limitDate = new Date(fromDate)
    limitDate.setFullYear(limitDate.getFullYear() + 1) // Show up to 1 year ahead
    
    // If appointment has an endDate, use it, otherwise show up to 1 year
    const maxDate = appointment.endDate ? new Date(appointment.endDate + 'T00:00:00') : limitDate
    
    while (currentDate <= maxDate && currentDate <= limitDate) {
      if (currentDate >= fromDate) {
        occurrences.push({
          ...appointment,
          date: new Date(currentDate),
          isRecurring: true,
          originalStartDate: appointmentDate
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
        <h2 class="page-title">🚪 Field Service Meetings</h2>
        <p class="page-description">Schedule for field service meetings</p>
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

// Render card list view grouped by week
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

  // Group appointments by week
  const weekGroups = groupAppointmentsByWeek(appointments)
  
  let html = '<div class="appointments-list">'
  
  weekGroups.forEach(week => {
    html += `
      <div class="week-group">
        <div class="week-header">
          <h3>${week.weekLabel}</h3>
        </div>
        <div class="cards-grid">
    `
    
    week.appointments.forEach(apt => {
      const dayName = getDayName(apt.date)
      const timeStr = apt.time || 'Time not set'
      const location = apt.place || 'Location not set'
      
      // Extract organizer names from designations array
      let organizers = 'Not assigned'
      if (apt.designations && Array.isArray(apt.designations) && apt.designations.length > 0) {
        organizers = apt.designations.map(d => d.userName || d.userId).join(', ')
      }
      
      const isRecurring = apt.isRecurring ? '🔄 ' : ''
      
      html += `
        <div class="appointment-card">
          <div class="appointment-header">
            <span class="appointment-date">${isRecurring}${dayName}</span>
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
            <div class="appointment-detail">
              <span class="detail-icon">👥</span>
              <span class="detail-text">${organizers}</span>
            </div>
          </div>
        </div>
      `
    })
    
    html += `
        </div>
      </div>
    `
  })
  
  html += '</div>'
  return html
}

// Group appointments by week
function groupAppointmentsByWeek(appointments) {
  const weeks = []
  const weekMap = new Map()
  
  appointments.forEach(apt => {
    const weekKey = getWeekKey(apt.date)
    
    if (!weekMap.has(weekKey)) {
      const weekLabel = getWeekLabel(apt.date)
      weekMap.set(weekKey, {
        weekKey,
        weekLabel,
        appointments: []
      })
      weeks.push(weekMap.get(weekKey))
    }
    
    weekMap.get(weekKey).appointments.push(apt)
  })
  
  return weeks
}

// Get week key for grouping (year-week)
function getWeekKey(date) {
  const d = new Date(date)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + yearStart.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${weekNum}`
}

// Get week label (e.g., "Week of Oct 5 - Oct 12, 2025")
function getWeekLabel(date) {
  const d = new Date(date)
  const monday = new Date(d)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  monday.setDate(diff)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  const startMonth = monday.toLocaleDateString('en-US', { month: 'short' })
  const startDay = monday.getDate()
  const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' })
  const endDay = sunday.getDate()
  const year = sunday.getFullYear()
  
  // If same month, show: Week of Oct 5 - 12, 2025
  if (monday.getMonth() === sunday.getMonth()) {
    return `Week of ${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  
  // If different months, show: Week of Oct 30 - Nov 5, 2025
  return `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

// Get day name only (e.g., "Monday")
function getDayName(date) {
  const options = { weekday: 'long' }
  return date.toLocaleDateString('en-US', options)
}

// Render monthly calendar view
function renderCalendarView() {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  return `
    <div class="calendar-view">
      <div class="calendar-header">
        <h3>📆 Monthly View</h3>
        <div class="calendar-nav">
          <button id="fs-prev-month" class="btn btn-secondary btn-small" onclick="fieldServiceMeetings.previousMonth()">‹ Prev</button>
          <span id="fs-current-month-year" class="month-display">${monthNames[month]} ${year}</span>
          <button id="fs-next-month" class="btn btn-secondary btn-small" onclick="fieldServiceMeetings.nextMonth()">Next ›</button>
        </div>
      </div>
      <div class="calendar-grid">
        ${renderCalendarGrid(year, month)}
      </div>
    </div>
  `
}

// Render calendar grid (Monday-start week)
function renderCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Adjust for Monday start: 0=Sunday becomes 6, 1=Monday becomes 0, etc.
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7
  
  // Calculate previous month details
  const prevMonth = new Date(year, month - 1, 0)
  const daysInPrevMonth = prevMonth.getDate()
  
  // Build calendar HTML with Monday start
  let html = `
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
  
  // Add trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i
    const prevMonthDate = new Date(year, month - 1, prevDay)
    const dateString = formatDateString(prevMonthDate)
    const dayAppointments = getAppointmentsForDateString(dateString)
    const isToday = isSameDate(prevMonthDate, new Date())
    
    let dayClass = 'calendar-day other-month'
    if (isToday) dayClass += ' today'
    if (dayAppointments.length > 0) dayClass += ' has-appointments'
    
    html += `
      <div class="${dayClass}" data-date="${dateString}">
        <div class="day-number">${prevDay}</div>
        <div class="appointments-preview">${renderDayAppointments(dayAppointments, 2)}</div>
      </div>
    `
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day)
    const dateString = formatDateString(dayDate)
    const dayAppointments = getAppointmentsForDateString(dateString)
    const isToday = isSameDate(dayDate, new Date())
    
    let dayClass = 'calendar-day'
    if (isToday) dayClass += ' today'
    if (dayAppointments.length > 0) dayClass += ' has-appointments'
    
    html += `
      <div class="${dayClass}" data-date="${dateString}">
        <div class="day-number">${day}</div>
        <div class="appointments-preview">${renderDayAppointments(dayAppointments, 3)}</div>
      </div>
    `
  }
  
  // Calculate remaining cells to complete the grid
  const totalCellsUsed = firstDayOfWeek + daysInMonth
  const remainingCells = (7 - (totalCellsUsed % 7)) % 7
  
  // Add leading days from next month
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDate = new Date(year, month + 1, day)
    const dateString = formatDateString(nextMonthDate)
    const dayAppointments = getAppointmentsForDateString(dateString)
    const isToday = isSameDate(nextMonthDate, new Date())
    
    let dayClass = 'calendar-day other-month'
    if (isToday) dayClass += ' today'
    if (dayAppointments.length > 0) dayClass += ' has-appointments'
    
    html += `
      <div class="${dayClass}" data-date="${dateString}">
        <div class="day-number">${day}</div>
        <div class="appointments-preview">${renderDayAppointments(dayAppointments, 2)}</div>
      </div>
    `
  }
  
  return html
}

// Render appointments for a day
function renderDayAppointments(dayAppointments, maxShow) {
  let html = ''
  
  dayAppointments.slice(0, maxShow).forEach(apt => {
    const timeText = apt.time || 'No time'
    const title = apt.title || 'Meeting'
    
    // Extract organizer names
    let designationsText = ''
    if (apt.designations && Array.isArray(apt.designations) && apt.designations.length > 0) {
      const names = apt.designations.map(d => d.userName || d.userId).join(', ')
      designationsText = `\n👥 ${names}`
    }
    
    html += `
      <div class="appointment-item meeting" 
           title="${title}\n🕐 ${timeText}\n📍 ${apt.place || 'No location'}${designationsText}">
        <div class="apt-time">${timeText}</div>
        <div class="apt-title">${title}</div>
      </div>
      ${apt.designations && apt.designations.length > 0 ? 
        `<div class="apt-designations">👥 ${apt.designations.map(d => d.userName || d.userId).join(', ')}</div>` : ''}
    `
  })
  
  if (dayAppointments.length > maxShow) {
    html += `<div class="appointment-more">+${dayAppointments.length - maxShow} more</div>`
  }
  
  return html
}

// Format date as YYYY-MM-DD string
function formatDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Get appointments for a specific date string
function getAppointmentsForDateString(dateString) {
  return appointments.filter(apt => {
    const aptDateString = formatDateString(apt.date)
    return aptDateString === dateString
  })
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
