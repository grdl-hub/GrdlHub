// Clean Authentication Portal - Simple Email-Based Access
console.log('🚀 Authentication Portal Loaded')

// Global variables
let authModule = null
let isReady = false

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthPortal)
} else {
  initAuthPortal()
}

async function initAuthPortal() {
  console.log('🎨 Initializing authentication portal...')
  
  const container = document.getElementById('auth-container')
  if (!container) {
    console.error('❌ auth-container not found!')
    return
  }
  
  try {
    // Load Firebase auth module
    authModule = await import('./auth-standalone.js')
    await authModule.initializeStandaloneAuth()
    isReady = true
    
    // Check if user is already signed in
    const currentUser = authModule.getCurrentAuthUser()
    if (currentUser) {
      console.log('✅ User already signed in:', currentUser.email)
      showSignedInState(container)
      return
    }
    
    // Check if this is a magic link
    if (authModule.isFirebaseSignInLink()) {
      console.log('🔗 Processing magic link...')
      await processMagicLink(container)
      return
    }
    
    // Show email input form
    showEmailForm(container)
    
  } catch (error) {
    console.error('❌ Initialization error:', error)
    showErrorState(container, 'Failed to initialize authentication system.')
  }
}

function showEmailForm(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Sign In</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem;">Enter your email address to access GrdlHub</p>
      
      <form id="email-form" style="text-align: left;">
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
          Sign In
        </button>
      </form>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">🔒 Secure email-based authentication</p>
      </div>
    </div>
  `
  
  // Bind form submission
  const form = document.getElementById('email-form')
  if (form) {
    form.addEventListener('submit', handleEmailSubmit)
    console.log('✅ Email form ready')
  }
}

async function handleEmailSubmit(e) {
  e.preventDefault()
  console.log('📧 Email submitted')
  
  if (!isReady || !authModule) {
    showErrorMessage('Authentication system not ready. Please refresh the page.')
    return
  }
  
  const emailInput = document.getElementById('email-input')
  const submitBtn = document.getElementById('submit-btn')
  const email = emailInput.value.trim().toLowerCase()
  
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
    console.log('🔍 Checking if email exists in users collection:', email)
    
    // Check if email exists in users collection
    const emailExists = await authModule.isEmailPreApproved(email)
    console.log('✅ Email check result:', emailExists)
    
    if (emailExists) {
      // Email exists - send magic link
      console.log('📧 Sending sign-in link to:', email)
      const result = await authModule.sendFirebaseSignInLink(email)
      
      if (result.success) {
        showEmailSent(email)
      } else {
        throw new Error(result.error || 'Failed to send sign-in link')
      }
    } else {
      // Email does not exist
      showEmailNotRecognized(email)
    }
    
  } catch (error) {
    console.error('❌ Email submission error:', error)
    showFieldError(emailInput, 'Unable to process request. Please try again.')
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Sign In'
  }
}

function showEmailSent(email) {
  const container = document.getElementById('auth-container')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Check Your Email</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">📧</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Sign-in Link Sent</h2>
      <p style="margin: 0 0 8px 0; color: #757575;">We've sent a secure sign-in link to:</p>
      <p style="margin: 0 0 24px 0; color: #1976d2; font-weight: 600;">${email}</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #e3f2fd; border-radius: 8px; text-align: left;">
        <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 1rem;">Next Steps:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #424242; font-size: 0.875rem;">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the sign-in link</li>
          <li>You'll be automatically signed in</li>
        </ol>
      </div>
      
      <button onclick="location.reload()" style="padding: 8px 16px; background: #e0e0e0; color: #424242; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
        Try Different Email
      </button>
    </div>
  `
}

function showEmailNotRecognized(email) {
  const container = document.getElementById('auth-container')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Access Restricted</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">🚫</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Email Not Recognized</h2>
      <p style="margin: 0 0 24px 0; color: #757575;">The email address <strong>${email}</strong> is not recognized.</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #fff3e0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #f57c00; font-size: 1rem;">Need Access?</h3>
        <p style="margin: 0; color: #424242; font-size: 0.875rem;"><strong>Please contact the administrator</strong> to request access to GrdlHub.</p>
      </div>
      
      <button onclick="location.reload()" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Try Different Email
      </button>
    </div>
  `
}

async function processMagicLink(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Signing you in...</p>
      <div style="color: #666;">Processing secure link...</div>
    </div>
  `
  
  try {
    // Get email from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const email = urlParams.get('email') || window.localStorage.getItem('emailForSignIn')
    
    console.log('🔗 Processing magic link for email:', email)
    
    if (!email) {
      throw new Error('Email address required to complete sign-in')
    }
    
    // Sign in with magic link
    const result = await authModule.signInWithFirebaseLink(email, window.location.href)
    
    if (result.success) {
      console.log('✅ Magic link sign-in successful')
      showSignInSuccess(container)
    } else {
      throw new Error(result.error || 'Failed to complete sign-in')
    }
    
  } catch (error) {
    console.error('❌ Magic link error:', error)
    showMagicLinkError(container, error.message)
  }
}

function showSignInSuccess(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome!</p>
      <div style="color: #4caf50; margin-bottom: 16px;">✅ Sign-in successful!</div>
      <div style="color: #666;">Redirecting to GrdlHub...</div>
    </div>
  `
  
  // Redirect to main app after short delay
  setTimeout(() => {
    window.location.href = '/'
  }, 2000)
}

function showSignedInState(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome back!</p>
      <div style="color: #4caf50; margin-bottom: 16px;">✅ Already signed in</div>
      <div style="color: #666;">Redirecting to GrdlHub...</div>
    </div>
  `
  
  // Redirect to main app after short delay
  setTimeout(() => {
    window.location.href = '/'
  }, 1500)
}

function showMagicLinkError(container, errorMessage) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Sign-in Error</p>
      <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828; margin-bottom: 16px;">
        <strong>Error:</strong> ${errorMessage}
      </div>
      <button onclick="location.href='/auth.html'" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Try Again
      </button>
    </div>
  `
}

function showErrorState(container, message) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">System Error</p>
      <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828;">
        <strong>Error:</strong> ${message}<br>
        <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
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

function showErrorMessage(message) {
  alert(message) // Simple fallback for errors
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}