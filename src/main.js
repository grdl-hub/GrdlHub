import './style.css'
import { initializeAuth, getCurrentUser, onAuthStateChange } from './auth.js'
import { initializeAccessControl, hasPageAccess, startPermissionMonitoring, filterNavigation } from './accessControl.js'
import { initializeUI } from './ui.js'
import { initializeUsersPage } from './pages/users.js'
import { initializePagesPage } from './pages/pages.js'
import { initializeContentPage } from './pages/content.js'
import { initializeSettingsPage } from './pages/settings.js'
import { initializeTemplatesPage } from './pages/templates.js'
import { showNotification } from './utils/notifications.js'

// Make auth functions available globally
window.getCurrentUser = getCurrentUser
window.onAuthStateChange = onAuthStateChange

// App state
let currentUser = null

// Routing and navigation
function enforceAuthRouting() {
  const user = getCurrentUser()
  const hash = window.location.hash.replace('#', '') || 'home'
  
  if (!user && hash !== 'auth' && hash !== 'landing') {
    window.location.hash = '#landing'
    showSection('landing')
  } else if (user && (hash === 'auth' || hash === 'landing')) {
    window.location.hash = '#home'
    showSection('home')
  } else if (user) {
    showSection(hash)
  }
}

// Navigation protection
async function protectNavigation(targetId) {
  const user = getCurrentUser()
  if (!user) {
    showNotification('Please sign in to access this page', 'warning')
    return false
  }
  
  if (targetId === 'home' || targetId === 'auth' || targetId === 'landing') {
    return true
  }
  
  const hasAccess = await hasPageAccess(targetId)
  if (!hasAccess) {
    showNotification('You don\'t have permission to access this page', 'error')
    return false
  }
  
  return true
}

// Show specific section
function showSection(sectionId) {
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
  
  // Update user menu visibility
  updateUserMenu()
}

// Update user menu based on auth state
function updateUserMenu() {
  const userMenu = document.getElementById('user-menu')
  const authNavLink = document.getElementById('auth-nav-link')
  const user = getCurrentUser()
  
  if (user) {
    // User is authenticated
    document.body.classList.add('authenticated')
    userMenu.style.display = 'flex'
    authNavLink.style.display = 'none'
    document.getElementById('user-name').textContent = user.displayName || user.email
  } else {
    // User is not authenticated
    document.body.classList.remove('authenticated')
    userMenu.style.display = 'none'
    authNavLink.style.display = 'block'
  }
}

// Navigation setup
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link')
  
  navLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault()
      const targetId = link.getAttribute('href').substring(1)
      
      // Check access permissions
      if (!(await protectNavigation(targetId))) {
        return
      }
      
      // Navigate to section
      window.location.hash = `#${targetId}`
      showSection(targetId)
    })
  })
  
  // Dashboard cards navigation
  const dashboardCards = document.querySelectorAll('.dashboard-card')
  dashboardCards.forEach(card => {
    card.addEventListener('click', async () => {
      const targetPage = card.dataset.page
      if (targetPage && (await protectNavigation(targetPage))) {
        window.location.hash = `#${targetPage}`
        showSection(targetPage)
      }
    })
  })
}

// Auth navigation helper
window.navigateToAuth = function(event) {
  event.preventDefault()
  window.location.hash = '#auth'
  showSection('auth')
}

// Logout functionality
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn')
  logoutBtn.addEventListener('click', async () => {
    try {
      const { signOut } = await import('./auth.js')
      await signOut()
      showNotification('Signed out successfully', 'success')
      window.location.hash = '#landing'
      showSection('landing')
    } catch (error) {
      console.error('Logout error:', error)
      showNotification('Error signing out', 'error')
    }
  })
}

// PWA install prompt
let deferredPrompt
const installPrompt = document.getElementById('install-prompt')
const installBtn = document.getElementById('install-btn')
const dismissBtn = document.getElementById('dismiss-btn')

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  
  // Show install prompt after delay
  setTimeout(() => {
    if (getCurrentUser()) {
      showInstallPrompt()
    }
  }, 5000)
})

function showInstallPrompt() {
  installPrompt.classList.remove('hidden')
}

function hideInstallPrompt() {
  installPrompt.classList.add('hidden')
}

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      showNotification('App installed successfully!', 'success')
    }
    deferredPrompt = null
  }
  hideInstallPrompt()
})

dismissBtn.addEventListener('click', hideInstallPrompt)

// Auth state observer
function setupAuthObserver() {
  onAuthStateChange(async (user) => {
    currentUser = user
    updateUserMenu()
    
    if (user) {
      // User signed in - update navigation based on permissions
      await filterNavigation()
      
      const currentHash = window.location.hash.replace('#', '')
      if (currentHash === 'auth' || currentHash === 'landing' || !currentHash) {
        window.location.hash = '#home'
        showSection('home')
      }
    } else {
      // User signed out
      window.location.hash = '#landing'
      showSection('landing')
    }
  })
}

// Service worker update notification
function setupServiceWorkerUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      showNotification('App updated! Please refresh to see changes.', 'info', 0, true)
    })
  }
}

// Initialize app
async function initApp() {
  try {
    // Initialize core services
    await initializeAuth()
    await initializeAccessControl()
    initializeUI()
    
    // Start permission monitoring for real-time access control
    startPermissionMonitoring()
    
    // Setup page modules
    initializeUsersPage()
    initializePagesPage()
    initializeContentPage()
    initializeSettingsPage()
    initializeTemplatesPage()
    
    // Setup navigation and auth
    setupNavigation()
    setupLogout()
    setupAuthObserver()
    setupServiceWorkerUpdates()
    
    // Initial routing
    enforceAuthRouting()
    
    // Setup hash change listener
    window.addEventListener('hashchange', enforceAuthRouting)
    
    console.log('GrdlHub initialized successfully')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    showNotification('Failed to initialize app. Please refresh and try again.', 'error')
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
