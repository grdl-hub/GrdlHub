// Main App Module - Only loads after successful authentication
// This is completely separate from the auth flow for security

import './style.css'
import { AuthAPI } from './auth-standalone.js'
import { initializeAccessControl, hasPageAccess } from './accessControl.js'
import { initializeUI } from './ui.js'
import { initializeUsersPage } from './pages/users.js'
import { initializePagesPage } from './pages/pages.js'
import { initializeContentPage } from './pages/content.js'
import { initializeSettingsPage } from './pages/settings.js'
import { initializeAppointmentsPage } from './pages/appointments.js'
import { showNotification } from './utils/notifications.js'

class MainApp {
  constructor() {
    this.currentUser = null
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return

    try {
      console.log('🔧 Initializing main app...')
      
      // Verify user is still authenticated
      const user = AuthAPI.getCurrentAuthUser()
      console.log('👤 Current user:', user)
      
      if (!user) {
        throw new Error('No authenticated user found')
      }

      // For Firebase sign-in links, email is automatically verified
      // But let's be more flexible with the verification check
      if (!user.emailVerified && user.providerData?.[0]?.providerId !== 'password') {
        console.warn('⚠️ Email not verified, but continuing for sign-in link users')
      }

      this.currentUser = user
      console.log('✅ User verified, building UI...')

      // Build the main app UI
      this.buildMainUI()
      console.log('✅ UI built, initializing services...')
      
      // Initialize core services (without auth - already handled)
      await initializeAccessControl()
      console.log('✅ Access control initialized')
      
      initializeUI()
      console.log('✅ UI initialized')
      
      // Setup page modules
      console.log('🔧 Setting up page modules...')
      initializeUsersPage()
      initializePagesPage()
      initializeContentPage()
      // Settings page will be initialized when it's shown
      initializeAppointmentsPage()
      console.log('✅ Page modules initialized')
      
      // Setup app functionality
      console.log('🔧 Setting up app functionality...')
      this.setupNavigation()
      this.setupTabs()
      this.setupLogout()
      this.setupPWAFeatures()
      console.log('✅ App functionality set up')
      
      // Initial routing
      console.log('🔧 Setting up routing...')
      this.handleInitialRoute()
      
      // Setup route change listener
      window.addEventListener('hashchange', () => this.handleRouteChange())
      
      // Load dashboard data
      this.loadDashboardData()
      
      this.initialized = true
      console.log('🎉 Main app initialized successfully!')
      showNotification('Welcome to GrdlHub!', 'success')
      
    } catch (error) {
      console.error('❌ Failed to initialize main app:', error)
      console.error('Stack trace:', error.stack)
      this.redirectToAuth('Authentication error. Please sign in again.')
    }
  }

  buildMainUI() {
    document.body.innerHTML = `
      <div id="app">
        <header class="header">
          <div class="container">
            <h1 class="logo">GrdlHub</h1>
            <nav class="nav">
              <a href="#home" class="nav-link active">🏠 Home</a>
              <a href="#appointments" class="nav-link auth-required">📅 Appointments</a>
              <a href="#users" class="nav-link auth-required">👥 Users</a>
              <a href="#pages" class="nav-link auth-required">📄 Pages</a>
              <a href="#content" class="nav-link auth-required">📝 Content</a>
              <a href="#settings" class="nav-link auth-required">⚙️ Settings</a>
            </nav>
            <div class="user-menu">
              <span id="user-name">${this.currentUser.displayName || this.currentUser.email}</span>
              <button id="logout-btn" class="btn btn-secondary btn-small">[Logout]</button>
            </div>
          </div>
        </header>

        <main class="main">
          <!-- Home Page -->
          <section id="home" class="section active">
            <div class="container">
              <div class="dashboard">
                <div class="welcome-section">
                  <h2>Welcome back, <span id="welcome-user-name">${this.currentUser.displayName || 'User'}</span>! 👋</h2>
                  <p class="welcome-date">Today is <span id="current-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                  <p>Manage your hub content and users from this central dashboard.</p>
                  <div class="welcome-notifications" id="welcome-notifications">
                    <!-- Notifications will be populated by JavaScript -->
                  </div>
                </div>
                
                <div class="dashboard-grid">
                  <div class="dashboard-card" data-page="appointments">
                    <div class="card-icon">📅</div>
                    <h3>Appointments</h3>
                    <p>Schedule and manage recurring appointments</p>
                    <div class="card-stats">
                      <span id="appointments-count">0</span> upcoming
                      <div class="next-appointment" id="next-appointment">⏰ Next: Loading...</div>
                    </div>
                  </div>
                  
                  <div class="dashboard-card" data-page="users">
                    <div class="card-icon">👥</div>
                    <h3>Users Management</h3>
                    <p>Manage user accounts, permissions, and access levels</p>
                    <div class="card-stats">
                      <span id="users-count">0</span> users
                    </div>
                  </div>
                  
                  <div class="dashboard-card" data-page="pages">
                    <div class="card-icon">📄</div>
                    <h3>Pages Management</h3>
                    <p>Create and manage static content pages</p>
                    <div class="card-stats">
                      <span id="pages-count">0</span> pages
                    </div>
                  </div>
                  
                  <div class="dashboard-card" data-page="content">
                    <div class="card-icon">📝</div>
                    <h3>Content Hub</h3>
                    <p>Manage dynamic content and resources</p>
                    <div class="card-stats">
                      <span id="content-count">0</span> items
                    </div>
                  </div>
                  
                  <div class="dashboard-card" data-page="settings">
                    <div class="card-icon">⚙️</div>
                    <h3>Settings</h3>
                    <p>Configure app settings and preferences</p>
                  </div>
                </div>
                
                <!-- Recent Activity Section -->
                <div class="recent-activity-section">
                  <h3>📋 Recent Activity</h3>
                  <div class="activity-feed" id="activity-feed">
                    <div class="activity-item">
                      <span class="activity-icon">👋</span>
                      <span class="activity-text">Welcome to GrdlHub! Start by exploring the features above.</span>
                      <span class="activity-time">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Appointments & Scheduling -->
          <section id="appointments" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📅 Appointments & Scheduling</h2>
                <p>Manage recurring appointments and view your schedule</p>
              </div>

              <div class="appointments-layout">
                <!-- Full-Width Calendar View Section -->
                <div class="calendar-section">
                  <div class="calendar-header">
                    <h3>📆 Monthly View</h3>
                    <div class="calendar-nav">
                      <button id="prev-month" class="btn btn-secondary btn-small">‹ Prev</button>
                      <span id="current-month-year" class="month-display">Loading...</span>
                      <button id="next-month" class="btn btn-secondary btn-small">Next ›</button>
                    </div>
                  </div>
                  <div id="calendar-grid" class="calendar-grid">
                    <!-- Calendar will be built by JavaScript -->
                  </div>
                  <div class="calendar-legend">
                    <span class="legend-item"><span class="legend-color meeting"></span> Meetings</span>
                    <span class="legend-item"><span class="legend-color task"></span> Tasks</span>
                    <span class="legend-item"><span class="legend-color event"></span> Events</span>
                    <span class="legend-item"><span class="legend-color reminder"></span> Reminders</span>
                  </div>
                </div>

                <!-- Floating Action Button -->
                <button id="add-appointment-btn" class="floating-action-btn" title="Create New Appointment">
                  <span class="fab-icon">+</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Users Management -->
          <section id="users" class="section">
            <div class="container">
              <!-- Users Content -->
              <div id="registered-users" class="tab-content active">
                <div class="users-controls">
                  <div class="search-box">
                    <input type="text" id="search-input" class="form-input" placeholder="🔍 Search users by name or email...">
                  </div>
                  <div class="filter-box">
                    <select id="role-filter" class="form-select">
                      <option value="">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div class="stats-and-actions">
                    <div class="stats-row">
                      <span class="stat-item">📊 Total: <span id="total-users-count">0</span></span>
                    </div>
                    <button id="add-user-btn" class="btn btn-primary">+ Add New User</button>
                  </div>
                </div>

                <div class="users-table-container">
                  <div id="users-table" class="table-responsive">
                    <table class="users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Congregation</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="users-tbody">
                        <!-- Users will be populated here -->
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Other sections will be added here by page modules -->
          <section id="pages" class="section">
            <div class="container">
              <div class="page-header">
                <h2 class="page-title">Pages Management</h2>
                <button id="add-page-btn" class="btn btn-primary">Create New Page</button>
              </div>
              <div class="pages-grid" id="pages-grid">
                <!-- Pages will be populated here -->
              </div>
            </div>
          </section>

          <section id="content" class="section">
            <div class="container">
              <div class="page-header">
                <h2 class="page-title">Content Hub</h2>
                <button id="add-content-btn" class="btn btn-primary">Add Content</button>
              </div>
              <div class="content-grid" id="content-grid">
                <!-- Content items will be populated here -->
              </div>
            </div>
          </section>

          <section id="settings" class="section">
            <div class="container">
              <div class="page-header">
                <h2 class="page-title">Settings</h2>
              </div>
              <div class="settings-grid">
                <div class="settings-card">
                  <h3>📋 Appointment Titles</h3>
                  <p>Manage dropdown options for appointment creation</p>
                  <div id="appointment-titles-management">
                    <!-- Appointment titles management will be populated here -->
                  </div>
                </div>
                
                <div class="settings-card">
                  <h3>App Configuration</h3>
                  <div class="form-group">
                    <label class="form-label">App Name</label>
                    <input type="text" id="app-name" class="form-input" value="GrdlHub">
                  </div>
                  <div class="form-group">
                    <label class="form-label">App Description</label>
                    <textarea id="app-description" class="form-textarea" rows="3">A centralized PWA hub with multiple features</textarea>
                  </div>
                  <button class="btn btn-primary">Save Changes</button>
                </div>
                
                <div class="settings-card">
                  <h3>User Permissions</h3>
                  <div class="permissions-list" id="permissions-list">
                    <!-- Permissions will be populated here -->
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer class="footer">
          <div class="container">
            <p>&copy; 2025 GrdlHub. All rights reserved.</p>
          </div>
        </footer>
      </div>

      <!-- Loading Spinner -->
      <div id="loading-spinner" class="loading-spinner hidden">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <!-- Notification Container -->
      <div id="notification-container" class="notification-container"></div>

      <!-- Add User Modal -->
      <div id="add-user-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add New User</h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="add-user-form">
              <div class="form-group">
                <label for="add-user-name" class="form-label">Full Name</label>
                <input type="text" id="add-user-name" name="user-name" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="add-user-congregation" class="form-label">Congregation</label>
                <input type="text" id="add-user-congregation" name="user-congregation" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="add-user-email" class="form-label">Email Address</label>
                <input type="email" id="add-user-email" name="user-email" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="add-user-role" class="form-label">Role</label>
                <select id="add-user-role" name="user-role" class="form-select" required>
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Permissions</label>
                <div id="add-user-permissions" class="permissions-grid">
                  <!-- Permissions checkboxes will be populated here -->
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="add-user-btn" class="btn btn-primary" form="add-user-form">Add User</button>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div id="edit-user-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit User</h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-user-form">
              <div class="form-group">
                <label for="edit-user-name" class="form-label">Full Name</label>
                <input type="text" id="edit-user-name" name="user-name" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="edit-user-congregation" class="form-label">Congregation</label>
                <input type="text" id="edit-user-congregation" name="user-congregation" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="edit-user-email" class="form-label">Email Address</label>
                <input type="email" id="edit-user-email" name="user-email" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="edit-user-role" class="form-label">Role</label>
                <select id="edit-user-role" name="user-role" class="form-select" required>
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Permissions</label>
                <div id="edit-user-permissions" class="permissions-grid">
                  <!-- Permissions checkboxes will be populated here -->
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="update-user-btn" class="btn btn-primary" form="edit-user-form">Update User</button>
          </div>
        </div>
      </div>

      <!-- Modals will be added by page modules -->
    `
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link')
    
    navLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault()
        const targetId = link.getAttribute('href').substring(1)
        
        // Check access permissions
        if (!(await this.hasNavAccess(targetId))) {
          return
        }
        
        // Navigate to section
        window.location.hash = `#${targetId}`
        this.showSection(targetId)
      })
    })
    
    // Dashboard cards navigation
    const dashboardCards = document.querySelectorAll('.dashboard-card')
    dashboardCards.forEach(card => {
      card.addEventListener('click', async () => {
        const targetPage = card.dataset.page
        if (targetPage && (await this.hasNavAccess(targetPage))) {
          window.location.hash = `#${targetPage}`
          this.showSection(targetPage)
        }
      })
    })
  }

  setupTabs() {
    // Tab functionality for users section
    const tabButtons = document.querySelectorAll('.tab-button')
    const tabContents = document.querySelectorAll('.tab-content')
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab
        
        // Remove active class from all tabs and contents
        tabButtons.forEach(btn => btn.classList.remove('active'))
        tabContents.forEach(content => content.classList.remove('active'))
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active')
        const targetContent = document.getElementById(targetTab)
        if (targetContent) {
          targetContent.classList.add('active')
        }
      })
    })
  }

  async hasNavAccess(pageId) {
    if (pageId === 'home') return true
    
    const hasAccess = await hasPageAccess(pageId)
    if (!hasAccess) {
      showNotification('You don\'t have permission to access this page', 'error')
      return false
    }
    
    return true
  }

  showSection(sectionId) {
    const sections = document.querySelectorAll('.section')
    const navLinks = document.querySelectorAll('.nav-link')
    
    sections.forEach(section => section.classList.remove('active'))
    navLinks.forEach(link => link.classList.remove('active'))
    
    const targetSection = document.getElementById(sectionId)
    const targetLink = document.querySelector(`[href="#${sectionId}"]`)
    
    if (targetSection) {
      targetSection.classList.add('active')
    }
    if (targetLink) {
      targetLink.classList.add('active')
    }
    
    // Initialize specific page functionality when it becomes active
    if (sectionId === 'settings') {
      // Wait a bit for the DOM to be ready, then initialize settings
      setTimeout(() => {
        initializeSettingsPage()
      }, 100)
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn')
    logoutBtn.addEventListener('click', async () => {
      try {
        await AuthAPI.signOutUser()
        showNotification('Signed out successfully', 'success')
        this.redirectToAuth()
      } catch (error) {
        console.error('Logout error:', error)
        showNotification('Error signing out', 'error')
      }
    })
  }

  setupPWAFeatures() {
    // PWA install prompt and service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        showNotification('App updated! Please refresh to see changes.', 'info', 0, true)
      })
    }
  }

  handleInitialRoute() {
    const hash = window.location.hash.replace('#', '') || 'home'
    this.showSection(hash)
  }

  handleRouteChange() {
    const hash = window.location.hash.replace('#', '') || 'home'
    this.showSection(hash)
  }

  redirectToAuth(message = '') {
    // Clear any app data
    AuthAPI.SecurityUtils.clearAuthData()
    
    // Redirect to auth page
    if (message) {
      sessionStorage.setItem('authMessage', message)
    }
    window.location.href = '/auth.html'
  }

  // Load dashboard data and statistics
  async loadDashboardData() {
    try {
      console.log('🔧 Loading dashboard data...')
      
      // Load appointments data
      await this.loadAppointmentsData()
      
      // Load users count (if admin)
      await this.loadUsersData()
      
      // Update welcome notifications
      this.updateWelcomeNotifications()
      
      // Add recent activity
      this.addRecentActivity('dashboard-loaded', 'Dashboard loaded successfully')
      
      console.log('✅ Dashboard data loaded')
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
    }
  }

  // Load appointments statistics
  async loadAppointmentsData() {
    try {
      const { db, getCurrentUser } = await import('./auth.js')
      const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore')
      
      const user = getCurrentUser()
      if (!user) return
      
      const appointmentsRef = collection(db, 'appointments')
      const q = query(appointmentsRef, where('createdBy', '==', user.uid))
      const snapshot = await getDocs(q)
      
      let upcomingCount = 0
      let nextAppointment = null
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      snapshot.forEach((doc) => {
        const appointment = doc.data()
        const aptDate = new Date(appointment.date)
        
        if (aptDate >= today) {
          upcomingCount++
          
          // Find the next upcoming appointment
          if (!nextAppointment || aptDate < new Date(nextAppointment.date)) {
            nextAppointment = appointment
          }
        }
      })
      
      // Update UI
      const countElement = document.getElementById('appointments-count')
      if (countElement) {
        countElement.textContent = upcomingCount
      }
      
      const nextElement = document.getElementById('next-appointment')
      if (nextElement && nextAppointment) {
        const nextDate = new Date(nextAppointment.date)
        const isToday = nextDate.toDateString() === today.toDateString()
        const dateStr = isToday ? 'Today' : nextDate.toLocaleDateString()
        nextElement.textContent = `⏰ Next: ${dateStr} at ${nextAppointment.time}`
      } else if (nextElement) {
        nextElement.textContent = '⏰ No upcoming appointments'
      }
      
      // Update welcome notifications
      if (upcomingCount > 0) {
        this.addWelcomeNotification('info', `🔔 You have ${upcomingCount} upcoming appointment${upcomingCount > 1 ? 's' : ''} this week`)
      }
      
    } catch (error) {
      console.error('Error loading appointments data:', error)
    }
  }

  // Load users count (admin only)
  async loadUsersData() {
    try {
      const { getUserData, getCurrentUser } = await import('./auth.js')
      const user = getCurrentUser()
      if (!user) return
      
      const userData = await getUserData(user.uid)
      if (userData?.role === 'admin') {
        // Admin can see user count
        const { db } = await import('./auth.js')
        const { collection, getDocs } = await import('firebase/firestore')
        
        const usersRef = collection(db, 'users')
        const snapshot = await getDocs(usersRef)
        
        const countElement = document.getElementById('users-count')
        if (countElement) {
          countElement.textContent = snapshot.size
        }
      }
    } catch (error) {
      console.error('Error loading users data:', error)
    }
  }

  // Update welcome notifications
  updateWelcomeNotifications() {
    const notificationsContainer = document.getElementById('welcome-notifications')
    if (!notificationsContainer) return
    
    // This will be populated by other methods as they add notifications
  }

  // Add welcome notification
  addWelcomeNotification(type, message) {
    const container = document.getElementById('welcome-notifications')
    if (!container) return
    
    const notification = document.createElement('div')
    notification.className = `welcome-notification ${type}`
    notification.textContent = message
    container.appendChild(notification)
  }

  // Add recent activity
  addRecentActivity(type, message) {
    const activityFeed = document.getElementById('activity-feed')
    if (!activityFeed) return
    
    const activity = document.createElement('div')
    activity.className = 'activity-item'
    
    const icon = type === 'appointment' ? '📅' : 
                 type === 'user' ? '👥' : 
                 type === 'page' ? '📄' : 
                 type === 'content' ? '📝' : '✅'
    
    activity.innerHTML = `
      <span class="activity-icon">${icon}</span>
      <span class="activity-text">${message}</span>
      <span class="activity-time">Just now</span>
    `
    
    // Add to top of feed
    activityFeed.insertBefore(activity, activityFeed.firstChild)
    
    // Keep only last 5 activities
    const activities = activityFeed.querySelectorAll('.activity-item')
    if (activities.length > 5) {
      activities[activities.length - 1].remove()
    }
  }
}

// Export the main app initializer
export default async function initMainApp() {
  const app = new MainApp()
  await app.initialize()
  return app
}
