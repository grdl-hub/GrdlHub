import { db } from './auth.js'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { getCurrentUser } from './auth.js'

// Available pages and their default permissions
const AVAILABLE_PAGES = {
  home: { name: 'Home', icon: '🏠', description: 'Dashboard and overview' },
  users: { name: 'Users', icon: '👥', description: 'User management' },
  pages: { name: 'Pages', icon: '📄', description: 'Static page management' },
  content: { name: 'Content', icon: '📝', description: 'Dynamic content management' },
  settings: { name: 'Settings', icon: '⚙️', description: 'App configuration' }
}

// Default permissions for roles
const ROLE_PERMISSIONS = {
  admin: ['home', 'users', 'pages', 'content', 'settings'],
  user: ['home', 'content']
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
    return
  }
  
  // User is authenticated
  document.body.classList.add('authenticated')
  
  const navLinks = document.querySelectorAll('.nav-link.auth-required')
  const permissions = await getUserPermissions()
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('#')) {
      const pageId = href.substring(1)
      
      // Show/hide based on permissions
      if (permissions.includes(pageId)) {
        link.style.display = ''
      } else {
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
