// Main App Module - Only loads after successful authentication
// This is completely separate from the auth flow for security

import './style.css'
import { AuthAPI } from './auth-standalone.js'
import { initializeAccessControl, hasPageAccess, filterNavigation } from './accessControl.js'
import { initializeUI } from './ui.js'
import { initializeUsersPage } from './pages/users.js'
import { initializePagesPage } from './pages/pages.js'
import { initializeContentPage } from './pages/content.js'
import { initializeTemplatesPage } from './pages/templates.js'
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
        throw new Error('No authenticated user found')
      }
      
      this.currentUser = user
      console.log('✅ User verified, building UI...')

      // Build the main app UI
      this.buildMainUI()
      console.log('✅ UI built, initializing services...')
      
      // Initialize core services (without auth - already handled)
      await initializeAccessControl()
      console.log('✅ Access control initialized')
      
      // Filter navigation to show auth-required elements
      await filterNavigation()
      console.log('✅ Navigation filtered for authenticated user')
      
      initializeUI()
      console.log('✅ UI initialized')
      
      // Setup page modules
      console.log('🔧 Setting up page modules...')
      initializeUsersPage()
      initializePagesPage()
      initializeContentPage()
      initializeTemplatesPage()
      // Settings page will be initialized when it's shown
      initializeAppointmentsPage()
      initializeAvailability()
      console.log('✅ Page modules initialized')
      
      // Setup app functionality
      console.log('🔧 Setting up app functionality...')
      this.setupNavigation()
      this.setupTabs()
      this.setupLogout()
      this.setupUserSettingsMenu()
      await this.updateUserDropdownInfo()
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
            <button class="back-to-home" id="backToHome" style="display: none;">
              <svg class="icon__body--flip-rtl icon__body" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="14" width="14"><g><path d="M15.191,23.588l-8-11c-0.255-0.351-0.255-0.825,0-1.176l8-11l1.617,1.176L9.236,12l7.572,10.412 L15.191,23.588z"></path></g></svg>
              <span>Início</span>
            </button>
            <h1 class="logo">GrdlHub</h1>
            
            <!-- Settings Wheel Dropdown -->
            <div class="user-settings-menu">
              <button class="settings-wheel" id="settings-wheel" title="User Settings">
                <svg class="settings-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11.03L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11.03L19.5,12L19.43,12.97L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z" fill="currentColor"/>
                </svg>
              </button>
              
              <div class="user-dropdown" id="user-dropdown">
                <div class="user-info">
                  <div class="user-avatar">
                    <span class="avatar-text">U</span>
                  </div>
                  <div class="user-details">
                    <div class="user-name">Loading...</div>
                    <div class="user-email">${this.currentUser?.email || ''}</div>
                  </div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <div class="language-section">
                  <div class="section-label">Language / Idioma</div>
                  <div class="language-options">
                    <button class="language-option" data-lang="pt">
                      <span class="name">Português</span>
                    </button>
                    <button class="language-option" data-lang="en">
                      <span class="name">English</span>
                    </button>
                  </div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <div class="dropdown-actions">
                  <button class="dropdown-action" id="logout-action">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="main">
          <!-- Home Page -->
          <section id="home" class="section active">
            <div class="container">
              <div class="home-dashboard">
                <!-- Hero Section -->
                <div class="hero-section">
                  <div class="hero-background" id="heroBackground"></div>
                </div>

                <!-- Action Items Section -->
                <div class="action-items-section">
                  <h3>✅ Action Items</h3>
                  <div class="action-items-list" id="action-items-list">
                    <!-- Action items will be dynamically populated -->
                  </div>
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

          <!-- My Availability -->
          <section id="availability" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📋 My Availability</h2>
                <p>View appointments and mark your availability by clicking on them</p>
                
                <!-- View Mode Toggle -->
                <div class="view-mode-toggle">
                  <button id="calendar-view-btn" class="btn btn-secondary active">📅 Calendar View</button>
                  <button id="cards-view-btn" class="btn btn-secondary">📋 Cards View</button>
                </div>
              </div>

              <!-- Monthly Submission Status -->
              <div id="availability-submission-status" class="submission-status-container">
                <!-- Submission status will be populated by JavaScript -->
              </div>

              <!-- Calendar View -->
              <div id="calendar-view-section" class="availability-calendar-section">
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

              <!-- Cards View -->
              <div id="cards-view-section" class="availability-cards-section" style="display: none;">
                <!-- Card List View -->
                <div id="availability-cards-container" class="availability-cards-container">
                  <!-- Cards will be built by JavaScript -->
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

          <!-- Templates -->
          <section id="templates" class="section">
            <div class="container">
              <div class="section-header">
                <h2>📋 Templates</h2>
                <p>Create and manage appointment templates for easy scheduling</p>
              </div>

              <div class="page-controls">
                <div class="search-container">
                  <input type="text" id="templates-search" class="search-input" placeholder="🔍 Search templates...">
                </div>
                <button id="add-template-btn" class="btn btn-primary">
                  ➕ Create Template
                </button>
              </div>

              <div class="templates-stats">
                <div class="stat-card">
                  <div class="stat-number" id="templates-count">0</div>
                  <div class="stat-label">Templates</div>
                </div>
              </div>

              <div class="table-container">
                <table id="templates-table" class="data-table">
                  <thead>
                    <tr>
                      <th>Template Name</th>
                      <th>Appointments</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Templates will be populated by JavaScript -->
                  </tbody>
                </table>
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

      <!-- Template Modal -->
      <div id="template-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="template-modal-title">Create New Template</h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="template-form">
              <div class="form-group">
                <label for="template-name" class="form-label">Template Name</label>
                <input type="text" id="template-name" name="template-name" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="template-description" class="form-label">Description</label>
                <textarea id="template-description" name="template-description" class="form-textarea" rows="2" placeholder="Optional description"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Appointments</label>
                <div id="template-appointments" class="appointments-container">
                  <!-- Appointment fields will be populated here -->
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="addAppointment()">
                  ➕ Add Appointment
                </button>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" form="template-form">Save Template</button>
          </div>
        </div>
      </div>

      <!-- Template Preview Modal -->
      <div id="template-preview-modal" class="modal hidden">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3 id="template-preview-title">Template Preview</h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div id="template-preview-content">
              <!-- Preview content will be populated here -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Close</button>
            <button type="button" class="btn btn-primary" id="submit-template-btn">Submit Template</button>
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
    
    // Make navigateTo globally available for dynamic pages
    window.navigateTo = (page) => {
      console.log('🔄 Navigating to:', page)
      window.location.hash = `#${page}`
      this.showSection(page)
    }
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
    
    // Extract base section ID (remove query params from hash)
    const baseSectionId = sectionId.split('?')[0]
    console.log('🎯 Base section ID:', baseSectionId)
    
    // Cleanup previous page listeners before switching
    cleanupAvailability()
    
    const sections = document.querySelectorAll('.section')
    const navLinks = document.querySelectorAll('.nav-link')
    
    console.log('🔍 Found sections:', sections.length, 'nav links:', navLinks.length)
    
    sections.forEach(section => section.classList.remove('active'))
    navLinks.forEach(link => link.classList.remove('active'))
    
    const targetSection = document.getElementById(baseSectionId)
    const targetLink = document.querySelector(`[href="#${baseSectionId}"]`)
    
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
    
    // Monthly Availability Tracking
    if (baseSectionId === 'monthly-availability') {
      console.log('📅 Monthly Availability section activated')
      setTimeout(async () => {
        try {
          if (!this.monthlyAvailabilityManager) {
            console.log('📅 Loading Monthly Availability module...')
            const monthlyAvailabilityModule = await import('./pages/monthly-availability.js')
            console.log('📅 Module loaded successfully')
            this.monthlyAvailabilityManager = monthlyAvailabilityModule
          }
          console.log('📅 Initializing Monthly Availability...')
          await this.monthlyAvailabilityManager.initializeMonthlyAvailability()
          console.log('✅ Monthly Availability initialized successfully')
        } catch (error) {
          console.error('❌ Error loading monthly availability:', error)
          try {
            showNotification('Error loading availability tracking', 'error')
          } catch (notifError) {
            console.error('❌ Also failed to show notification:', notifError)
          }
        }
      }, 200)
    }
    
    // Monthly Availability Form
    if (baseSectionId === 'monthly-availability-form') {
      console.log('📝 Monthly Availability Form section activated')
      setTimeout(async () => {
        try {
          if (!this.monthlyAvailabilityFormManager) {
            console.log('📝 Loading Monthly Availability Form module...')
            const formModule = await import('./pages/monthly-availability-form.js')
            console.log('📝 Module loaded successfully')
            this.monthlyAvailabilityFormManager = formModule
          }
          console.log('📝 Initializing Monthly Availability Form...')
          await this.monthlyAvailabilityFormManager.initializeMonthlyAvailabilityForm()
          console.log('✅ Monthly Availability Form initialized successfully')
        } catch (error) {
          console.error('❌ Error loading monthly availability form:', error)
          try {
            showNotification('Error loading form', 'error')
          } catch (notifError) {
            console.error('❌ Also failed to show notification:', notifError)
          }
        }
      }, 200)
    }
    
    // Handle back button visibility
    this.updateBackButton(baseSectionId)
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
    // Handle the new dropdown logout action
    const logoutAction = document.getElementById('logout-action')
    if (logoutAction) {
      logoutAction.addEventListener('click', async () => {
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
    
    // Also handle legacy logout button if it exists
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
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
  }

  setupUserSettingsMenu() {
    const settingsWheel = document.getElementById('settings-wheel')
    const userDropdown = document.getElementById('user-dropdown')
    const languageOptions = document.querySelectorAll('.language-option')
    
    if (!settingsWheel || !userDropdown) return
    
    // Toggle dropdown on settings wheel click
    settingsWheel.addEventListener('click', (e) => {
      e.stopPropagation()
      const isOpen = userDropdown.classList.contains('show')
      
      if (isOpen) {
        this.closeUserDropdown()
      } else {
        this.openUserDropdown()
      }
    })
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!settingsWheel.contains(e.target) && !userDropdown.contains(e.target)) {
        this.closeUserDropdown()
      }
    })
    
    // Handle language switching
    languageOptions.forEach(option => {
      option.addEventListener('click', async (e) => {
        const selectedLang = e.currentTarget.dataset.lang
        console.log('🌍 Language changed to:', selectedLang)
        
        // Update active state
        languageOptions.forEach(opt => opt.classList.remove('active'))
        e.currentTarget.classList.add('active')
        
        // Store preference
        localStorage.setItem('selectedLanguage', selectedLang)
        
        // Apply language changes (if i18n system is available)
        if (window.i18n && typeof window.i18n.setLanguage === 'function') {
          await window.i18n.setLanguage(selectedLang)
        }
        
        // Show notification
        const langName = selectedLang === 'pt' ? 'Português' : 'English'
        showNotification(`Language changed to ${langName}`, 'success')
        
        // Close dropdown
        this.closeUserDropdown()
      })
    })
    
    // Set initial active language
    const currentLang = localStorage.getItem('selectedLanguage') || 'pt'
    languageOptions.forEach(option => {
      if (option.dataset.lang === currentLang) {
        option.classList.add('active')
      }
    })
  }
  
  openUserDropdown() {
    const settingsWheel = document.getElementById('settings-wheel')
    const userDropdown = document.getElementById('user-dropdown')
    
    settingsWheel?.classList.add('active')
    userDropdown?.classList.add('show')
  }
  
  closeUserDropdown() {
    const settingsWheel = document.getElementById('settings-wheel')
    const userDropdown = document.getElementById('user-dropdown')
    
    settingsWheel?.classList.remove('active')
    userDropdown?.classList.remove('show')
  }

  async fetchUserData() {
    try {
      if (!this.currentUser?.uid) return null
      
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('./auth.js')
      
      const userDocRef = doc(db, 'users', this.currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        return userDocSnap.data()
      } else {
        console.log('No user document found in Firestore')
        return null
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      return null
    }
  }

  async updateUserDropdownInfo() {
    const userData = await this.fetchUserData()
    const userNameElement = document.querySelector('.user-dropdown .user-name')
    const avatarElement = document.querySelector('.user-dropdown .avatar-text')
    
    if (userData && userData.name) {
      // Update user name from Firestore
      if (userNameElement) {
        userNameElement.textContent = userData.name
      }
      
      // Update avatar with first letter of name
      if (avatarElement) {
        avatarElement.textContent = userData.name.charAt(0).toUpperCase()
      }
    } else {
      // Fallback to Firebase Auth displayName or email
      const fallbackName = this.currentUser?.displayName || this.currentUser?.email?.split('@')[0] || 'User'
      if (userNameElement) {
        userNameElement.textContent = fallbackName
      }
      if (avatarElement) {
        avatarElement.textContent = fallbackName.charAt(0).toUpperCase()
      }
    }
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
