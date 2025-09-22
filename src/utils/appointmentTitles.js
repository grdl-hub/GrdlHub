// Appointment Titles Management - Firestore CRUD operations
import { db } from '../auth.js'
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { getCurrentUser } from '../auth.js'
import { showNotification } from '../utils/notifications.js'

// Load appointment titles from Firestore
export async function loadAppointmentTitles(forceRefresh = false) {
  try {
    console.log('📋 Loading appointment titles from Firestore...')
    
    // Simple query without compound index - just get all titles ordered by displayOrder
    const titlesQuery = query(
      collection(db, 'appointmentTitles'),
      orderBy('displayOrder', 'asc')
    )
    
    const snapshot = await getDocs(titlesQuery)
    const allTitles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Filter for active titles only in JavaScript
    const activeTitles = allTitles.filter(title => title.isActive === true)
    
    // Sort by displayOrder first, then by title as fallback (in case of same displayOrder)
    activeTitles.sort((a, b) => {
      const orderA = a.displayOrder ?? 999
      const orderB = b.displayOrder ?? 999
      
      if (orderA === orderB) {
        return a.title.localeCompare(b.title)
      }
      return orderA - orderB
    })
    
    console.log(`✅ Loaded ${activeTitles.length} active appointment titles`)
    return activeTitles
    
  } catch (error) {
    console.error('❌ Error loading appointment titles:', error)
    showNotification('Failed to load appointment titles. Using defaults.', 'error')
    
    // Return default titles as fallback
    return getDefaultTitles()
  }
}

// Get default appointment titles (fallback)
function getDefaultTitles() {
  return [
    { title: 'Testemunho Público', emoji: '🎤', displayOrder: 1 },
    { title: 'Reunião VMC', emoji: '📋', displayOrder: 2 },
    { title: 'Reunião de Oração', emoji: '🙏', displayOrder: 3 },
    { title: 'Estudo Bíblico', emoji: '📖', displayOrder: 4 },
    { title: 'Culto Dominical', emoji: '⛪', displayOrder: 5 }
  ]
}

// Add new appointment title
export async function addAppointmentTitle(titleData) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('User must be authenticated')
    }
    
    const newTitle = {
      title: titleData.title.trim(),
      emoji: titleData.emoji || '',
      displayOrder: titleData.displayOrder || 999,
      isActive: true,
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid
    }
    
    console.log('📝 Adding new appointment title:', newTitle)
    const docRef = await addDoc(collection(db, 'appointmentTitles'), newTitle)
    
    // Refresh cache
    await loadAppointmentTitles(true)
    
    showNotification(`Added new title: "${newTitle.title}"`, 'success')
    return { id: docRef.id, ...newTitle }
    
  } catch (error) {
    console.error('❌ Error adding appointment title:', error)
    showNotification('Failed to add appointment title', 'error')
    throw error
  }
}

// Update existing appointment title
export async function updateAppointmentTitle(titleId, updates) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('User must be authenticated')
    }
    
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid
    }
    
    console.log(`📝 Updating appointment title ${titleId}:`, updateData)
    await updateDoc(doc(db, 'appointmentTitles', titleId), updateData)
    
    // Refresh cache
    await loadAppointmentTitles(true)
    
    showNotification('Appointment title updated', 'success')
    
  } catch (error) {
    console.error('❌ Error updating appointment title:', error)
    showNotification('Failed to update appointment title', 'error')
    throw error
  }
}

// Soft delete appointment title (set isActive = false)
export async function deleteAppointmentTitle(titleId) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('User must be authenticated')
    }
    
    console.log(`🗑️ Deactivating appointment title ${titleId}`)
    await updateDoc(doc(db, 'appointmentTitles', titleId), {
      isActive: false,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid
    })
    
    // Refresh cache
    await loadAppointmentTitles(true)
    
    showNotification('Appointment title removed', 'success')
    
  } catch (error) {
    console.error('❌ Error deleting appointment title:', error)
    showNotification('Failed to remove appointment title', 'error')
    throw error
  }
}

// Reorder appointment titles
export async function reorderAppointmentTitles(titleUpdates) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('User must be authenticated')
    }
    
    console.log('🔄 Reordering appointment titles:', titleUpdates)
    
    // Update display order for each title
    const updatePromises = titleUpdates.map(({ id, displayOrder }) => 
      updateDoc(doc(db, 'appointmentTitles', id), {
        displayOrder,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      })
    )
    
    await Promise.all(updatePromises)
    
    showNotification('Title order updated', 'success')
    
  } catch (error) {
    console.error('❌ Error reordering appointment titles:', error)
    showNotification('Failed to reorder titles', 'error')
    throw error
  }
}

// Generate dropdown options HTML from titles
export function generateTitleOptionsHTML(titles, selectedTitle = '') {
  const options = titles.map(title => {
    const emoji = title.emoji ? `${title.emoji} ` : ''
    const selected = title.title === selectedTitle ? 'selected' : ''
    return `<option value="${title.title}" ${selected}>${emoji}${title.title}</option>`
  }).join('')
  
  return `
    <option value="">Select title...</option>
    ${options}
    <option value="custom">✏️ Custom...</option>
  `
}

// Initialize default titles if collection is empty
export async function initializeDefaultTitles() {
  try {
    console.log('🔍 Checking appointmentTitles collection...')
    const snapshot = await getDocs(collection(db, 'appointmentTitles'))
    
    if (snapshot.empty) {
      console.log('📋 Collection is empty. Initializing default appointment titles...')
      
      const defaultTitles = getDefaultTitles()
      const promises = defaultTitles.map(title => {
        const titleData = {
          title: title.title.trim(),
          emoji: title.emoji || '',
          displayOrder: title.displayOrder || 999,
          isActive: true,
          createdAt: Timestamp.now(),
          createdBy: 'system', // Use 'system' instead of user ID for initialization
          updatedAt: Timestamp.now(),
          updatedBy: 'system'
        }
        
        console.log(`   Adding: ${titleData.emoji} ${titleData.title}`)
        return addDoc(collection(db, 'appointmentTitles'), titleData)
      })
      
      await Promise.all(promises)
      console.log('✅ Default appointment titles initialized successfully!')
    } else {
      console.log(`✅ appointmentTitles collection already exists with ${snapshot.size} documents`)
    }
    
  } catch (error) {
    console.error('❌ Error initializing default titles:', error)
    console.error('Error details:', error.message)
    
    if (error.code === 'permission-denied') {
      console.log('💡 Permission denied. Make sure Firestore rules allow write access.')
    }
    
    throw error // Re-throw so calling code can handle it
  }
}