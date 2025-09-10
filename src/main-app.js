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
      initializeSettingsPage()
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
              <a href="#home" class="nav-link active">Home</a>
              <a href="#users" class="nav-link auth-required">Users</a>
              <a href="#pages" class="nav-link auth-required">Pages</a>
              <a href="#content" class="nav-link auth-required">Content</a>
              <a href="#settings" class="nav-link auth-required">Settings</a>
            </nav>
            <div class="user-menu">
              <span id="user-name">${this.currentUser.displayName || this.currentUser.email}</span>
              <button id="logout-btn" class="btn btn-secondary btn-small">Logout</button>
            </div>
          </div>
        </header>

        <main class="main">
          <!-- Home Page -->
          <section id="home" class="section active">
            <div class="container">
              <div class="dashboard">
                <div class="welcome-section">
                  <h2>Welcome back, <span id="welcome-user-name">${this.currentUser.displayName || 'User'}</span>!</h2>
                  <p>Manage your hub content and users from this central dashboard.</p>
                </div>
                
                <div class="dashboard-grid">
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
              </div>
            </div>
          </section>

          <!-- Users Management -->
          <section id="users" class="section">
            <div class="container">
              <!-- Tab Navigation -->
              <div class="tabs">
                <button class="tab-button active" data-tab="registered-users">Registered Users</button>
              </div>

              <!-- Registered Users Tab -->
              <div id="registered-users" class="tab-content active">
                <div class="page-header">
                  <h2 class="page-title">Registered Users</h2>
                  <div class="header-actions">
                    <div class="stats-row">
                      <span class="stat-item">Total: <span id="total-users-count">0</span></span>
                      <span class="stat-item">Active: <span id="active-users-count">0</span></span>
                    </div>
                    <button id="add-user-btn" class="btn btn-primary">Add New User</button>
                  </div>
                </div>

                <div class="users-controls">
                  <div class="search-box">
                    <input type="text" id="search-input" class="form-input" placeholder="Search users by name or email...">
                  </div>
                  <div class="filter-box">
                    <select id="role-filter" class="form-select">
                      <option value="">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
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
                          <th>Status</th>
                          <th>Last Login</th>
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

      <!-- User Modal -->
      <div id="user-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="user-modal-title">Add New User</h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="user-form">
              <div class="form-group">
                <label for="user-name" class="form-label">Full Name</label>
                <input type="text" id="user-name" name="user-name" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="user-congregation" class="form-label">Congregation</label>
                <input type="text" id="user-congregation" name="user-congregation" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="user-email" class="form-label">Email Address</label>
                <input type="email" id="user-email" name="user-email" class="form-input" required>
              </div>
              
              <div class="form-group">
                <label for="user-role" class="form-label">Role</label>
                <select id="user-role" name="user-role" class="form-select" required>
                  <option value="">Select Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Permissions</label>
                <div id="user-permissions" class="permissions-grid">
                  <!-- Permissions checkboxes will be populated here -->
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="save-user-btn" class="btn btn-primary" form="user-form">Save User</button>
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
}

// Export the main app initializer
export default async function initMainApp() {
  const app = new MainApp()
  await app.initialize()
  return app
}
