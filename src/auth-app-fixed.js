// Standalone Auth Page - Full Firebase functionality with error handling
console.log('🚀 Auth app module loaded')

// Global variables
let authModule = null
let isFirebaseReady = false

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthPage)
} else {
  initAuthPage()
}

async function initAuthPage() {
  console.log('🎨 Initializing auth page...')
  
  const container = document.getElementById('auth-container')
  if (!container) {
    console.error('❌ auth-container element not found!')
    return
  }
  
  console.log('✅ auth-container found')
  
  // Show loading state first
  showLoadingState(container)
  
  try {
    // Load Firebase auth module
    console.log('📦 Loading Firebase auth module...')
    authModule = await import('./auth-standalone.js')
    console.log('✅ Auth module loaded')
    
    // Initialize Firebase
    console.log('🔧 Initializing Firebase...')
    await authModule.initializeStandaloneAuth()
    console.log('✅ Firebase initialized')
    isFirebaseReady = true
    
    // Check if user is already authenticated
    const currentUser = authModule.getCurrentAuthUser()
    if (currentUser) {
      console.log('✅ User already authenticated, redirecting:', currentUser.email)
      showRedirectState(container)
      setTimeout(() => window.location.href = '/', 1500)
      return
    }
    
    // Check for magic link in URL
    if (authModule.isFirebaseSignInLink()) {
      console.log('🔗 Magic link detected, processing...')
      await handleMagicLink(container)
      return
    }
    
    // Show normal auth interface
    console.log('🎨 Setting up auth interface...')
    setupAuthInterface(container)
    
  } catch (error) {
    console.error('❌ Auth initialization error:', error)
    showErrorState(container, `Initialization failed: ${error.message}`)
  }
}

function showLoadingState(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      <div style="color: #666;">Loading authentication system...</div>
    </div>
  `
}

function showRedirectState(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome!</p>
      <div style="color: #4caf50;">✅ Already signed in. Redirecting to workspace...</div>
    </div>
  `
}

function showErrorState(container, message) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828;">
        <strong>Error:</strong> ${message}<br>
        <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `
}

async function handleMagicLink(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Processing your invitation...</p>
      <div style="color: #666;">Validating secure access link...</div>
    </div>
  `
  
  try {
    // Get email from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const email = urlParams.get('email') || window.localStorage.getItem('emailForSignIn')
    
    if (!email) {
      throw new Error('Email address required to complete sign-in')
    }
    
    // Sign in with magic link
    const result = await authModule.signInWithFirebaseLink(email, window.location.href)
    
    if (result.success) {
      container.innerHTML = `
        <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
          <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome!</p>
          <div style="color: #4caf50;">✅ Sign-in successful! Redirecting to workspace...</div>
        </div>
      `
      setTimeout(() => window.location.href = '/', 1500)
    } else {
      throw new Error(result.error || 'Failed to complete sign-in')
    }
    
  } catch (error) {
    console.error('❌ Magic link error:', error)
    container.innerHTML = `
      <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
        <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Access Error</p>
        <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828;">
          <strong>Sign-in Failed:</strong> ${error.message}<br>
          <button onclick="location.href='/auth.html'" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Try Again
          </button>
        </div>
      </div>
    `
  }
}

function setupAuthInterface(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Access Required</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem;">Please enter your email address to request access to GrdlHub.</p>
      
      <form id="auth-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label for="email-input" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Email Address</label>
          <input 
            type="email" 
            id="email-input" 
            placeholder="your.email@example.com" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.3s ease; box-sizing: border-box;"
            required
          >
        </div>
        
        <button 
          type="submit" 
          id="submit-btn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease;"
        >
          Check Access
        </button>
      </form>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #757575; font-size: 0.875rem;">🔒 This application requires invitation-only access.</p>
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">If you need access, please contact an administrator.</p>
      </div>
    </div>
  `
  
  // Bind form event
  const form = document.getElementById('auth-form')
  if (form) {
    form.addEventListener('submit', handleFormSubmit)
    console.log('✅ Form event bound')
  }
}

async function handleFormSubmit(e) {
  e.preventDefault()
  console.log('📧 Form submitted')
  
  if (!isFirebaseReady || !authModule) {
    alert('Authentication system is not ready. Please reload the page.')
    return
  }
  
  const emailInput = document.getElementById('email-input')
  const submitBtn = document.getElementById('submit-btn')
  const email = emailInput.value.trim()
  
  if (!email) {
    showFieldError(emailInput, 'Email address is required')
    return
  }
  
  if (!isValidEmail(email)) {
    showFieldError(emailInput, 'Please enter a valid email address')
    return
  }
  
  // Set loading state
  submitBtn.disabled = true
  submitBtn.textContent = 'Checking...'
  
  try {
    // Check if email is pre-approved
    const isApproved = await authModule.isEmailPreApproved(email)
    
    if (isApproved) {
      // Send magic link
      const result = await authModule.sendFirebaseSignInLink(email)
      
      if (result.success) {
        showEmailSent(email)
      } else {
        throw new Error(result.error || 'Failed to send invitation link')
      }
    } else {
      showNotApproved(email)
    }
    
  } catch (error) {
    console.error('❌ Access check error:', error)
    showFieldError(emailInput, 'Unable to verify access. Please try again.')
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Check Access'
  }
}

function showEmailSent(email) {
  const container = document.getElementById('auth-container')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Invitation Sent</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">📧</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Check Your Email</h2>
      <p style="margin: 0 0 8px 0; color: #757575;">We've sent a secure access link to:</p>
      <p style="margin: 0 0 24px 0; color: #1976d2; font-weight: 600;">${email}</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #e3f2fd; border-radius: 8px; text-align: left;">
        <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 1rem;">Next Steps:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #424242; font-size: 0.875rem;">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the secure access link</li>
          <li>You'll be automatically signed in</li>
        </ol>
      </div>
      
      <button onclick="location.reload()" style="padding: 8px 16px; background: #e0e0e0; color: #424242; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
        Send Another Link
      </button>
      
      <div style="margin-top: 16px; color: #757575; font-size: 0.875rem;">
        🔒 The link will expire in 1 hour for security.
      </div>
    </div>
  `
}

function showNotApproved(email) {
  const container = document.getElementById('auth-container')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Access Restricted</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">🚫</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Invitation Required</h2>
      <p style="margin: 0 0 24px 0; color: #757575;">The email address <strong>${email}</strong> is not currently authorized for access.</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #fff3e0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #f57c00; font-size: 1rem;">Request Access:</h3>
        <p style="margin: 0; color: #424242; font-size: 0.875rem;">To request access to GrdlHub, please contact an administrator with your email address. Once approved, you'll be able to access the platform.</p>
      </div>
      
      <button onclick="location.reload()" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Try Different Email
      </button>
    </div>
  `
}

function showFieldError(field, message) {
  // Remove existing error
  const existingError = field.parentNode.querySelector('.field-error')
  if (existingError) existingError.remove()
  
  // Add error styling
  field.style.borderColor = '#f44336'
  
  // Add error message
  const errorDiv = document.createElement('div')
  errorDiv.className = 'field-error'
  errorDiv.style.cssText = 'color: #f44336; font-size: 0.875rem; margin-top: 4px;'
  errorDiv.textContent = message
  field.parentNode.appendChild(errorDiv)
  
  // Focus the field
  field.focus()
  
  // Remove error on input
  field.addEventListener('input', () => {
    field.style.borderColor = '#e0e0e0'
    const error = field.parentNode.querySelector('.field-error')
    if (error) error.remove()
  }, { once: true })
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}