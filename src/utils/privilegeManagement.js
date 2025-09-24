// Privilege Management Utility
// Handles CRUD operations for user privileges/work functions

import { db } from '../auth.js'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { showNotification } from './notifications.js'

// Default privileges for initialization
const DEFAULT_PRIVILEGES = [
  {
    name: 'Elder',
    description: 'Congregation elder with teaching and administrative responsibilities',
    category: 'Appointed',
    active: true
  },
  {
    name: 'Ministerial Servant',
    description: 'Ministerial servant with supporting responsibilities',
    category: 'Appointed',
    active: true
  },
  {
    name: 'Regular Pioneer',
    description: 'Full-time evangelizing minister',
    category: 'Pioneer',
    active: true
  },
  {
    name: 'Auxiliary Pioneer',
    description: 'Temporary full-time evangelizing minister',
    category: 'Pioneer',
    active: true
  },
  {
    name: 'Publisher',
    description: 'Baptized member of the congregation',
    category: 'Publisher',
    active: true
  },
  {
    name: 'Unbaptized Publisher',
    description: 'Unbaptized person participating in the preaching work',
    category: 'Publisher',
    active: true
  },
  {
    name: 'Student',
    description: 'Person studying the Bible but not yet participating in preaching',
    category: 'Other',
    active: true
  }
]

// Initialize default privileges if none exist
export async function initializeDefaultPrivileges() {
  try {
    console.log('🔧 Checking if privileges need initialization...')
    
    const privilegesRef = collection(db, 'privileges')
    const existingPrivileges = await getDocs(privilegesRef)
    
    if (existingPrivileges.empty) {
      console.log('📝 No privileges found, creating defaults...')
      
      for (const privilege of DEFAULT_PRIVILEGES) {
        const privilegeData = {
          ...privilege,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        }
        
        await addDoc(privilegesRef, privilegeData)
        console.log(`✅ Created privilege: ${privilege.name}`)
      }
      
      console.log('🎉 Default privileges initialized successfully')
      return true
    } else {
      console.log(`✅ Found ${existingPrivileges.size} existing privileges`)
      return false
    }
  } catch (error) {
    console.error('❌ Error initializing default privileges:', error)
    throw error
  }
}

// Load all privileges from Firestore
export async function loadPrivileges() {
  try {
    const privilegesRef = collection(db, 'privileges')
    const q = query(privilegesRef, orderBy('name'))
    const snapshot = await getDocs(q)
    
    const privileges = []
    snapshot.forEach((doc) => {
      privileges.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`📋 Loaded ${privileges.length} privileges`)
    return privileges
  } catch (error) {
    console.error('Error loading privileges:', error)
    throw error
  }
}

// Load privileges (active only by default, or all if includeInactive is true)
export async function loadActivePrivileges(includeInactive = false) {
  try {
    const privilegesRef = collection(db, 'privileges')
    
    // Simple query without compound index - just get all privileges ordered by name
    const q = query(privilegesRef, orderBy('name'))
    const snapshot = await getDocs(q)
    
    const allPrivileges = []
    snapshot.forEach((doc) => {
      allPrivileges.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    let privileges
    if (includeInactive) {
      // Return all privileges (for admin settings view)
      privileges = allPrivileges
    } else {
      // Filter for active privileges only in JavaScript (for dropdowns)
      privileges = allPrivileges.filter(privilege => privilege.active === true)
    }
    
    console.log(`📋 Loaded ${privileges.length} ${includeInactive ? 'total' : 'active'} privileges`)
    return privileges
  } catch (error) {
    console.error('Error loading privileges:', error)
    throw error
  }
}

// Create a new privilege
export async function createPrivilege(privilegeData) {
  try {
    const privilegesRef = collection(db, 'privileges')
    
    // Check for duplicate names
    const existingQuery = query(privilegesRef, where('name', '==', privilegeData.name))
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      throw new Error(`Privilege "${privilegeData.name}" already exists`)
    }
    
    const newPrivilege = {
      ...privilegeData,
      active: privilegeData.active ?? true,
      createdAt: new Date().toISOString(),
      createdBy: 'admin' // TODO: Get current user
    }
    
    const docRef = await addDoc(privilegesRef, newPrivilege)
    
    showNotification(`Privilege "${privilegeData.name}" created successfully`, 'success')
    return docRef.id
  } catch (error) {
    console.error('Error creating privilege:', error)
    showNotification(error.message || 'Error creating privilege', 'error')
    throw error
  }
}

// Update an existing privilege
export async function updatePrivilege(privilegeId, privilegeData) {
  try {
    // Check for duplicate names (excluding current privilege)
    const privilegesRef = collection(db, 'privileges')
    const existingQuery = query(privilegesRef, where('name', '==', privilegeData.name))
    const existingSnapshot = await getDocs(existingQuery)
    
    const duplicates = []
    existingSnapshot.forEach((doc) => {
      if (doc.id !== privilegeId) {
        duplicates.push(doc.id)
      }
    })
    
    if (duplicates.length > 0) {
      throw new Error(`Privilege name "${privilegeData.name}" is already used`)
    }
    
    const privilegeRef = doc(db, 'privileges', privilegeId)
    const updateData = {
      ...privilegeData,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin' // TODO: Get current user
    }
    
    await updateDoc(privilegeRef, updateData)
    
    showNotification(`Privilege "${privilegeData.name}" updated successfully`, 'success')
  } catch (error) {
    console.error('Error updating privilege:', error)
    showNotification(error.message || 'Error updating privilege', 'error')
    throw error
  }
}

// Delete a privilege
export async function deletePrivilege(privilegeId) {
  try {
    // TODO: Check if privilege is in use by any users
    // const usersRef = collection(db, 'users')
    // const usersQuery = query(usersRef, where('privilege', '==', privilegeId))
    // const usersSnapshot = await getDocs(usersQuery)
    
    // if (!usersSnapshot.empty) {
    //   throw new Error('Cannot delete privilege that is assigned to users')
    // }
    
    const privilegeRef = doc(db, 'privileges', privilegeId)
    await deleteDoc(privilegeRef)
    
    showNotification('Privilege deleted successfully', 'success')
  } catch (error) {
    console.error('Error deleting privilege:', error)
    showNotification(error.message || 'Error deleting privilege', 'error')
    throw error
  }
}

// Get privilege by ID
export async function getPrivilegeById(privilegeId) {
  try {
    const privilegesRef = collection(db, 'privileges')
    const snapshot = await getDocs(privilegesRef)
    
    let privilege = null
    snapshot.forEach((doc) => {
      if (doc.id === privilegeId) {
        privilege = {
          id: doc.id,
          ...doc.data()
        }
      }
    })
    
    return privilege
  } catch (error) {
    console.error('Error getting privilege:', error)
    throw error
  }
}

// Generate options HTML for privilege dropdown
export function generatePrivilegeOptionsHTML(privileges, selectedPrivilegeId = '') {
  let optionsHTML = '<option value="">Select privilege...</option>'
  
  privileges.forEach(privilege => {
    const selected = privilege.id === selectedPrivilegeId ? 'selected' : ''
    const emoji = getPrivilegeEmoji(privilege.category)
    optionsHTML += `<option value="${privilege.id}" ${selected}>${emoji} ${privilege.name}</option>`
  })
  
  return optionsHTML
}

// Get emoji for privilege category
function getPrivilegeEmoji(category) {
  const emojiMap = {
    'Appointed': '👨‍💼',
    'Pioneer': '🚶‍♂️',
    'Publisher': '📖',
    'Other': '👤'
  }
  return emojiMap[category] || '👤'
}

// Initialize privileges with check (to avoid repeated initialization)
export async function initializeDefaultPrivilegesWithCheck() {
  try {
    await initializeDefaultPrivileges()
  } catch (error) {
    console.error('Failed to initialize default privileges:', error)
    // Don't throw error to avoid breaking the app
    showNotification('Note: Using default privileges. Admin can manage privileges in Settings.', 'info')
  }
}