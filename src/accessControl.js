import { db } from './auth.js'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { getCurrentUser } from './auth.js'

// Available pages and their default permissions
const AVAILABLE_PAGES = {
  home: { name: 'Home', icon: '🏠', description: 'Dashboard and overview' },
  appointments: { name: 'Appointments', icon: '📅', description: 'Recurring appointments and scheduling' },
  availability: { name: 'Availability', icon: '📋', description: 'Mark availability for appointments' },
  users: { name: 'Users', icon: '👥', description: 'User management' },
  pages: { name: 'Pages', icon: '📄', description: 'Static page management' },
  content: { name: 'Content', icon: '📝', description: 'Dynamic content management' },
  settings: { name: 'Settings', icon: '⚙️', description: 'App configuration' }
}

// Default permissions for roles
const ROLE_PERMISSIONS = {
  admin: ['home', 'appointments', 'availability', 'users', 'pages', 'content', 'settings'],
  user: ['home', 'appointments', 'availability', 'content']
}

let userPermissions = null

// Initialize access control
export async function initializeAccessControl() {
  try {
    console.log('Access control initialized')
  } catch (error) {
    console.error('Error initializing access control:', error)
    throw error
  }
}

// Get user permissions from Firestore
export async function getUserPermissions(userId = null) {
  try {
    const user = getCurrentUser()
    if (!user && !userId) return []
    
    const targetUserId = userId || user.uid
    
    // Check cache first
    if (userPermissions && !userId) {
      return userPermissions
    }
    
    const userDoc = await getDoc(doc(db, 'users', targetUserId))
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const permissions = userData.permissions || []
      
      // If user has admin role, give all permissions
      if (userData.role === 'admin') {
        const allPermissions = Object.keys(AVAILABLE_PAGES)
        if (!userId) userPermissions = allPermissions
        return allPermissions
      }
      
      // Cache permissions if it's for current user
      if (!userId) userPermissions = permissions
      return permissions
    }
    
    return []
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

// Check if user has access to a specific page
export async function hasPageAccess(pageId, userId = null) {
  try {
    const permissions = await getUserPermissions(userId)
    return permissions.includes(pageId)
  } catch (error) {
    console.error('Error checking page access:', error)
    return false
  }
}

// Check if user is admin
export async function isAdmin(userId = null) {
  try {
    const user = getCurrentUser()
    if (!user && !userId) return false
    
    const targetUserId = userId || user.uid
    const userDoc = await getDoc(doc(db, 'users', targetUserId))
    
    if (userDoc.exists()) {
      return userDoc.data().role === 'admin'
    }
    
    return false
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Get user role
export async function getUserRole(userId = null) {
  try {
    const user = getCurrentUser()
    if (!user && !userId) return null
    
    const targetUserId = userId || user.uid
    const userDoc = await getDoc(doc(db, 'users', targetUserId))
    
    if (userDoc.exists()) {
      return userDoc.data().role || 'user'
    }
    
    return null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

// Clear permissions cache (call when user signs out)
export function clearPermissionsCache() {
  userPermissions = null
}

// Get all available pages
export function getAvailablePages() {
  return AVAILABLE_PAGES
}

// Get default permissions for a role
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
}

// Validate permissions array
export function validatePermissions(permissions) {
  const validPages = Object.keys(AVAILABLE_PAGES)
  return permissions.filter(permission => validPages.includes(permission))
}

// Filter navigation based on user permissions
export async function filterNavigation() {
  const user = getCurrentUser()
  
  if (!user) {
    // Not authenticated - hide all auth-required links
    document.body.classList.remove('authenticated')
    hideAllNavLinks()
    return
  }
  
  // User is authenticated
  document.body.classList.add('authenticated')
  
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]')
  const permissions = await getUserPermissions()
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('#')) {
      const pageId = href.substring(1)
      
      // Always show home page to authenticated users
      if (pageId === 'home') {
        link.style.display = ''
        return
      }
      
      // Show/hide based on permissions for other pages
      if (permissions.includes(pageId)) {
        link.style.display = ''
        link.removeAttribute('disabled')
      } else {
        link.style.display = 'none'
        link.setAttribute('disabled', 'true')
      }
    }
  })
}

// Hide all navigation links (for unauthenticated users)
function hideAllNavLinks() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]')
  navLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('#')) {
      const pageId = href.substring(1)
      // Only hide auth-required pages, not landing/auth pages
      if (pageId !== 'landing' && pageId !== 'auth') {
        link.style.display = 'none'
      }
    }
  })
}

// Filter dashboard cards based on permissions
export async function filterDashboardCards() {
  const dashboardCards = document.querySelectorAll('.dashboard-card')
  const permissions = await getUserPermissions()
  
  dashboardCards.forEach(card => {
    const pageId = card.dataset.page
    if (pageId && permissions.includes(pageId)) {
      card.style.display = ''
    } else {
      card.style.display = 'none'
    }
  })
}

// Setup permission-based UI updates
export function setupPermissionUI() {
  // Update UI when user auth state changes
  if (window.onAuthStateChange) {
    window.onAuthStateChange(async (user) => {
      if (user) {
        await filterNavigation()
        await filterDashboardCards()
      }
    })
  }
}

// Real-time permission enforcement
export async function enforcePagePermissions() {
  const user = getCurrentUser()
  const currentHash = window.location.hash.replace('#', '') || 'home'
  
  if (!user) {
    // Not authenticated - redirect to landing
    if (currentHash !== 'landing' && currentHash !== 'auth') {
      window.location.hash = '#landing'
    }
    return false
  }
  
  // Allow home page for all authenticated users
  if (currentHash === 'home' || currentHash === 'landing' || currentHash === 'auth') {
    return true
  }
  
  // Check page-specific permissions
  const hasAccess = await hasPageAccess(currentHash)
  if (!hasAccess) {
    // User doesn't have permission - redirect to home with error
    window.location.hash = '#home'
    showPermissionDeniedNotification(currentHash)
    return false
  }
  
  return true
}

// Show permission denied notification
function showPermissionDeniedNotification(pageId) {
  const pageInfo = AVAILABLE_PAGES[pageId]
  const pageName = pageInfo ? pageInfo.name : pageId
  
  // Import notification function dynamically to avoid circular dependencies
  import('./utils/notifications.js').then(({ showNotification }) => {
    showNotification(`Access denied: You don't have permission to view ${pageName}`, 'error')
  }).catch(() => {
    console.warn(`Access denied: You don't have permission to view ${pageName}`)
  })
}

// Update user permissions in real-time
export async function updateUserPermissions(userId, newPermissions) {
  try {
    // Clear cache if updating current user
    const currentUser = getCurrentUser()
    if (currentUser && currentUser.uid === userId) {
      clearPermissionsCache()
    }
    
    // Update navigation immediately
    await filterNavigation()
    
    // Check if current page is still accessible
    await enforcePagePermissions()
    
    return true
  } catch (error) {
    console.error('Error updating user permissions:', error)
    return false
  }
}

// Real-time permission monitoring
export function startPermissionMonitoring() {
  // Monitor hash changes for permission enforcement
  window.addEventListener('hashchange', enforcePagePermissions)
  
  // Monitor when permissions might change (e.g., user document updates)
  if (window.onAuthStateChange) {
    window.onAuthStateChange(async (user) => {
      if (user) {
        await filterNavigation()
        await enforcePagePermissions()
      }
    })
  }
}
