// 🛡️ SAFE AUTH WRAPPER FOR APPOINTMENTS
// Prevents appointments page changes from breaking admin/settings

export class AppointmentsAuth {
  constructor() {
    this.authModule = null
    this.currentUser = null
  }

  // Safe initialization - doesn't modify global auth
  async initialize() {
    try {
      // Import your existing auth without modifying it
      this.authModule = await import('../auth.js')
      return true
    } catch (error) {
      console.error('Auth initialization failed:', error)
      return false
    }
  }

  // Safe user getter - cached and isolated
  async getCurrentUser() {
    if (!this.authModule) {
      await this.initialize()
    }

    try {
      // Get user from existing system without modifications
      this.currentUser = await this.authModule.getCurrentUser()
      return this.currentUser
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Appointments-specific auth checks
  async canCreateAppointments() {
    const user = await this.getCurrentUser()
    
    if (!user) {
      return {
        allowed: false,
        reason: 'not_logged_in',
        message: 'Please sign in to create appointments'
      }
    }

    if (user.isDisabled) {
      return {
        allowed: false,
        reason: 'account_disabled',
        message: 'Your account is disabled. Contact an administrator.'
      }
    }

    return {
      allowed: true,
      user: user
    }
  }

  // Safe auth requirement - doesn't redirect globally
  async requireAuthForAppointments() {
    const authCheck = await this.canCreateAppointments()
    
    if (!authCheck.allowed) {
      // Handle gracefully without breaking other pages
      this.showAuthMessage(authCheck)
      throw new Error(authCheck.message)
    }

    return authCheck.user
  }

  showAuthMessage(authCheck) {
    // Show appointments-specific auth message
    const container = document.querySelector('#appointments-page')
    if (!container) return

    const existing = container.querySelector('.appointments-auth-notice')
    if (existing) existing.remove()

    const notice = document.createElement('div')
    notice.className = 'appointments-auth-notice'
    notice.style.cssText = `
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 12px;
      border-radius: 8px;
      margin: 16px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    `

    if (authCheck.reason === 'not_logged_in') {
      notice.innerHTML = `
        <span>⚠️</span>
        <div>
          <strong>Authentication Required</strong>
          <p style="margin: 4px 0 0 0;">${authCheck.message}</p>
          <a href="/auth.html" style="color: #856404; text-decoration: underline;">Sign In Here</a>
        </div>
      `
    } else {
      notice.innerHTML = `
        <span>🚫</span>
        <div>
          <strong>Access Restricted</strong>
          <p style="margin: 4px 0 0 0;">${authCheck.message}</p>
        </div>
      `
    }

    container.insertBefore(notice, container.firstChild)
  }
}

export default AppointmentsAuth