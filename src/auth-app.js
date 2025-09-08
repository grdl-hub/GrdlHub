// Standalone Auth Page - Completely isolated from main app
// This runs independently and only loads the main app after successful auth

import { 
  initializeStandaloneAuth,
  getCurrentAuthUser,
  checkUserInviteStatus,
  generateSecureInviteToken,
  validateInviteToken,
  createAccountFromInvite,
  signInUser,
  SecurityUtils
} from './auth-standalone.js'

class StandaloneAuthApp {
  constructor() {
    this.currentStep = 'check-access'
    this.inviteData = null
    this.init()
  }

  async init() {
    // Security checks
    if (!SecurityUtils.isSecureContext()) {
      this.showError('This application requires a secure connection (HTTPS)')
      return
    }

    // Initialize auth
    try {
      await initializeStandaloneAuth()
      const user = getCurrentAuthUser()
      
      if (user && user.emailVerified) {
        // User is already authenticated, load main app
        this.loadMainApp()
        return
      }
      
      // Show auth interface
      this.setupAuthInterface()
      
      // Check for invite token in URL
      this.checkInviteToken()
      
    } catch (error) {
      console.error('Auth initialization error:', error)
      this.showError('Failed to initialize authentication system')
    }
  }

  setupAuthInterface() {
    const authContainer = document.getElementById('auth-container')
    authContainer.innerHTML = `
      <div class="auth-card standalone">
        <div class="auth-header">
          <h1>GrdlHub</h1>
          <p>Secure Authentication Portal</p>
          <div class="security-notice">
            🔒 Invite-Only Access
          </div>
        </div>

        <!-- Step 1: Check Access -->
        <div id="step-check-access" class="auth-step active">
          <h2>Request Access</h2>
          <p>Enter your email address to verify your invitation status</p>
          
          <form id="check-access-form">
            <div class="form-group">
              <label for="check-email">Email Address</label>
              <input type="email" id="check-email" required autocomplete="email" placeholder="your.email@example.com">
            </div>
            <button type="submit" class="btn btn-primary">Verify Invitation</button>
          </form>
          
          <div class="auth-info">
            <p><strong>Access Requirements:</strong></p>
            <ul>
              <li>Your email must be pre-authorized by an administrator</li>
              <li>Invitation links are valid for 24 hours</li>
              <li>All connections are secured with end-to-end encryption</li>
              <li>Two-factor authentication may be required</li>
            </ul>
            <em>This is a secure, invite-only system designed for authorized users only.</em>
          </div>
        </div>

        <!-- Step 2: Sign In -->
        <div id="step-sign-in" class="auth-step">
          <h2>Welcome Back</h2>
          <p>Please enter your credentials to continue</p>
          
          <form id="sign-in-form">
            <div class="form-group">
              <label for="signin-email">Email Address</label>
              <input type="email" id="signin-email" required readonly>
            </div>
            <div class="form-group">
              <label for="signin-password">Password</label>
              <input type="password" id="signin-password" required autocomplete="current-password" placeholder="Enter your password">
            </div>
            <button type="submit" class="btn btn-primary">Sign In Securely</button>
          </form>
          
          <button id="back-to-check" class="btn btn-link">← Use different email address</button>
        </div>

        <!-- Step 3: Create Account -->
        <div id="step-create-account" class="auth-step">
          <h2>Create Your Account</h2>
          <p>Complete your profile to activate your secure access</p>
          
          <form id="create-account-form">
            <div class="form-group">
              <label for="create-email">Email Address</label>
              <input type="email" id="create-email" required readonly>
            </div>
            <div class="form-group">
              <label for="create-name">Full Name</label>
              <input type="text" id="create-name" required autocomplete="name" placeholder="Enter your full name">
            </div>
            <div class="form-group">
              <label for="create-password">Secure Password</label>
              <input type="password" id="create-password" required autocomplete="new-password" minlength="8" placeholder="Create a strong password">
              <small>Minimum 8 characters with mixed case, numbers, and symbols</small>
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm Password</label>
              <input type="password" id="confirm-password" required autocomplete="new-password" placeholder="Confirm your password">
            </div>
            <button type="submit" class="btn btn-primary">Create Secure Account</button>
          </form>
          
          <button id="back-to-check-2" class="btn btn-link">← Use different email address</button>
        </div>

        <!-- Loading state -->
        <div id="auth-loading" class="auth-loading hidden">
          <div class="spinner"></div>
          <p>Processing your request securely...</p>
        </div>

        <!-- Results -->
        <div id="auth-result" class="auth-result hidden"></div>
      </div>
    `

    this.bindAuthEvents()
  }

  bindAuthEvents() {
    // Check access form
    document.getElementById('check-access-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleCheckAccess()
    })

    // Sign in form
    document.getElementById('sign-in-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleSignIn()
    })

    // Create account form
    document.getElementById('create-account-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleCreateAccount()
    })

    // Back buttons
    document.getElementById('back-to-check').addEventListener('click', () => {
      this.showStep('check-access')
    })
    document.getElementById('back-to-check-2').addEventListener('click', () => {
      this.showStep('check-access')
    })
  }

  async handleCheckAccess() {
    const email = document.getElementById('check-email').value
    this.showLoading(true)

    try {
      const result = await checkUserInviteStatus(email)
      
      if (!result.invited) {
        this.showResult('error', result.message)
        return
      }

      if (result.hasAccount) {
        // Show sign in form
        document.getElementById('signin-email').value = email
        this.showStep('sign-in')
      } else {
        // Show create account form
        this.inviteData = result
        document.getElementById('create-email').value = email
        this.showStep('create-account')
      }
      
    } catch (error) {
      this.showResult('error', 'Error checking access. Please try again.')
    } finally {
      this.showLoading(false)
    }
  }

  async handleSignIn() {
    const email = document.getElementById('signin-email').value
    const password = document.getElementById('signin-password').value
    this.showLoading(true)

    try {
      const result = await signInUser(email, password)
      
      if (result.success) {
        this.showResult('success', 'Sign in successful! Loading application...')
        setTimeout(() => this.loadMainApp(), 1500)
      }
      
    } catch (error) {
      let errorMessage = 'Sign in failed. Please check your credentials.'
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.'
      }
      this.showResult('error', errorMessage)
    } finally {
      this.showLoading(false)
    }
  }

  async handleCreateAccount() {
    const email = document.getElementById('create-email').value
    const name = document.getElementById('create-name').value
    const password = document.getElementById('create-password').value
    const confirmPassword = document.getElementById('confirm-password').value

    if (password !== confirmPassword) {
      this.showResult('error', 'Passwords do not match')
      return
    }

    if (password.length < 8) {
      this.showResult('error', 'Password must be at least 8 characters')
      return
    }

    this.showLoading(true)

    try {
      // Generate secure token for account creation
      const token = generateSecureInviteToken(this.inviteData.userId, email)
      
      const result = await createAccountFromInvite(token, password, name)
      
      if (result.success) {
        this.showResult('success', 'Account created! Please check your email for verification. Loading application...')
        setTimeout(() => this.loadMainApp(), 2000)
      }
      
    } catch (error) {
      let errorMessage = 'Account creation failed. Please try again.'
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.'
      }
      this.showResult('error', errorMessage)
    } finally {
      this.showLoading(false)
    }
  }

  checkInviteToken() {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('invite')
    
    if (token) {
      const validation = validateInviteToken(token)
      if (validation.valid) {
        // Auto-fill email and show create account form
        document.getElementById('check-email').value = validation.data.email
        this.inviteData = { userId: validation.data.userId }
        document.getElementById('create-email').value = validation.data.email
        this.showStep('create-account')
      } else {
        this.showResult('error', `Invalid or expired invite link: ${validation.reason}`)
      }
    }
  }

  showStep(stepName) {
    document.querySelectorAll('.auth-step').forEach(step => {
      step.classList.remove('active')
    })
    document.getElementById(`step-${stepName}`).classList.add('active')
    this.hideResult()
  }

  showLoading(show) {
    const loading = document.getElementById('auth-loading')
    if (show) {
      loading.classList.remove('hidden')
    } else {
      loading.classList.add('hidden')
    }
  }

  showResult(type, message) {
    const result = document.getElementById('auth-result')
    result.className = `auth-result ${type}`
    result.textContent = message
    result.classList.remove('hidden')
  }

  hideResult() {
    document.getElementById('auth-result').classList.add('hidden')
  }

  showError(message) {
    document.body.innerHTML = `
      <div class="error-container">
        <div class="error-card">
          <h1>Security Error</h1>
          <p>${message}</p>
          <p>Please ensure you're accessing this page from a secure connection and try again.</p>
          <button onclick="location.reload()" class="btn btn-primary">Reload Application</button>
        </div>
      </div>
    `
  }

  async loadMainApp() {
    try {
      // Clear auth form data for security
      SecurityUtils.clearAuthData()
      
      // Show loading with improved messaging
      document.body.innerHTML = `
        <div class="app-loading">
          <div class="spinner large"></div>
          <h2>Welcome to GrdlHub</h2>
          <p>Loading your secure workspace...</p>
          <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
            Initializing encrypted connection and user permissions
          </p>
        </div>
      `
      
      // Dynamically import and load the main app
      const { default: initMainApp } = await import('./main-app.js')
      await initMainApp()
      
    } catch (error) {
      console.error('Error loading main app:', error)
      this.showError('Failed to load main application. Please refresh and try again.')
    }
  }
}

// Initialize standalone auth when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new StandaloneAuthApp())
} else {
  new StandaloneAuthApp()
}
