// Standalone Auth Page - Completely isolated from main app
// This runs independently and only loads the main app after successful auth

import { 
  initializeStandaloneAuth,
  getCurrentAuthUser,
  isEmailPreApproved,
  registerWithPreApprovedEmail,
  signInUser,
  SecurityUtils
} from './auth-standalone.js'
import { validateMagicLink, sendEmailInvitation } from './pages/preApprovedEmails.js'

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
      
      // Check for magic link in URL first
      const magicLinkResult = await this.checkMagicLink()
      if (magicLinkResult.handled) {
        return // Magic link was processed, don't show normal auth interface
      }
      
      // Show auth interface
      this.setupAuthInterface()
      
    } catch (error) {
      console.error('Auth initialization error:', error)
      this.showError('Failed to initialize authentication system')
    }
  }

  async checkMagicLink() {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const email = urlParams.get('email')
    
    if (!token || !email) {
      return { handled: false } // No magic link parameters
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
      // Validate the magic link
      const validation = await validateMagicLink(token, email)
      
      if (!validation.valid) {
        this.showMagicLinkError(validation.reason || 'Invalid invitation link')
        return { handled: true }
      }
      
      // Magic link is valid, proceed with passwordless registration/login
      await this.processMagicLinkAuth(email, validation.emailData, validation.documentId)
      return { handled: true }
      
    } catch (error) {
      console.error('Magic link validation error:', error)
      this.showMagicLinkError('Error processing invitation link. Please try again.')
      return { handled: true }
    }
  }

  async processMagicLinkAuth(email, emailData, documentId) {
    try {
      // Check if user already exists
      const existingUser = getCurrentAuthUser()
      
      if (existingUser && existingUser.email === email) {
        // User is already signed in with this email
        this.showMagicLinkSuccess('Welcome back! Loading your workspace...')
        setTimeout(() => this.loadMainApp(), 1500)
        return
      }
      
      // Create account without password using the magic link
      const result = await this.createAccountFromMagicLink(email, emailData)
      
      if (result.success) {
        // Mark the email as registered and clear the magic link
        await this.updateEmailAfterRegistration(documentId)
        
        this.showMagicLinkSuccess('Account created successfully! Welcome to GrdlHub!')
        setTimeout(() => this.loadMainApp(), 2000)
      } else {
        this.showMagicLinkError(result.error || 'Failed to create account')
      }
      
    } catch (error) {
      console.error('Magic link auth processing error:', error)
      this.showMagicLinkError('Error creating your account. Please contact support.')
    }
  }

  async createAccountFromMagicLink(email, emailData) {
    try {
      // Generate a secure random password (user won't need to know it)
      const randomPassword = this.generateSecurePassword()
      
      // Use the existing registration system but with auto-generated password
      const result = await registerWithPreApprovedEmail(email, randomPassword, emailData.fullName || 'User')
      
      return result
      
    } catch (error) {
      console.error('Magic link account creation error:', error)
      return { success: false, error: error.message }
    }
  }

  async updateEmailAfterRegistration(documentId) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('./auth-standalone.js')
      
      const emailRef = doc(db, 'preApprovedEmails', documentId)
      await updateDoc(emailRef, {
        status: 'registered',
        registeredAt: new Date(),
        magicToken: null, // Clear the token
        magicLinkExpiresAt: null
      })
      
    } catch (error) {
      console.error('Error updating email status:', error)
      // Don't throw - this is not critical for the user experience
    }
  }

  generateSecurePassword() {
    // Generate a cryptographically secure random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    
    for (let i = 0; i < 16; i++) {
      password += chars[array[i] % chars.length]
    }
    
    return password
  }

  showMagicLinkSuccess(message) {
    document.getElementById('auth-container').innerHTML = `
      <div class="auth-card standalone">
        <div class="auth-header">
          <h1>🎉 Welcome to GrdlHub</h1>
        </div>
        <div class="auth-result success">
          <div class="success-icon">✅</div>
          <h2>Access Granted!</h2>
          <p>${message}</p>
          <div class="loading-dots">
            <span></span><span></span><span></span>
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
          <p>Authentication Portal</p>
        </div>
        <div class="auth-result error">
          <div class="error-icon">❌</div>
          <h2>Invalid Invitation</h2>
          <p>${message}</p>
          <div class="form-actions">
            <button onclick="window.location.href = window.location.pathname" class="btn btn-primary">
              Request New Invitation
            </button>
          </div>
        </div>
      </div>
    `
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
            <p><strong>🔗 Easy Access with Magic Links:</strong></p>
            <ul>
              <li>✨ No passwords required - just click your invitation link</li>
              <li>📧 Check your email for invitation links</li>
              <li>🔒 Secure, one-time access links</li>
              <li>⏰ Links are valid for 24 hours</li>
            </ul>
            <p><strong>Don't have an invitation link?</strong></p>
            <ul>
              <li>Your email must be pre-authorized by an administrator</li>
              <li>Contact your administrator to be added to the system</li>
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
      // Check if email is pre-approved
      const isPreApproved = await isEmailPreApproved(email)
      
      if (!isPreApproved) {
        this.showResult('error', 'Your email is not authorized for access. Please contact an administrator to be added to the pre-approved list.')
        return
      }

      // Check the status of this pre-approved email
      const emailStatus = await this.getEmailStatus(email)
      
      if (emailStatus.status === 'registered') {
        // User already has account, show sign-in option
        this.showResult('info', 'You already have an account! Please check your email for a new magic link, or contact an administrator if you need assistance.')
        return
      }
      
      if (emailStatus.status === 'invited' && emailStatus.magicToken && emailStatus.magicLinkExpiresAt > new Date()) {
        // User has a valid invitation
        this.showResult('info', 'You have a pending invitation! Please check your email for the magic link to access your account. No password required.')
        return
      }
      
      // If we get here, the user needs a new invitation or their invitation expired
      this.showResult('info', 'Your email is pre-approved! Please contact an administrator to send you a new magic link invitation. No password is required - just click the link in your email to access the system.')
      
    } catch (error) {
      console.error('Check access error:', error)
      this.showResult('error', 'Unable to verify email authorization. Please try again.')
    } finally {
      this.showLoading(false)
    }
  }

  async getEmailStatus(email) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const { db } = await import('./auth-standalone.js')
      
      const emailsRef = collection(db, 'preApprovedEmails')
      const q = query(emailsRef, where('email', '==', email.toLowerCase()))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return { status: 'not_found' }
      }
      
      const emailData = snapshot.docs[0].data()
      return {
        status: emailData.status,
        magicToken: emailData.magicToken,
        magicLinkExpiresAt: emailData.magicLinkExpiresAt?.toDate()
      }
      
    } catch (error) {
      console.error('Error getting email status:', error)
      return { status: 'error' }
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
      // Use the new pre-approved email registration system
      const result = await registerWithPreApprovedEmail(email, password, name)
      
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
      } else if (error.message && error.message.includes('not authorized')) {
        errorMessage = error.message
      }
      this.showResult('error', errorMessage)
    } finally {
      this.showLoading(false)
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
