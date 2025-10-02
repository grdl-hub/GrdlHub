// Main App Module - Only loads after successful authentication
// This is completely separate from the auth flow for security

import './style.css'
import { AuthAPI } from './auth-standalone.js'
import { initializeAccessControl, hasPageAccess, filterNavigation } from './accessControl.js'
import { initializeUI } from './ui.js'
import { initializeUsersPage } from './pages/users.js'
import { initializePagesPage } from './pages/pages.js'
import { initializeContentPage } from './pages/content.js'
import { initializeSettingsPage } from './pages/settings.js'
import { initializeAppointmentsPage } from './pages/appointments.js'
import { initializeAvailability, cleanupAvailability } from './pages/availability.js'
import { initializeTranslationsPage } from './pages/translations.js'
import { showNotification } from './utils/notifications.js'

class MainApp {
  constructor() {
    this.currentUser = null
    this.initialized = false
    this.reportsManager = null
    this.setupErrorTracking()
  }

  // Add global error tracking
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      console.error('🚨 Global JavaScript error:', event.error)
      console.error('🚨 Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason)
    })
  }

  // Debug navigation elements
  debugNavigationElements(when = '') {
    setTimeout(() => {
      console.log(`🔍 Navigation debug (${when}):`)
      const userMenu = document.querySelector('.user-menu')
      const userNameSpan = document.getElementById('user-name')
      const availabilityLink = document.querySelector('a[href="#availability"]')
      const authRequiredLinks = document.querySelectorAll('.auth-required')
      const bodyHasAuthClass = document.body.classList.contains('authenticated')
      
      console.log('  - Body has authenticated class:', bodyHasAuthClass)
      console.log('  - Body classes:', Array.from(document.body.classList))
      console.log('  - User menu exists:', !!userMenu)
      console.log('  - User name span exists:', !!userNameSpan)
      console.log('  - User name content:', userNameSpan?.textContent)
      console.log('  - Availability link exists:', !!availabilityLink)
      console.log('  - Availability link visible:', availabilityLink ? window.getComputedStyle(availabilityLink).display !== 'none' : false)
      console.log('  - Auth required links count:', authRequiredLinks.length)
      console.log('  - Auth required links visible:', Array.from(authRequiredLinks).map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent,
        visible: window.getComputedStyle(link).display !== 'none'
      })))
      
      // Update debug panel
      const debugNavElements = document.getElementById('debug-nav-elements')
      if (debugNavElements) {
        debugNavElements.textContent = `Nav: Menu=${!!userMenu} Name=${!!userNameSpan} Links=${authRequiredLinks.length}`
      }
      
      const debugAvailLink = document.getElementById('debug-availability-link')
      if (debugAvailLink) {
        const linkVisible = availabilityLink ? window.getComputedStyle(availabilityLink).display !== 'none' : false
        debugAvailLink.textContent = `Avail Link: ${!!availabilityLink ? (linkVisible ? 'VISIBLE' : 'HIDDEN') : 'NOT FOUND'}`
      }
    }, 100)
  }

  // Debug helper functions
  updateDebugPanel(section, data) {
    const debugPanel = document.getElementById('debug-panel')
    if (!debugPanel) return
    
    const timestamp = document.getElementById('debug-timestamp')
    if (timestamp) timestamp.textContent = `Time: ${new Date().toLocaleTimeString()}`
    
    if (section === 'auth') {
      const authStatus = document.getElementById('debug-auth-status')
      if (authStatus) authStatus.textContent = `Auth: ${data.status}`
      
      const userInfo = document.getElementById('debug-user-info')
      if (userInfo) userInfo.textContent = `User: ${data.user ? data.user.email || 'Unknown' : 'None'}`
    }
    
    if (section === 'navigation') {
      const currentSection = document.getElementById('debug-current-section')
      if (currentSection) currentSection.textContent = `Section: ${data.sectionId || 'None'}`
    }
  }

  async initialize() {
    if (this.initialized) return

    try {
      console.log('🔧 Initializing main app...')
      
      // Verify user is still authenticated
      const user = AuthAPI.getCurrentAuthUser()
      console.log('👤 Current user:', user)
      console.log('👤 User details:', {
        email: user?.email,
        displayName: user?.displayName,
        emailVerified: user?.emailVerified,
        uid: user?.uid
      })
      
      if (!user) {
        console.error('❌ No authenticated user found - redirecting to auth')
        this.updateDebugPanel('auth', { status: 'No user found', user: null })
        throw new Error('No authenticated user found')
      }
      
      this.updateDebugPanel('auth', { status: 'User found', user: user })

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
      this.updateDebugPanel('auth', { status: 'UI built', user: user })
      
      // Debug navigation elements before auth
      this.debugNavigationElements('before-auth')
      
      // Initialize core services (without auth - already handled)
      await initializeAccessControl()
      console.log('✅ Access control initialized')
      
      // Filter navigation to show auth-required elements
      await filterNavigation()
      console.log('✅ Navigation filtered for authenticated user')
      
      // Debug navigation elements after auth
      this.debugNavigationElements('after-auth')
      
      initializeUI()
      console.log('✅ UI initialized')
      
      // Setup page modules
      console.log('🔧 Setting up page modules...')
      initializeUsersPage()
      initializePagesPage()
      initializeContentPage()
      // Settings page will be initialized when it's shown
      initializeAppointmentsPage()
      initializeAvailability()
      console.log('✅ Page modules initialized')
      
      // Setup app functionality
      console.log('🔧 Setting up app functionality...')
      this.setupNavigation()
      this.setupTabs()
      this.setupLogout()
      this.setupBackButton()
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
      this.updateDebugPanel('auth', { status: 'SUCCESS: App initialized', user: this.currentUser })
      showNotification('Welcome to GrdlHub!', 'success')
      
    } catch (error) {
      console.error('❌ Failed to initialize main app:', error)
      console.error('Stack trace:', error.stack)
      this.updateDebugPanel('auth', { status: `FAILED: ${error.message}`, user: null })
      this.redirectToAuth('Authentication error. Please sign in again.')
    }
  }

  buildMainUI() {
    document.body.innerHTML = `
      <div id="app">
        <header class="header">
          <div class="container">
            <button class="back-to-home" id="backToHome" style="display: none;">
              <svg class="icon__body--flip-rtl icon__body" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="14" width="14"><g><path d="M15.191,23.588l-8-11c-0.255-0.351-0.255-0.825,0-1.176l8-11l1.617,1.176L9.236,12l7.572,10.412 L15.191,23.588z"></path></g></svg>
              <span>Início</span>
            </button>
            <h1 class="logo">GrdlHub</h1>
            <div class="user-menu">
              <span id="user-name">${this.currentUser?.displayName || this.currentUser?.email || 'Loading...'}</span>
              <button id="logout-btn" class="btn btn-secondary btn-small">[Logout]</button>
            </div>
          </div>
        </header>

        <!-- Debug Panel (remove in production) -->
        <div id="debug-panel" style="position: fixed; top: 0; right: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; font-size: 12px; z-index: 9999; max-width: 300px;">
          <div><strong>🐛 DEBUG PANEL</strong></div>
          <div id="debug-auth-status">Auth: Loading...</div>
          <div id="debug-user-info">User: Not loaded</div>
          <div id="debug-current-section">Section: None</div>
          <div id="debug-nav-elements">Nav: Checking...</div>
          <div id="debug-availability-link">Avail Link: Checking...</div>
          <div id="debug-timestamp">Time: ${new Date().toLocaleTimeString()}</div>
        </div>

        <main class="main">
          <!-- Home Page -->
          <section id="home" class="section active">
            <div class="container">
              <div class="home-dashboard">
                <!-- Hero Section -->
                <div class="hero-section">
                  <div class="hero-background" id="heroBackground"></div>
                </div>

                <!-- Dynamic Sections Container -->
                <div id="home-sections-container">
                  <!-- Sections will be dynamically populated based on user permissions -->
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
                </div>

                <!-- Floating Action Button -->
                <button id="add-appointment-btn" class="floating-action-btn" title="Create New Appointment">
                  <span class="fab-icon">+</span>
                </button>
              </div>
            </div>
          </section>

          <!-- My Availability Calendar -->
          <section id="availability" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📋 My Availability Calendar</h2>
                <p>View appointments and mark your availability by clicking on them</p>
              </div>

              <!-- Monthly Submission Status -->
              <div id="availability-submission-status" class="submission-status-container">
                <!-- Submission status will be populated by JavaScript -->
              </div>

              <!-- Monthly Calendar View -->
              <div class="availability-calendar-section">
                <div class="availability-calendar-header">
                  <h3>📆 Monthly Availability View</h3>
                  <div class="availability-calendar-nav">
                    <button id="availability-prev-month" class="btn btn-secondary btn-small">‹ Prev</button>
                    <span id="availability-current-month-year" class="month-display">Loading...</span>
                    <button id="availability-next-month" class="btn btn-secondary btn-small">Next ›</button>
                  </div>
                </div>
                
                <div id="availability-calendar-grid" class="availability-calendar-grid">
                  <!-- Calendar will be built by JavaScript -->
                </div>
              </div>
            </div>
          </section>

          <!-- Monthly View -->
          <section id="monthly" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📅 Monthly View</h2>
                <p>Simple monthly view of Testemunho Público appointments</p>
              </div>

              <div class="monthly-controls">
                <div class="control-group">
                  <label for="monthly-month-select">📅 Month</label>
                  <select id="monthly-month-select" class="form-select">
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>
                <div class="control-group">
                  <label for="monthly-year-select">📅 Year</label>
                  <select id="monthly-year-select" class="form-select">
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
                <div class="control-group">
                  <button id="generate-monthly-btn" class="btn btn-primary">📅 View Month</button>
                </div>
              </div>

              <div id="monthly-loading" class="loading-state" style="display: none;">
                <div class="loading-spinner"></div>
                <p>Loading appointments...</p>
              </div>

              <div id="monthly-results" class="monthly-results" style="display: none;">
                <!-- Monthly content will be populated by JavaScript -->
              </div>
            </div>
          </section>

          <!-- Reports -->
          <section id="reports" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📊 Reports</h2>
                <p>Generate and view detailed reports for appointments and volunteer assignments</p>
              </div>

              <!-- Report Type Selection -->
              <div class="reports-navigation">
                <div class="report-tabs">
                  <button id="testemunho-report-tab" class="report-tab active" data-report="testemunho">
                    📅 Testemunho Público
                  </button>
                  <button id="volunteer-report-tab" class="report-tab" data-report="volunteer">
                    👥 Volunteer Summary
                  </button>
                  <button id="activity-report-tab" class="report-tab" data-report="activity">
                    📈 Activity Report
                  </button>
                </div>
              </div>

              <!-- Testemunho Público Report -->
              <div id="testemunho-report" class="report-content active">
                <div class="report-controls">
                  <div class="control-group">
                    <label for="report-month">📅 Month</label>
                    <select id="report-month" class="form-select">
                      <!-- Options will be populated by JavaScript -->
                    </select>
                  </div>
                  <div class="control-group">
                    <label for="report-year">📅 Year</label>
                    <select id="report-year" class="form-select">
                      <!-- Options will be populated by JavaScript -->
                    </select>
                  </div>
                  <div class="control-group">
                    <button id="generate-report-btn" class="btn btn-primary">📊 Generate Report</button>
                    <button id="export-pdf-btn" class="btn btn-secondary" style="display: none;">📄 Export PDF</button>
                    <button id="export-excel-btn" class="btn btn-secondary" style="display: none;">📊 Export Excel</button>
                  </div>
                </div>

                <div id="report-loading" class="loading-state" style="display: none;">
                  <div class="loading-spinner"></div>
                  <p>Generating report...</p>
                </div>

                <div id="report-results" class="report-results" style="display: none;">
                  <!-- Report content will be populated by JavaScript -->
                </div>

                <div id="report-empty" class="empty-state" style="display: none;">
                  <h3>📭 No Data Found</h3>
                  <p>No "Testemunho Público" appointments found for the selected period.</p>
                </div>
              </div>

              <!-- Volunteer Summary Report (Future) -->
              <div id="volunteer-report" class="report-content">
                <div class="feature-placeholder">
                  <h3>👥 Volunteer Summary Report</h3>
                  <p>This report will show volunteer assignment statistics and workload distribution.</p>
                  <p><em>Coming soon...</em></p>
                </div>
              </div>

              <!-- Activity Report (Future) -->
              <div id="activity-report" class="report-content">
                <div class="feature-placeholder">
                  <h3>📈 Activity Report</h3>
                  <p>This report will show overall appointment and attendance trends.</p>
                  <p><em>Coming soon...</em></p>
                </div>
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
                          <th>Privilege</th>
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
                  <h3>🏠 Home Sections</h3>
                  <p>Customize home page sections and their organization</p>
                  <div id="home-sections-management">
                    <!-- Home sections management will be populated here -->
                  </div>
                </div>
                
                <div class="settings-card">
                  <h3>👥 User Privileges</h3>
                  <p>Manage congregation privileges and work functions</p>
                  <div id="privileges-management">
                    <!-- Privileges management will be populated here -->
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
                  <h3>🖼️ Hero Image</h3>
                  <p>Customize the home page hero background image</p>
                  <div id="hero-image-management">
                    <div class="hero-image-preview" id="heroImagePreview">
                      <div class="preview-placeholder">No image selected</div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Upload Hero Image</label>
                      <input type="file" id="heroImageUpload" class="form-input" accept="image/*">
                      <small class="form-hint">Recommended: 1920x400px, JPG or PNG format</small>
                    </div>
                    <div class="hero-image-actions">
                      <button class="btn btn-primary" id="uploadHeroImageBtn">Upload Image</button>
                      <button class="btn btn-secondary" id="removeHeroImageBtn">Remove Image</button>
                    </div>
                  </div>
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

          <!-- Translation Management -->
          <section id="translations" class="section">
            <div class="container">
              <div id="translations-content">
                <!-- Translation management content will be populated here -->
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
                <label class="form-label">Privileges</label>
                <div id="add-user-privileges" class="privileges-grid">
                  <!-- Privilege checkboxes will be populated here -->
                </div>
                <small class="form-help">Select multiple congregation privileges or work functions</small>
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
                <label class="form-label">Privileges</label>
                <div id="edit-user-privileges" class="privileges-grid">
                  <!-- Privilege checkboxes will be populated here -->
                </div>
                <small class="form-help">Select multiple congregation privileges or work functions</small>
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

      <!-- Add Privilege Modal -->
      <div id="add-privilege-modal" class="modal hidden">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add New Privilege</h3>
            <button type="button" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="add-privilege-form">
              <div class="form-group">
                <label for="add-privilege-name" class="form-label">Privilege Name</label>
                <input type="text" id="add-privilege-name" name="privilege-name" class="form-input" required>
                <small class="form-help">Enter the name of the congregation privilege or work function</small>
              </div>
              
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="add-privilege-active" name="privilege-active" checked>
                  Active
                </label>
                <small class="form-help">Uncheck to disable this privilege without deleting it</small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="save-privilege-btn" class="btn btn-primary" form="add-privilege-form">Save Privilege</button>
          </div>
        </div>
      </div>

      <!-- Edit Privilege Modal -->
      <div id="edit-privilege-modal" class="modal hidden">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Edit Privilege</h3>
            <button type="button" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-privilege-form">
              <div class="form-group">
                <label for="edit-privilege-name" class="form-label">Privilege Name</label>
                <input type="text" id="edit-privilege-name" name="privilege-name" class="form-input" required>
                <small class="form-help">Enter the name of the congregation privilege or work function</small>
              </div>
              
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="edit-privilege-active" name="privilege-active">
                  Active
                </label>
                <small class="form-help">Uncheck to disable this privilege without deleting it</small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="update-privilege-btn" class="btn btn-primary" form="edit-privilege-form">Update Privilege</button>
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
    console.log('🎯 Navigating to section:', sectionId)
    this.updateDebugPanel('navigation', { sectionId: sectionId })
    
    // Cleanup previous page listeners before switching
    cleanupAvailability()
    
    const sections = document.querySelectorAll('.section')
    const navLinks = document.querySelectorAll('.nav-link')
    
    console.log('🔍 Found sections:', sections.length, 'nav links:', navLinks.length)
    
    sections.forEach(section => section.classList.remove('active'))
    navLinks.forEach(link => link.classList.remove('active'))
    
    const targetSection = document.getElementById(sectionId)
    const targetLink = document.querySelector(`[href="#${sectionId}"]`)
    
    console.log('🎯 Target section found:', !!targetSection, 'Target link found:', !!targetLink)
    
    if (targetSection) {
      targetSection.classList.add('active')
    }
    if (targetLink) {
      targetLink.classList.add('active')
    }
    
    // Initialize specific page functionality when it becomes active
    if (sectionId === 'home') {
      // Initialize home page with dynamic sections
      console.log('🏠 Home section activated - setting up carousel sections')
      setTimeout(async () => {
        try {
          if (!this.homePageManager) {
            console.log('🏠 Loading HomePageManager module...')
            const homeModule = await import('./pages/home.js')
            console.log('🏠 HomePageManager module loaded successfully')
            this.homePageManager = new homeModule.HomePageManager()
            console.log('🏠 HomePageManager instance created')
          }
          console.log('🏠 Initializing HomePageManager...')
          await this.homePageManager.initialize()
          console.log('✅ HomePageManager initialized successfully')
        } catch (error) {
          console.error('❌ Error loading home page module:', error)
          try {
            showNotification('Error loading home page functionality', 'error')
          } catch (notifError) {
            console.error('❌ Also failed to show notification:', notifError)
          }
        }
      }, 200)
    }
    if (sectionId === 'settings') {
      // Wait a bit for the DOM to be ready, then initialize settings
      setTimeout(() => {
        initializeSettingsPage()
      }, 100)
    }
    if (sectionId === 'translations') {
      // Initialize translations page
      console.log('🌍 Translations section activated - setting up translation management')
      console.log('🔍 Current user:', this.currentUser)
      console.log('🔍 Checking if user has access to translations page')
      setTimeout(() => {
        try {
          console.log('🚀 Attempting to initialize translations page...')
          initializeTranslationsPage()
          console.log('✅ Translations page initialized successfully')
        } catch (error) {
          console.error('❌ Error initializing translations page:', error)
        }
      }, 100)
    }
    if (sectionId === 'availability') {
      // Initialize availability page with real-time listeners
      console.log('🎯 Availability section activated - setting up real-time updates')
      setTimeout(() => {
        initializeAvailability()
      }, 100)
    }
    if (sectionId === 'reports') {
      // Initialize reports page with dynamic import and error handling
      console.log('📊 Reports section activated - setting up reports functionality')
      setTimeout(async () => {
        try {
          if (!this.reportsManager) {
            console.log('📊 Loading ReportsManager module...')
            const reportsModule = await import('./pages/reports.js')
            console.log('📊 ReportsManager module loaded successfully')
            this.reportsManager = new reportsModule.ReportsManager()
            console.log('📊 ReportsManager instance created')
          }
          console.log('📊 Initializing ReportsManager...')
          this.reportsManager.init()
          console.log('✅ ReportsManager initialized successfully')
        } catch (error) {
          console.error('❌ Error loading reports module:', error)
          // Use try-catch for showNotification in case it's not available
          try {
            showNotification('Error loading reports functionality', 'error')
          } catch (notifError) {
            console.error('❌ Also failed to show notification:', notifError)
          }
        }
      }, 200) // Increased timeout to 200ms for more stability
    }
    if (sectionId === 'monthly') {
      // Initialize monthly view page with dynamic import
      console.log('📅 Monthly View section activated - setting up monthly view functionality')
      setTimeout(async () => {
        try {
          if (!this.monthlyViewManager) {
            console.log('📅 Loading MonthlyViewManager module...')
            const monthlyModule = await import('./pages/monthly.js')
            console.log('📅 MonthlyViewManager module loaded successfully')
            this.monthlyViewManager = new monthlyModule.MonthlyViewManager()
            console.log('📅 MonthlyViewManager instance created')
          }
          console.log('📅 Initializing MonthlyViewManager...')
          await this.monthlyViewManager.initialize()
          console.log('✅ MonthlyViewManager initialized successfully')
        } catch (error) {
          console.error('❌ Error loading monthly view module:', error)
          try {
            showNotification('Error loading monthly view functionality', 'error')
          } catch (notifError) {
            console.error('❌ Also failed to show notification:', notifError)
          }
        }
      }, 200)
    }
    
    // Handle back button visibility
    this.updateBackButton(sectionId)
  }

  updateBackButton(sectionId) {
    const backButton = document.getElementById('backToHome')
    if (backButton) {
      // Show back button on all pages except home
      if (sectionId === 'home') {
        backButton.style.display = 'none'
      } else {
        backButton.style.display = 'flex'
      }
    }
  }

  setupBackButton() {
    const backButton = document.getElementById('backToHome')
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.hash = '#home'
      })
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
