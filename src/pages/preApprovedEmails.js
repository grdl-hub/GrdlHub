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

// Utility function to generate secure magic token
function generateMagicToken() {
  // Generate a cryptographically secure random token
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

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
    
    // Generate magic link token and expiration
    const magicToken = generateMagicToken()
    const magicLinkExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Add the email with magic link data
    const docRef = await addDoc(emailsRef, {
      email: emailData.email.toLowerCase(),
      addedBy: emailData.addedBy,
      notes: emailData.notes || '',
      createdAt: serverTimestamp(),
      status: 'invited', // Auto-set to invited since we're sending the link
      magicToken: magicToken,
      magicLinkExpiresAt: magicLinkExpiresAt,
      invitedAt: serverTimestamp()
    })
    
    // Generate magic link
    const magicLink = `${window.location.origin}/auth.html?token=${magicToken}&email=${encodeURIComponent(emailData.email)}`
    
    // Show success with the magic link
    showNotification('Email added and invitation sent! Magic link generated.', 'success')
    showMagicLinkModal(emailData.email, magicLink)
    
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
          ${email.status === 'pending' ? 
            `<button class="btn btn-sm btn-primary" onclick="sendInviteToEmail('${email.id}', '${email.email}')">
              📧 Send Invite
            </button>` : 
            email.status === 'invited' ?
            `<button class="btn btn-sm btn-info" onclick="resendInviteToEmail('${email.id}', '${email.email}')">
              🔄 Resend
            </button>` :
            `<span class="btn btn-sm btn-success disabled">✅ Registered</span>`
          }
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

// Generate secure magic link for email invitation
export function generateMagicLink(email) {
  try {
    // Generate a secure random token
    const token = crypto.getRandomValues(new Uint8Array(32))
    const tokenString = Array.from(token, byte => byte.toString(16).padStart(2, '0')).join('')
    
    // Create expiration time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    // Create magic link
    const baseUrl = window.location.origin
    const magicLink = `${baseUrl}/auth.html?magic=${tokenString}&email=${encodeURIComponent(email)}&expires=${expiresAt.getTime()}`
    
    return {
      token: tokenString,
      link: magicLink,
      expiresAt: expiresAt
    }
  } catch (error) {
    console.error('Error generating magic link:', error)
    return null
  }
}

// Send email invitation with magic link
export async function sendEmailInvitation(email, inviterName = 'GrdlHub Admin') {
  try {
    // Generate magic link
    const magicLinkData = generateMagicLink(email)
    if (!magicLinkData) {
      throw new Error('Failed to generate magic link')
    }
    
    // Update email status and store magic link data
    const emailsRef = collection(db, 'preApprovedEmails')
    const q = query(emailsRef, where('email', '==', email.toLowerCase()))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      throw new Error('Email not found in pre-approved list')
    }
    
    const emailDoc = snapshot.docs[0]
    await setDoc(doc(db, 'preApprovedEmails', emailDoc.id), {
      status: 'invited',
      invitedAt: serverTimestamp(),
      invitedBy: inviterName,
      magicToken: magicLinkData.token,
      magicLinkExpiresAt: magicLinkData.expiresAt,
      updatedAt: serverTimestamp()
    }, { merge: true })
    
    // In a real implementation, you would send this via an email service
    // For now, we'll show the magic link to copy and send manually
    showMagicLinkModal(email, magicLinkData.link)
    
    showNotification(`Invitation prepared for ${email}`, 'success')
    return { success: true, magicLink: magicLinkData.link }
    
  } catch (error) {
    console.error('Error sending email invitation:', error)
    showNotification(`Error sending invitation: ${error.message}`, 'error')
    return { success: false, error: error.message }
  }
}

// Validate magic link token
export async function validateMagicLink(token, email) {
  try {
    const emailsRef = collection(db, 'preApprovedEmails')
    const q = query(emailsRef, 
      where('email', '==', email.toLowerCase()),
      where('magicToken', '==', token)
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return { valid: false, reason: 'Invalid or expired invitation link' }
    }
    
    const emailData = snapshot.docs[0].data()
    
    // Check if token has expired
    if (emailData.magicLinkExpiresAt && emailData.magicLinkExpiresAt.toDate() < new Date()) {
      return { valid: false, reason: 'Invitation link has expired' }
    }
    
    return { 
      valid: true, 
      emailData: emailData,
      documentId: snapshot.docs[0].id
    }
    
  } catch (error) {
    console.error('Error validating magic link:', error)
    return { valid: false, reason: 'Error validating invitation link' }
  }
}

// Show magic link modal for manual sharing
function showMagicLinkModal(email, magicLink) {
  const modalContent = `
    <div class="modal-header">
      <h3>📧 Invitation Link Ready</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="invitation-details">
        <p><strong>Invitation for:</strong> ${email}</p>
        <p><strong>Valid for:</strong> 24 hours</p>
        
        <div class="magic-link-container">
          <label>Magic Link (Copy and send via email):</label>
          <div class="magic-link-box">
            <input type="text" id="magic-link-input" value="${magicLink}" readonly>
            <button type="button" class="btn btn-secondary" onclick="copyMagicLink()">📋 Copy</button>
          </div>
        </div>
        
        <div class="email-template">
          <h4>📝 Email Template:</h4>
          <div class="email-preview">
            <strong>Subject:</strong> Welcome to GrdlHub - Access Invitation<br><br>
            <strong>Message:</strong><br>
            Hi there!<br><br>
            You've been invited to join GrdlHub. Click the link below to get started:<br><br>
            <a href="${magicLink}">${magicLink}</a><br><br>
            This link is valid for 24 hours. No password required - just click and you're in!<br><br>
            Best regards,<br>
            GrdlHub Team
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="hideModal()">Close</button>
        <button type="button" class="btn btn-primary" onclick="copyEmailTemplate()">📧 Copy Email Template</button>
      </div>
    </div>
  `
  
  showModal(modalContent)
  
  // Auto-select the magic link for easy copying
  setTimeout(() => {
    const input = document.getElementById('magic-link-input')
    if (input) {
      input.select()
    }
  }, 100)
}

// Global functions for magic link modal
window.copyMagicLink = function() {
  const input = document.getElementById('magic-link-input')
  if (input) {
    input.select()
    document.execCommand('copy')
    showNotification('Magic link copied to clipboard!', 'success')
  }
}

window.copyEmailTemplate = function() {
  const email = document.querySelector('.invitation-details p strong').nextSibling.textContent.trim()
  const magicLink = document.getElementById('magic-link-input').value
  
  const emailTemplate = `Subject: Welcome to GrdlHub - Access Invitation

Hi there!

You've been invited to join GrdlHub. Click the link below to get started:

${magicLink}

This link is valid for 24 hours. No password required - just click and you're in!

Best regards,
GrdlHub Team`
  
  // Copy to clipboard
  navigator.clipboard.writeText(emailTemplate).then(() => {
    showNotification('Email template copied to clipboard!', 'success')
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = emailTemplate
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    showNotification('Email template copied to clipboard!', 'success')
  })
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

// Global functions for sending invites
window.sendInviteToEmail = async function(emailId, email) {
  if (confirm(`Send invitation to ${email}?`)) {
    showLoading('Preparing invitation...')
    
    try {
      const result = await sendEmailInvitation(email)
      if (result.success) {
        showNotification(`Invitation prepared for ${email}`, 'success')
      }
    } catch (error) {
      showNotification(`Error sending invitation: ${error.message}`, 'error')
    } finally {
      hideLoading()
    }
  }
}

window.resendInviteToEmail = async function(emailId, email) {
  if (confirm(`Resend invitation to ${email}?`)) {
    showLoading('Preparing new invitation...')
    
    try {
      const result = await sendEmailInvitation(email)
      if (result.success) {
        showNotification(`New invitation prepared for ${email}`, 'success')
      }
    } catch (error) {
      showNotification(`Error resending invitation: ${error.message}`, 'error')
    } finally {
      hideLoading()
    }
  }
}

window.showAddEmailModal = showAddEmailModal
