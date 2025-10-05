// Availability Forms Page
// Allows users to fill out availability for all appointments in a specific month

import { db } from '../auth.js'
import { getCurrentUser } from '../auth.js'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'

let currentUser = null
let currentMonth = null
let currentMonthName = null
let appointments = []
let formData = {}
let taskId = null

export async function initializeMonthlyAvailabilityForm() {
  console.log('📝 Initializing Monthly Availability Form...')
  
  try {
    currentUser = getCurrentUser()
    if (!currentUser) {
      console.error('No user logged in')
      window.location.hash = '#login'
      return
    }
    
    // Extract parameters from hash
    // Format: #availability-forms?month=2025-10&monthName=October%202025&taskId=abc
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    let params = new URLSearchParams()
    
    if (queryStart !== -1) {
      const queryString = hash.substring(queryStart + 1)
      params = new URLSearchParams(queryString)
      console.log('📋 Retrieved params from hash:', queryString)
    }
    
    // Also check regular URL parameters as fallback (for backward compatibility)
    const urlParams = new URLSearchParams(window.location.search)
    
    currentMonth = params.get('month') || urlParams.get('month')
    currentMonthName = params.get('monthName') || urlParams.get('monthName')
    taskId = params.get('taskId') || urlParams.get('taskId')
    
    if (!currentMonth) {
      console.error('No month specified in hash or URL')
      showNotification('Month not specified', 'error')
      window.location.hash = '#availability-tracker'
      return
    }
    
    console.log('📅 Loading form for month:', currentMonth, currentMonthName, 'taskId:', taskId)
    
    showLoading('Loading appointments...')
    
    // Load appointments for this month
    await loadMonthAppointments()
    
    // Load existing submission if any
    await loadExistingSubmission()
    
    // Render the form
    renderForm()
    
    hideLoading()
    
          console.log('✅ Created availability-forms section')
  } catch (error) {
    console.error('❌ Error initializing form:', error)
    hideLoading()
    showNotification('Error loading form', 'error')
  }
}

// Load appointments for the specified month
async function loadMonthAppointments() {
  try {
    // Parse month (format: YYYY-MM)
    const [year, month] = currentMonth.split('-')
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    
    console.log('📊 Loading appointments between:', startDate, 'and', endDate)
    
    // Get user's privileges
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
    const userPrivileges = userDoc.data()?.privileges || []
    
    console.log('👤 User privileges:', userPrivileges)
    
    // Query appointments in date range
    const appointmentsRef = collection(db, 'appointments')
    const q = query(
      appointmentsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )
    
    const querySnapshot = await getDocs(q)
    appointments = []
    
    console.log('🔍 Debug: Found', querySnapshot.size, 'appointments in date range')
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const hasPrivilege = userPrivileges.includes(data.title)
      
      console.log('🔍 Appointment:', {
        id: doc.id,
        date: data.date,
        title: data.title,
        time: data.time,
        place: data.place,
        hasPrivilege: hasPrivilege,
        userPrivileges: userPrivileges
      })
      
      // Filter by user's privileges (only show appointments matching user's privilege titles)
      if (hasPrivilege) {
        appointments.push({
          id: doc.id,
          ...data
        })
        console.log('✅ Included appointment:', data.title)
      } else {
        console.log('❌ Excluded appointment:', data.title, '(user privileges:', userPrivileges, ')')
      }
    })
    
    // Sort by date
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date))
    
    console.log(`✅ Loaded ${appointments.length} appointments for ${currentMonthName}`)
    
    // Initialize form data with defaults
    appointments.forEach(apt => {
      formData[apt.id] = {
        available: false,
        notes: ''
      }
    })
    
  } catch (error) {
    console.error('Error loading appointments:', error)
    throw error
  }
}

// Load existing submission if user already submitted for this month
async function loadExistingSubmission() {
  try {
    const submissionsRef = collection(db, 'availabilityReports')
    const q = query(
      submissionsRef,
      where('userId', '==', currentUser.uid),
      where('month', '==', currentMonth)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const submission = querySnapshot.docs[0].data()
      console.log('📋 Found existing submission:', submission)
      
      // Populate form data with existing values
      submission.appointments.forEach(apt => {
        formData[apt.appointmentId] = {
          available: apt.available || false,
          notes: apt.notes || ''
        }
      })
    }
  } catch (error) {
    console.error('Error loading existing submission:', error)
    // Not critical, continue with empty form
  }
}

// Render the form
function renderForm() {
  // Find or create the container
  let container = document.getElementById('availability-forms')
  
  if (!container) {
    // Try multiple selectors for the main container
    let main = document.querySelector('main.main') || 
               document.querySelector('main') || 
               document.querySelector('.main') ||
               document.body
               
    console.log('🔍 Looking for main container:', {
      'main.main': !!document.querySelector('main.main'),
      'main': !!document.querySelector('main'),
      '.main': !!document.querySelector('.main'),
      'body': !!document.body,
      'selected': main?.tagName
    })
    
    if (main) {
      container = document.createElement('section')
      container.id = 'availability-forms'
      container.className = 'section active'
      main.appendChild(container)
      console.log('✅ Created availability-forms section')
    } else {
      console.error('❌ No suitable main container found')
      return
    }
  }
  
  // Hide other sections and show this one
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  container.classList.add('active')
  
  let html = `
    <div class="availability-form-page">
      <div class="page-header">
        <button class="back-button" onclick="window.location.hash='#availability-tracker'">
          ← Back to Availability
        </button>
        <h2 class="page-title">📅 ${currentMonthName || currentMonth} Availability</h2>
        <p class="page-subtitle">Mark your availability for each appointment</p>
      </div>
      
      <form id="availability-form" class="availability-form">
  `
  
  if (appointments.length === 0) {
    html += `
      <div class="no-appointments-message">
        <p>📅 No appointments found for this month that match your privileges.</p>
        <p>Check with your coordinator if you think this is an error.</p>
      </div>
    `
  } else {
    appointments.forEach((apt, index) => {
      const aptDate = new Date(apt.date)
      const formattedDate = aptDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
      
      const isAvailable = formData[apt.id]?.available || false
      const notes = formData[apt.id]?.notes || ''
      
      html += `
        <div class="appointment-form-card">
          <div class="appointment-form-header">
            <div class="appointment-date-info">
              <div class="appointment-weekday">${formattedDate}</div>
              <div class="appointment-details-compact">
                ${apt.time ? `<span class="appointment-time">🕐 ${apt.time}</span>` : ''}
                ${apt.place ? `<span class="appointment-place">📍 ${apt.place}</span>` : ''}
              </div>
            </div>
            <div class="appointment-title-badge">${apt.title}</div>
          </div>
          
          <div class="appointment-form-body">
            <div class="availability-toggle-group">
              <label class="availability-toggle-option">
                <input type="radio" 
                       name="availability-${apt.id}" 
                       value="true" 
                       ${isAvailable ? 'checked' : ''}
                       onchange="updateAvailability('${apt.id}', true)">
                <span class="toggle-label">✅ Available</span>
              </label>
              
              <label class="availability-toggle-option">
                <input type="radio" 
                       name="availability-${apt.id}" 
                       value="false" 
                       ${!isAvailable ? 'checked' : ''}
                       onchange="updateAvailability('${apt.id}', false)">
                <span class="toggle-label">❌ Not Available</span>
              </label>
            </div>
            
            <div class="notes-field">
              <label for="notes-${apt.id}" class="notes-label">Notes (optional):</label>
              <input type="text" 
                     id="notes-${apt.id}" 
                     class="notes-input" 
                     placeholder="Add any comments or details..."
                     value="${notes}"
                     oninput="updateNotes('${apt.id}', this.value)">
            </div>
          </div>
        </div>
      `
    })
  }
  
  html += `
      </form>
      
      ${appointments.length > 0 ? `
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="saveDraft()">
            💾 Save Draft
          </button>
          <button type="button" class="btn btn-primary" onclick="submitForm()">
            ✅ Submit Availability
          </button>
        </div>
      ` : ''}
    </div>
  `
  
  container.innerHTML = html
  
  // Make functions globally available
  window.updateAvailability = updateAvailability
  window.updateNotes = updateNotes
  window.saveDraft = saveDraft
  window.submitForm = submitForm
}

// Update availability in form data
function updateAvailability(appointmentId, available) {
  console.log('📝 Updating availability:', appointmentId, available)
  formData[appointmentId] = formData[appointmentId] || {}
  formData[appointmentId].available = available === true || available === 'true'
}

// Update notes in form data
function updateNotes(appointmentId, notes) {
  formData[appointmentId] = formData[appointmentId] || {}
  formData[appointmentId].notes = notes
}

// Save draft (without completing)
async function saveDraft() {
  try {
    showLoading('Saving draft...')
    
    await saveSubmission('draft')
    
    hideLoading()
    showNotification('Draft saved successfully', 'success')
  } catch (error) {
    console.error('Error saving draft:', error)
    hideLoading()
    showNotification('Error saving draft', 'error')
  }
}

// Submit form (completes and locks)
async function submitForm() {
  try {
    showLoading('Submitting availability...')
    
    // Validate - ensure all appointments have a selection
    const allSelected = appointments.every(apt => 
      formData[apt.id] && (formData[apt.id].available === true || formData[apt.id].available === false)
    )
    
    if (!allSelected) {
      hideLoading()
      showNotification('Please mark your availability for all appointments', 'warning')
      return
    }
    
    // Save submission
    await saveSubmission('submitted')
    
    // Auto-complete the action item if taskId provided
    if (taskId) {
      await completeActionItem()
    }
    
    hideLoading()
    showNotification('✅ Availability submitted successfully!', 'success')
    
    // Redirect back to tracking page after 1 second
    setTimeout(() => {
      window.location.hash = '#availability-tracker'
    }, 1000)
    
  } catch (error) {
    console.error('Error submitting form:', error)
    hideLoading()
    showNotification('Error submitting availability', 'error')
  }
}

// Save submission to Firestore
async function saveSubmission(status) {
  try {
    // Build appointments array
    const appointmentsData = appointments.map(apt => {
      const aptFormData = formData[apt.id] || {}
      return {
        appointmentId: apt.id,
        date: apt.date,
        title: apt.title,
        time: apt.time || '',
        place: apt.place || '',
        available: aptFormData.available || false,
        notes: aptFormData.notes || ''
      }
    })
    
    // Parse month
    const [year, month] = currentMonth.split('-')
    
    // Create submission document
    const submissionData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || currentUser.email,
      month: currentMonth,
      year: parseInt(year),
      monthName: currentMonthName || currentMonth,
      appointments: appointmentsData,
      status: status,
      submittedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    // Check if submission already exists
    const submissionsRef = collection(db, 'availabilityReports')
    const q = query(
      submissionsRef,
      where('userId', '==', currentUser.uid),
      where('month', '==', currentMonth)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      // Update existing submission
      const docId = querySnapshot.docs[0].id
      await updateDoc(doc(db, 'availabilityReports', docId), {
        ...submissionData,
        updatedAt: Timestamp.now()
      })
      console.log('✅ Updated existing submission:', docId)
    } else {
      // Create new submission
      await setDoc(doc(collection(db, 'availabilityReports')), submissionData)
      console.log('✅ Created new submission')
    }
    
  } catch (error) {
    console.error('Error saving submission:', error)
    throw error
  }
}

// Complete the action item that triggered this form
async function completeActionItem() {
  try {
    console.log('✅ Completing action item:', taskId)
    
    // Get action item details for notification
    const itemRef = doc(db, 'actionItems', taskId)
    const itemDoc = await getDoc(itemRef)
    
    if (!itemDoc.exists()) {
      console.error('Action item not found:', taskId)
      return
    }
    
    const itemData = itemDoc.data()
    
    // Update action item to completed
    await updateDoc(itemRef, {
      completed: true,
      completedAt: Timestamp.now(),
      completedBy: currentUser.email
    })
    
    console.log('✅ Action item completed')
    
    // Send notification to admin
    const { createAdminNotification } = await import('../utils/notifications-system.js')
    await createAdminNotification({
      type: 'form_submission',
      title: `${currentUser.displayName || currentUser.email} submitted availability`,
      message: `${itemData.title || 'Monthly availability'} for ${currentMonthName} has been submitted`,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      metadata: {
        taskId: taskId,
        formType: itemData.formType || 'monthly-availability',
        month: currentMonth,
        monthName: currentMonthName,
        submittedAt: new Date().toISOString()
      }
    })
    
    console.log('✅ Admin notification sent')
    
  } catch (error) {
    console.error('Error completing action item:', error)
    // Don't throw - submission is more important
  }
}
