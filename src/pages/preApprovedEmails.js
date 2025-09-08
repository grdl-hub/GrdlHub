import { db } from '../auth.js'
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { showModal, hideModal, validateForm } from '../ui.js'
import { showNotification, showLoading, hideLoading } from '../utils/notifications.js'

let preApprovedEmailsData = []
let preApprovedEmailsUnsubscribe = null

// Initialize pre-approved emails system
export function initializePreApprovedEmails() {
  try {
    setupPreApprovedEmailsSection()
    console.log('Pre-approved emails system initialized')
  } catch (error) {
    console.error('Error initializing pre-approved emails:', error)
  }
}

// Setup pre-approved emails functionality
function setupPreApprovedEmailsSection() {
  // Add email button
  const addEmailBtn = document.getElementById('add-email-btn')
  if (addEmailBtn) {
    addEmailBtn.addEventListener('click', () => {
      showAddEmailModal()
    })
  }
  
  // Email form
  const emailForm = document.getElementById('email-form')
  if (emailForm) {
    emailForm.addEventListener('submit', handleEmailFormSubmit)
  }
  
  // Search functionality for emails
  const emailSearchInput = document.getElementById('email-search-input')
  if (emailSearchInput) {
    emailSearchInput.addEventListener('input', (e) => {
      filterEmails(e.target.value)
    })
  }
  
  // Load emails when on users page
  const usersSection = document.getElementById('users')
  if (usersSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (usersSection.classList.contains('active')) {
            loadPreApprovedEmails()
          } else {
            unsubscribeFromPreApprovedEmails()
          }
        }
      })
    })
    
    observer.observe(usersSection, { attributes: true })
  }
}

// Load pre-approved emails from Firestore
async function loadPreApprovedEmails() {
  try {
    showLoading('Loading pre-approved emails...')
    
    // Set up real-time listener
    const emailsRef = collection(db, 'preApprovedEmails')
    const q = query(emailsRef, orderBy('createdAt', 'desc'))
    
    preApprovedEmailsUnsubscribe = onSnapshot(q, (snapshot) => {
      preApprovedEmailsData = []
      snapshot.forEach((doc) => {
        preApprovedEmailsData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      renderPreApprovedEmails(preApprovedEmailsData)
      updateEmailStats()
      hideLoading()
    }, (error) => {
      console.error('Error loading pre-approved emails:', error)
      showNotification('Error loading pre-approved emails', 'error')
      hideLoading()
    })
  } catch (error) {
    console.error('Error setting up pre-approved emails listener:', error)
    showNotification('Error loading pre-approved emails', 'error')
    hideLoading()
  }
}

// Unsubscribe from pre-approved emails updates
function unsubscribeFromPreApprovedEmails() {
  if (preApprovedEmailsUnsubscribe) {
    preApprovedEmailsUnsubscribe()
    preApprovedEmailsUnsubscribe = null
  }
}

// Check if email is pre-approved
export async function isEmailPreApproved(email) {
  try {
    const emailsRef = collection(db, 'preApprovedEmails')
    const q = query(emailsRef, where('email', '==', email.toLowerCase()))
    const snapshot = await getDocs(q)
    
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking pre-approved email:', error)
    return false
  }
}

// Add email to pre-approved list
export async function addPreApprovedEmail(emailData) {
  try {
    const emailsRef = collection(db, 'preApprovedEmails')
    
    // Check if email already exists
    const existingEmailQuery = query(emailsRef, where('email', '==', emailData.email.toLowerCase()))
    const existingSnapshot = await getDocs(existingEmailQuery)
    
    if (!existingSnapshot.empty) {
      throw new Error('Email is already in the pre-approved list')
    }
    
    // Add the email
    await addDoc(emailsRef, {
      email: emailData.email.toLowerCase(),
      addedBy: emailData.addedBy,
      notes: emailData.notes || '',
      createdAt: serverTimestamp(),
      status: 'pending' // pending, invited, registered
    })
    
    showNotification('Email added to pre-approved list successfully', 'success')
    return true
  } catch (error) {
    console.error('Error adding pre-approved email:', error)
    showNotification(error.message || 'Error adding email to pre-approved list', 'error')
    return false
  }
}

// Remove email from pre-approved list
export async function removePreApprovedEmail(emailId) {
  try {
    await deleteDoc(doc(db, 'preApprovedEmails', emailId))
    showNotification('Email removed from pre-approved list', 'success')
    return true
  } catch (error) {
    console.error('Error removing pre-approved email:', error)
    showNotification('Error removing email from pre-approved list', 'error')
    return false
  }
}

// Update email status (pending -> invited -> registered)
export async function updateEmailStatus(emailId, status) {
  try {
    const emailRef = doc(db, 'preApprovedEmails', emailId)
    await setDoc(emailRef, { 
      status,
      updatedAt: serverTimestamp()
    }, { merge: true })
    
    return true
  } catch (error) {
    console.error('Error updating email status:', error)
    return false
  }
}

// Render pre-approved emails table
function renderPreApprovedEmails(emails) {
  const tbody = document.getElementById('emails-tbody')
  if (!tbody) return
  
  if (emails.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No pre-approved emails found</p>
          <button class="btn btn-primary" onclick="showAddEmailModal()">Add First Email</button>
        </td>
      </tr>
    `
    return
  }
  
  tbody.innerHTML = emails.map(email => `
    <tr>
      <td>
        <div class="email-info">
          <div class="email-address">${email.email}</div>
          ${email.notes ? `<div class="email-notes">${email.notes}</div>` : ''}
        </div>
      </td>
      <td>
        <span class="status-badge status-${email.status}">
          ${email.status || 'pending'}
        </span>
      </td>
      <td>${email.addedBy || 'Unknown'}</td>
      <td>${email.createdAt ? new Date(email.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-outline" onclick="editPreApprovedEmail('${email.id}')">
            Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePreApprovedEmail('${email.id}')">
            Remove
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

// Filter emails
function filterEmails(searchTerm) {
  const filteredEmails = preApprovedEmailsData.filter(email =>
    email.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (email.notes && email.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  renderPreApprovedEmails(filteredEmails)
}

// Update email statistics
function updateEmailStats() {
  const totalEmails = preApprovedEmailsData.length
  const pendingEmails = preApprovedEmailsData.filter(email => email.status === 'pending').length
  const invitedEmails = preApprovedEmailsData.filter(email => email.status === 'invited').length
  const registeredEmails = preApprovedEmailsData.filter(email => email.status === 'registered').length
  
  // Update stats in UI if elements exist
  const totalEmailsEl = document.getElementById('total-emails-count')
  const pendingEmailsEl = document.getElementById('pending-emails-count')
  const invitedEmailsEl = document.getElementById('invited-emails-count')
  const registeredEmailsEl = document.getElementById('registered-emails-count')
  
  if (totalEmailsEl) totalEmailsEl.textContent = totalEmails
  if (pendingEmailsEl) pendingEmailsEl.textContent = pendingEmails
  if (invitedEmailsEl) invitedEmailsEl.textContent = invitedEmails
  if (registeredEmailsEl) registeredEmailsEl.textContent = registeredEmails
}

// Show add email modal
function showAddEmailModal() {
  const modalContent = `
    <div class="modal-header">
      <h3>Add Pre-Approved Email</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="email-form" class="form">
        <div class="form-group">
          <label for="email-input">Email Address *</label>
          <input 
            type="email" 
            id="email-input" 
            name="email" 
            required 
            placeholder="user@example.com"
            autocomplete="email"
          />
          <div class="form-error" id="email-error"></div>
        </div>
        
        <div class="form-group">
          <label for="notes-input">Notes (Optional)</label>
          <textarea 
            id="notes-input" 
            name="notes" 
            rows="3"
            placeholder="Additional notes about this email..."
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Email</button>
        </div>
      </form>
    </div>
  `
  
  showModal(modalContent)
  
  // Focus on email input
  setTimeout(() => {
    const emailInput = document.getElementById('email-input')
    if (emailInput) emailInput.focus()
  }, 100)
}

// Handle email form submission
async function handleEmailFormSubmit(e) {
  e.preventDefault()
  
  const formData = new FormData(e.target)
  const emailData = {
    email: formData.get('email').trim(),
    notes: formData.get('notes').trim(),
    addedBy: 'Admin' // TODO: Get from current user context
  }
  
  // Validate form
  if (!validateForm(e.target)) {
    return
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailData.email)) {
    showNotification('Please enter a valid email address', 'error')
    return
  }
  
  showLoading('Adding email...')
  
  const success = await addPreApprovedEmail(emailData)
  
  hideLoading()
  
  if (success) {
    hideModal()
    e.target.reset()
  }
}

// Global functions for button actions
window.editPreApprovedEmail = function(emailId) {
  const email = preApprovedEmailsData.find(e => e.id === emailId)
  if (!email) return
  
  // TODO: Implement edit functionality
  showNotification('Edit functionality coming soon', 'info')
}

window.deletePreApprovedEmail = async function(emailId) {
  const email = preApprovedEmailsData.find(e => e.id === emailId)
  if (!email) return
  
  if (confirm(`Are you sure you want to remove "${email.email}" from the pre-approved list?`)) {
    await removePreApprovedEmail(emailId)
  }
}

window.showAddEmailModal = showAddEmailModal
