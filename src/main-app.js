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
      // Verify user is still authenticated
      const user = AuthAPI.getCurrentAuthUser()
      if (!user || !user.emailVerified) {
        throw new Error('Authentication required')
      }

      this.currentUser = user

      // Build the main app UI
      this.buildMainUI()
      
      // Initialize core services (without auth - already handled)
      await initializeAccessControl()
      initializeUI()
      
      // Setup page modules
      initializeUsersPage()
      initializePagesPage()
      initializeContentPage()
      initializeSettingsPage()
      
      // Setup app functionality
      this.setupNavigation()
      this.setupLogout()
      this.setupPWAFeatures()
      
      // Initial routing
      this.handleInitialRoute()
      
      // Setup route change listener
      window.addEventListener('hashchange', () => this.handleRouteChange())
      
      this.initialized = true
      console.log('Main app initialized successfully')
      showNotification('Welcome to GrdlHub!', 'success')
      
    } catch (error) {
      console.error('Failed to initialize main app:', error)
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
              <div class="page-header">
                <h2 class="page-title">Users Management</h2>
                <button id="add-user-btn" class="btn btn-primary">Add New User</button>
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
