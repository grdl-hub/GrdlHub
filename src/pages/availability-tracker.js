// Availability Tracker Page
// Shows list of months with submission status (like screenshot)

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
let submissions = []
let activeActionItems = []

export async function initializeMonthlyAvailability() {
  console.log('📅 Initializing Monthly Availability Tracking...')
  
  try {
    currentUser = getCurrentUser()
    if (!currentUser) {
      console.error('No user logged in')
      window.navigateTo('login')
      return
    }
    
    await loadSubmissions()
    await loadActiveActionItems()
    renderMonthsList()
    
    console.log('✅ Monthly Availability initialized')
  } catch (error) {
    console.error('❌ Error initializing monthly availability:', error)
    showNotification('Error loading availability tracking', 'error')
  }
}

// Load user's previous submissions
async function loadSubmissions() {
  try {
    console.log('📊 Loading submissions for user:', currentUser.email)
    
    const submissionsRef = collection(db, 'availabilityReports')
    // Simple query without orderBy to avoid composite index requirement
    const q = query(
      submissionsRef,
      where('userId', '==', currentUser.uid)
    )
    
    const querySnapshot = await getDocs(q)
    submissions = []
    
    querySnapshot.forEach((doc) => {
      submissions.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Sort manually in JavaScript
    submissions.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month.localeCompare(a.month)
    })
    
    console.log(`✅ Loaded ${submissions.length} submissions`)
  } catch (error) {
    console.error('Error loading submissions:', error)
    submissions = []
  }
}

// Load active action items for this user
async function loadActiveActionItems() {
  try {
    console.log('📋 Loading active action items...')
    
    const actionItemsRef = collection(db, 'actionItems')
    const q = query(
      actionItemsRef,
      where('assignedTo', 'array-contains', currentUser.email),
      where('completed', '==', false),
      where('formType', '==', 'monthly-availability')
    )
    
    const querySnapshot = await getDocs(q)
    activeActionItems = []
    
    querySnapshot.forEach((doc) => {
      activeActionItems.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`✅ Loaded ${activeActionItems.length} active action items`)
  } catch (error) {
    console.error('Error loading action items:', error)
    activeActionItems = []
  }
}

// Generate list of months to display (only submitted months + months with active tasks)
function generateMonthsList() {
  const monthsMap = new Map()
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() // 0-11
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  // Add months from submitted reports
  submissions.forEach(submission => {
    const [year, month] = submission.month.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    const displayName = `${monthNames[date.getMonth()]} ${year}`
    
    monthsMap.set(submission.month, {
      monthKey: submission.month,
      year: parseInt(year),
      month: parseInt(month),
      displayName,
      submission,
      isCurrentMonth: submission.month === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      hasActionItem: false,
      actionItem: null
    })
  })
  
  // Add months from active action items
  activeActionItems.forEach(item => {
    if (item.reportingPeriod?.startDate) {
      // Extract month from start date (format: "YYYY-MM-DD")
      const startDate = item.reportingPeriod.startDate
      const monthKey = startDate.substring(0, 7) // "YYYY-MM"
      const displayName = item.reportingPeriod.displayName || monthKey
      
      if (!monthsMap.has(monthKey)) {
        const [year, month] = monthKey.split('-')
        monthsMap.set(monthKey, {
          monthKey,
          year: parseInt(year),
          month: parseInt(month),
          displayName,
          submission: null,
          isCurrentMonth: monthKey === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
          hasActionItem: true,
          actionItem: item
        })
      } else {
        // Mark existing submission month as having an action item
        const existing = monthsMap.get(monthKey)
        existing.hasActionItem = true
        existing.actionItem = item
      }
    }
  })
  
  // Convert map to array and sort by date (newest first)
  const months = Array.from(monthsMap.values())
  months.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
  
  console.log(`📅 Generated ${months.length} relevant months to display`)
  
  return months
}

// Generate list of months to display (12 months: 6 past + current + 5 future)
function generateMonthsList_OLD() {
  const months = []
  const today = new Date()
  
  // Start from 6 months ago
  for (let i = -6; i <= 5; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const monthKey = `${year}-${month}`
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const monthName = monthNames[date.getMonth()]
    const displayName = `${monthName} ${year}`
    
    // Check if submission exists for this month
    const submission = submissions.find(s => s.month === monthKey)
    
    months.push({
      monthKey,
      year,
      month: month,
      displayName,
      submission: submission || null,
      isCurrentMonth: i === 0
    })
  }
  
  return months
}

// Render the months list (like availability screenshot)
function renderMonthsList() {
  // Find or create the container
  let container = document.getElementById('availability-tracker')
  
  if (!container) {
    // If section doesn't exist, create it inside <main>
    const main = document.querySelector('main.main')
    if (main) {
      container = document.createElement('section')
      container.id = 'availability-tracker'
      container.className = 'section active'
      main.appendChild(container)
    } else {
      console.error('Main container not found')
      return
    }
  }
  
  // Hide other sections and show this one
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  container.classList.add('active')
  
  const months = generateMonthsList()
  
  let html = `
    <div class="availability-tracking-page">
      <div class="page-header">
        <button class="back-button" onclick="window.navigateTo('home')">
          ← Back to Home
        </button>
        <h2 class="page-title">📅 Monthly Availability</h2>
        <p class="page-subtitle">View pending tasks and submitted reports</p>
      </div>
      
      ${months.length === 0 ? `
        <div class="empty-state" style="text-align: center; padding: 3rem; color: #6b7280;">
          <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">📅 No availability reports yet</p>
          <p style="font-size: 0.875rem;">Action items will appear here when assigned by your admin</p>
        </div>
      ` : '<div class="months-list-container">'}
  `
  
  months.forEach(monthData => {
    const hasSubmission = monthData.submission !== null
    const hasActionItem = monthData.hasActionItem
    const statusClass = hasSubmission ? 'status-submitted' : 'status-not-entered'
    const highlightClass = monthData.isCurrentMonth ? 'current-month' : ''
    const pendingClass = hasActionItem && !hasSubmission ? 'pending-action' : ''
    
    let statusHTML = ''
    if (hasSubmission) {
      const submittedDate = monthData.submission.submittedAt?.toDate() || 
                           monthData.submission.updatedAt?.toDate() ||
                           new Date()
      const formattedDate = submittedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      
      statusHTML = `
        <div class="month-status-details">
          <div class="status-icon">✅</div>
          <div class="month-status-label">Updated By</div>
          <div class="month-status-value">${monthData.submission.userName || currentUser.displayName || currentUser.email}</div>
          <div class="month-status-label">Updated On</div>
          <div class="month-status-value">${formattedDate}</div>
        </div>
      `
    } else if (hasActionItem) {
      // Has active action item but not submitted yet
      const dueDate = monthData.actionItem.dueDate?.toDate?.() || new Date(monthData.actionItem.dueDate)
      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      
      statusHTML = `
        <div class="month-status-pending">
          <div class="status-icon">⏳</div>
          <div class="pending-label">Waiting for submission</div>
          <div class="due-date">Due: ${formattedDueDate}</div>
        </div>
      `
    } else {
      // Should not happen with new logic, but keeping as fallback
      statusHTML = `
        <div class="month-status-not-entered">
          Not entered
        </div>
      `
    }
    
    // Get taskId from actionItem if available
    const taskIdParam = monthData.actionItem?.id || ''
    
    html += `
      <div class="month-card ${statusClass} ${highlightClass} ${pendingClass}" 
           onclick="openMonthForm('${monthData.monthKey}', '${monthData.displayName}', '${taskIdParam}')"
           data-month="${monthData.monthKey}">
        <div class="month-card-header">
          <h3 class="month-title">${monthData.displayName}</h3>
          ${monthData.isCurrentMonth ? '<span class="current-month-badge">CURRENT MONTH</span>' : ''}
        </div>
        <div class="month-card-body">
          ${statusHTML}
        </div>
      </div>
    `
  })
  
  if (months.length > 0) {
    html += `
        </div>
      </div>
    `
  } else {
    html += `
      </div>
    `
  }
  
  container.innerHTML = html
}

// Open form for specific month
window.openMonthForm = function(monthKey, displayName, taskId = '') {
  console.log('📝 Opening form for month:', monthKey, displayName, 'taskId:', taskId)
  
  // Build URL with hash and query parameters
  const params = new URLSearchParams({
    month: monthKey,
    monthName: displayName
  })
  
  if (taskId) {
    params.set('taskId', taskId)
  }
  
  // Navigate with hash and parameters: #availability-forms?month=...&monthName=...&taskId=...
  window.location.hash = `#availability-forms?${params.toString()}`
}
