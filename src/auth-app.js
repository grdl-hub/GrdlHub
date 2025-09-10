// Standalone Auth Page - Completely isolated from main app
// This runs independently and only loads the main app after successful auth

console.log('🚀 Auth app module loaded')

// First, let's test basic functionality
const container = document.getElementById('auth-container')
if (!container) {
  console.error('❌ auth-container element not found!')
} else {
  console.log('✅ auth-container found')
  
  // Test basic HTML insertion
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Access Required</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem;">Please enter your email address to request access to GrdlHub.</p>
      
      <form id="simple-auth-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label for="email-input" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Email Address</label>
          <input 
            type="email" 
            id="email-input" 
            placeholder="your.email@example.com" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.3s ease;"
            required
          >
        </div>
        
        <button 
          type="submit" 
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease;"
        >
          Check Access
        </button>
      </form>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #757575; font-size: 0.875rem;">� This application requires invitation-only access.</p>
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">If you need access, please contact an administrator.</p>
      </div>
    </div>
  `
  
  console.log('✅ Basic HTML inserted')
  
  // Bind form event
  const form = document.getElementById('simple-auth-form')
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const email = document.getElementById('email-input').value.trim()
      console.log('📧 Form submitted with email:', email)
      
      if (email) {
        alert(`Testing: You entered ${email}. In the real app, this would check if the email is pre-approved and send a magic link.`)
      } else {
        alert('Please enter an email address.')
      }
    })
    console.log('✅ Form event bound')
  } else {
    console.error('❌ Form not found')
  }
}

// Now try to load Firebase gradually
console.log('� Attempting to load Firebase modules...')

try {
  import('./auth-standalone.js')
    .then((authModule) => {
      console.log('✅ Auth standalone module loaded:', Object.keys(authModule))
      
      // Try to initialize Firebase
      return authModule.initializeStandaloneAuth()
    })
    .then(() => {
      console.log('✅ Firebase initialized successfully')
      console.log('🎉 Ready to implement full auth functionality')
    })
    .catch((error) => {
      console.error('❌ Firebase initialization failed:', error)
      
      // Show error in UI
      const container = document.getElementById('auth-container')
      if (container) {
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = 'margin-top: 16px; padding: 12px; background: #ffebee; border: 1px solid #f44336; border-radius: 8px; color: #c62828; font-size: 0.875rem;'
        errorDiv.innerHTML = `<strong>Firebase Error:</strong> ${error.message}`
        container.appendChild(errorDiv)
      }
    })
} catch (error) {
  console.error('❌ Failed to import auth module:', error)
}

  async checkMagicLink() {
    // Check if the current URL is a Firebase sign-in link
    if (!isFirebaseSignInLink()) {
      return { handled: false } // No Firebase sign-in link
    }
    
    // Show loading state
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card standalone">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Validating your invitation...</p>
        </div>
        <div class="auth-loading">
          <div class="spinner"></div>
          <p>Processing your secure invitation link...</p>
        </div>
      </div>
    `
    
    try {
      // Get email from URL parameter or localStorage
      const urlParams = new URLSearchParams(window.location.search)
      const email = urlParams.get('email') || window.localStorage.getItem('emailForSignIn')
      
      if (!email) {
        this.showMagicLinkError('Email address is required to complete sign-in. Please contact support.')
        return { handled: true }
      }
      
      // Sign in with the Firebase email link
      const result = await signInWithFirebaseLink(email, window.location.href)
      
      if (result.success) {
        console.log('🎉 Sign-in successful! Redirecting to main app...')
        
        // Show success and redirect immediately
        document.getElementById('auth-container').innerHTML = `
          <div class="auth-card standalone">
            <div class="auth-header">
              <h1>GrdlHub</h1>
              <p>Welcome!</p>
            </div>
            <div class="auth-success">
              <div class="success-icon">✅</div>
              <p>Sign-in successful! Redirecting to your workspace...</p>
              <div class="auth-loading">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        `
        
        // Redirect to main app after a short delay
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
        
      } else {
        this.showMagicLinkError(result.error || 'Failed to complete sign-in')
      }
      
      return { handled: true }
      
    } catch (error) {
      console.error('Firebase sign-in link error:', error)
      this.showMagicLinkError('Error processing invitation link. Please try again or contact support.')
      return { handled: true }
    }
  }

  showMagicLinkSuccess(message) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card standalone">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Access Granted</p>
        </div>
        <div class="auth-success">
          <div class="success-icon">✅</div>
          <p>${message}</p>
          <div class="auth-loading">
            <div class="spinner"></div>
            <p>Loading your workspace...</p>
          </div>
        </div>
      </div>
    `
  }

  showMagicLinkError(message) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card standalone">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Access Error</p>
        </div>
        <div class="auth-error">
          <div class="error-icon">❌</div>
          <p>${message}</p>
          <button onclick="location.href='/auth.html'" class="btn btn-primary">Try Again</button>
        </div>
      </div>
    `
  }

  setupAuthInterface() {
    console.log('🔧 Setting up auth interface...')
    
    const container = document.getElementById('auth-container')
    if (!container) {
      console.error('❌ auth-container element not found!')
      return
    }
    
    console.log('✅ auth-container found, inserting HTML...')
    
    container.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Secure Access Portal</p>
        </div>
        
        <div class="auth-step" id="step-check-access">
          <h2>Access Required</h2>
          <p>Please enter your email address to request access to GrdlHub.</p>
          
          <form id="check-access-form" class="auth-form">
            <div class="form-group">
              <label for="access-email">Email Address</label>
              <input type="email" id="access-email" name="email" required 
                     placeholder="your.email@example.com" autocomplete="email">
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">
              <span class="btn-text">Check Access</span>
              <span class="btn-loading" style="display: none;">
                <div class="spinner"></div>
                Checking...
              </span>
            </button>
          </form>
          
          <div class="auth-info">
            <p>🔒 This application requires invitation-only access.</p>
            <p>If you need access, please contact an administrator.</p>
          </div>
        </div>
      </div>
    `
    
    console.log('✅ HTML inserted, binding events...')
    this.bindAuthEvents()
    console.log('✅ Auth interface setup complete!')
  }

  bindAuthEvents() {
    // Check access form
    const checkAccessForm = document.getElementById('check-access-form')
    if (checkAccessForm) {
      checkAccessForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleCheckAccess()
      })
    }
  }

  async handleCheckAccess() {
    const email = document.getElementById('access-email').value.trim()
    
    if (!email) {
      this.showFieldError('access-email', 'Email address is required')
      return
    }

    if (!SecurityUtils.isValidEmail(email)) {
      this.showFieldError('access-email', 'Please enter a valid email address')
      return
    }

    this.setLoading('check-access-form', true)

    try {
      // Check if email is pre-approved
      const isApproved = await isEmailPreApproved(email)
      
      if (isApproved) {
        // Email is pre-approved, send the Firebase sign-in link
        const result = await sendFirebaseSignInLink(email)
        
        if (result.success) {
          this.showInviteSent(email)
        } else {
          this.showError(result.error || 'Failed to send invitation link')
        }
      } else {
        this.showNotInvited(email)
      }
      
    } catch (error) {
      console.error('Access check error:', error)
      this.showError('Unable to verify access. Please try again.')
    }
    
    this.setLoading('check-access-form', false)
  }

  showInviteSent(email) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Invitation Sent</p>
        </div>
        
        <div class="auth-success">
          <div class="success-icon">📧</div>
          <h2>Check Your Email</h2>
          <p>We've sent a secure access link to:</p>
          <p class="email-highlight">${email}</p>
          
          <div class="auth-instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the secure access link</li>
              <li>You'll be automatically signed in</li>
            </ol>
          </div>
          
          <div class="auth-actions">
            <button onclick="location.reload()" class="btn btn-secondary">Send Another Link</button>
          </div>
          
          <div class="auth-info">
            <p>🔒 The link will expire in 1 hour for security.</p>
            <p>If you don't receive the email, please contact support.</p>
          </div>
        </div>
      </div>
    `
  }

  showNotInvited(email) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Access Restricted</p>
        </div>
        
        <div class="auth-error">
          <div class="error-icon">🚫</div>
          <h2>Invitation Required</h2>
          <p>The email address <strong>${email}</strong> is not currently authorized for access.</p>
          
          <div class="auth-info">
            <h3>Request Access:</h3>
            <p>To request access to GrdlHub, please contact an administrator with your email address.</p>
            <p>Once approved, you'll be able to access the platform using this email.</p>
          </div>
          
          <div class="auth-actions">
            <button onclick="location.reload()" class="btn btn-primary">Try Different Email</button>
          </div>
        </div>
      </div>
    `
  }

  showError(message) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Error</p>
        </div>
        <div class="auth-error">
          <div class="error-icon">⚠️</div>
          <h2>Something Went Wrong</h2>
          <p>${message}</p>
          <p>Please ensure you're accessing this page from a secure connection and try again.</p>
          <button onclick="location.reload()" class="btn btn-primary">Reload Application</button>
        </div>
      </div>
    `
  }

  setLoading(formId, isLoading) {
    const form = document.getElementById(formId)
    if (!form) return

    const button = form.querySelector('button[type="submit"]')
    const btnText = button.querySelector('.btn-text')
    const btnLoading = button.querySelector('.btn-loading')

    if (isLoading) {
      button.disabled = true
      btnText.style.display = 'none'
      btnLoading.style.display = 'flex'
    } else {
      button.disabled = false
      btnText.style.display = 'block'
      btnLoading.style.display = 'none'
    }
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId)
    if (!field) return

    // Remove existing error
    const existingError = field.parentNode.querySelector('.field-error')
    if (existingError) {
      existingError.remove()
    }

    // Add error styling
    field.classList.add('error')

    // Add error message
    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message
    field.parentNode.appendChild(errorDiv)

    // Focus the field
    field.focus()

    // Remove error on input
    field.addEventListener('input', () => {
      field.classList.remove('error')
      const error = field.parentNode.querySelector('.field-error')
      if (error) error.remove()
    }, { once: true })
  }
}

// Initialize the auth app
new StandaloneAuthApp()
