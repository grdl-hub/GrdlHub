// 🔧 IMMEDIATE FIX FOR YOUR PWA
// Prevent appointments page from breaking other pages

// 1. CREATE AUTH INTERFACE (DON'T MODIFY EXISTING AUTH)
// ====================================================

export class AuthService {
  constructor() {
    // Use your existing auth system internally
    this.authModule = null
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return this
    
    // Import your existing auth
    this.authModule = await import('./auth.js')
    this.initialized = true
    return this
  }

  // Safe wrapper methods - can't break other pages
  async getCurrentUser() {
    await this.initialize()
    return this.authModule.getCurrentUser()
  }

  async isAuthenticated() {
    const user = await this.getCurrentUser()
    return user !== null
  }

  async requireAuth(redirectPath = '/auth.html') {
    const isAuth = await this.isAuthenticated()
    if (!isAuth) {
      // Safe redirect - doesn't modify global auth state
      window.location.href = redirectPath
      throw new Error('Authentication required')
    }
    return true
  }

  // Appointments-specific auth check
  async canCreateAppointment() {
    try {
      await this.requireAuth()
      const user = await this.getCurrentUser()
      
      // Appointments-specific logic (doesn't affect admin)
      return user && !user.isDisabled
    } catch (error) {
      return false
    }
  }
}

// 2. APPOINTMENTS PAGE USING SAFE AUTH
// ===================================

export class AppointmentsPageManager {
  constructor() {
    // Private auth instance - can't affect other pages
    this.auth = new AuthService()
    this.container = document.querySelector('#appointments-page')
  }

  async initialize() {
    try {
      // Initialize auth safely
      await this.auth.initialize()
      
      // Check permissions without modifying global state
      const canCreate = await this.auth.canCreateAppointment()
      
      if (!canCreate) {
        this.showLoginPrompt()
        return
      }

      this.setupAppointmentsInterface()
      
    } catch (error) {
      console.error('Appointments page failed to initialize:', error)
      this.showErrorState()
    }
  }

  async saveAppointment(appointmentData) {
    try {
      // ✅ Safe auth check - won't break other pages
      await this.auth.requireAuth()
      
      const user = await this.auth.getCurrentUser()
      
      // Add user info to appointment
      const appointmentWithUser = {
        ...appointmentData,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: new Date()
      }
      
      // Save appointment logic
      console.log('Saving appointment:', appointmentWithUser)
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        // Handle auth gracefully without affecting global state
        this.showAuthRequiredMessage()
      } else {
        console.error('Failed to save appointment:', error)
        this.showErrorMessage('Failed to save appointment')
      }
    }
  }

  showLoginPrompt() {
    // Appointments-specific login UI
    this.container.innerHTML = `
      <div class="appointments-auth-required">
        <h3>Sign In Required</h3>
        <p>You need to sign in to create appointments.</p>
        <a href="/auth.html" class="btn-common btn-primary-common">Sign In</a>
      </div>
    `
  }

  showAuthRequiredMessage() {
    // Show inline message without redirecting
    const existingMessage = this.container.querySelector('.auth-message')
    if (existingMessage) return // Don't duplicate

    const message = document.createElement('div')
    message.className = 'auth-message'
    message.innerHTML = `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin: 16px 0;">
        ⚠️ Please <a href="/auth.html">sign in</a> to save appointments
      </div>
    `
    
    this.container.prepend(message)
  }

  showErrorState() {
    this.container.innerHTML = `
      <div class="appointments-error">
        <h3>Unable to load appointments</h3>
        <p>Please try refreshing the page.</p>
        <button onclick="location.reload()" class="btn-common btn-secondary-common">Refresh</button>
      </div>
    `
  }

  showErrorMessage(message) {
    // Show temporary error message
    console.error(message)
  }

  setupAppointmentsInterface() {
    // Setup appointments-specific interface
    console.log('✅ Appointments interface ready')
  }
}

// 3. ADMIN PAGE USING SAFE AUTH (SEPARATE INSTANCE)
// =================================================

export class AdminPageManager {
  constructor() {
    // Separate auth instance - completely isolated
    this.auth = new AuthService()
    this.container = document.querySelector('#admin-page')
  }

  async initialize() {
    try {
      await this.auth.initialize()
      
      // Admin-specific auth check
      const canAccess = await this.canAccessAdmin()
      
      if (!canAccess) {
        this.showAccessDenied()
        return
      }

      this.setupAdminInterface()
      
    } catch (error) {
      console.error('Admin page failed to initialize:', error)
    }
  }

  async canAccessAdmin() {
    try {
      await this.auth.requireAuth()
      const user = await this.auth.getCurrentUser()
      
      // Admin-specific permission check
      return user && user.isAdmin === true
    } catch (error) {
      return false
    }
  }

  showAccessDenied() {
    this.container.innerHTML = `
      <div class="admin-access-denied">
        <h3>Admin Access Required</h3>
        <p>You don't have permission to access admin features.</p>
        <a href="/" class="btn-common btn-secondary-common">Back to Home</a>
      </div>
    `
  }

  setupAdminInterface() {
    console.log('✅ Admin interface ready')
  }
}

// 4. SAFE PAGE INITIALIZATION
// ===========================

export async function initializePage() {
  const currentPath = window.location.pathname
  
  try {
    if (currentPath.includes('appointments')) {
      const appointments = new AppointmentsPageManager()
      await appointments.initialize()
      
    } else if (currentPath.includes('admin')) {
      const admin = new AdminPageManager()
      await admin.initialize()
      
    }
    
  } catch (error) {
    console.error('Page initialization failed:', error)
    // Graceful fallback - app doesn't crash
  }
}

// 5. USAGE
// ========

// Each page gets its own manager - no cross-contamination
document.addEventListener('DOMContentLoaded', initializePage)