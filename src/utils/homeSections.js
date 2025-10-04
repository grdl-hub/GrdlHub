import { db } from '../auth.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  writeBatch 
} from 'firebase/firestore';
import { showNotification } from './notifications.js';

// Default sections configuration
const DEFAULT_SECTIONS = [
  {
    id: 'testemunho',
    title: 'Testemunho Público',
    icon: '',
    order: 1,
    enabled: true,
    pages: ['monthly', 'templates', 'reports']
  },
  {
    id: 'people',
    title: 'People Management',
    icon: '',
    order: 2,
    enabled: true,
    pages: ['availability', 'users']
  },
  {
    id: 'appointments',
    title: 'Appointments',
    icon: '',
    order: 3,
    enabled: true,
    pages: ['appointments']
  },
  {
    id: 'content',
    title: 'Content Management',
    icon: '',
    order: 4,
    enabled: true,
    pages: ['content', 'pages']
  },
  {
    id: 'system',
    title: 'System',
    icon: '',
    order: 5,
    enabled: true,
    pages: ['settings']
  }
];

// Import centralized page registry
import { getAvailablePagesArray } from './pageRegistry.js'

/**
 * Load all home sections from Firestore
 */
export async function loadHomeSections() {
  try {
    console.log('🏠 Loading home sections from Firestore...');
    const sectionsRef = collection(db, 'homeSections');
    const q = query(sectionsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('🏠 No sections found, initializing defaults...');
      await initializeDefaultSections();
      return await loadHomeSections(); // Recursive call to load the defaults
    }
    
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      firestoreId: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Loaded home sections:', sections.length);
    return sections;
  } catch (error) {
    console.error('❌ Error loading home sections:', error);
    // Return default sections as fallback
    return DEFAULT_SECTIONS;
  }
}

/**
 * Initialize default sections in Firestore
 */
export async function initializeDefaultSections() {
  try {
    console.log('🏠 Initializing default home sections...');
    const sectionsRef = collection(db, 'homeSections');
    const batch = writeBatch(db);
    
    for (const section of DEFAULT_SECTIONS) {
      const docRef = doc(sectionsRef);
      batch.set(docRef, {
        sectionId: section.id,
        title: section.title,
        icon: section.icon,
        order: section.order,
        enabled: section.enabled,
        pages: section.pages,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    console.log('✅ Default home sections initialized');
    showNotification('Default home sections initialized', 'success');
  } catch (error) {
    console.error('❌ Error initializing default sections:', error);
    showNotification('Error initializing default sections', 'error');
    throw error;
  }
}

/**
 * Add a new home section
 */
export async function addHomeSection(sectionData) {
  try {
    console.log('🏠 Adding new home section:', sectionData.title);
    
    const sectionsRef = collection(db, 'homeSections');
    const docRef = await addDoc(sectionsRef, {
      sectionId: sectionData.sectionId || generateSectionId(sectionData.title),
      title: sectionData.title,
      icon: sectionData.icon || '',
      order: sectionData.order || 999,
      enabled: sectionData.enabled !== false,
      pages: sectionData.pages || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Home section added with ID:', docRef.id);
    showNotification(`Section "${sectionData.title}" added successfully`, 'success');
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding home section:', error);
    showNotification('Error adding section', 'error');
    throw error;
  }
}

/**
 * Update an existing home section
 */
export async function updateHomeSection(firestoreId, updates) {
  try {
    console.log('🏠 Updating home section:', firestoreId);
    
    const sectionRef = doc(db, 'homeSections', firestoreId);
    await updateDoc(sectionRef, {
      ...updates,
      updatedAt: new Date()
    });
    
    console.log('✅ Home section updated');
    showNotification('Section updated successfully', 'success');
  } catch (error) {
    console.error('❌ Error updating home section:', error);
    showNotification('Error updating section', 'error');
    throw error;
  }
}

/**
 * Delete a home section
 */
export async function deleteHomeSection(firestoreId) {
  try {
    console.log('🏠 Deleting home section:', firestoreId);
    
    const sectionRef = doc(db, 'homeSections', firestoreId);
    await deleteDoc(sectionRef);
    
    console.log('✅ Home section deleted');
    showNotification('Section deleted successfully', 'success');
  } catch (error) {
    console.error('❌ Error deleting home section:', error);
    showNotification('Error deleting section', 'error');
    throw error;
  }
}

/**
 * Reorder home sections
 */
export async function reorderHomeSections(sectionsWithNewOrder) {
  try {
    console.log('🏠 Reordering home sections...');
    
    const batch = writeBatch(db);
    
    for (const section of sectionsWithNewOrder) {
      const sectionRef = doc(db, 'homeSections', section.firestoreId);
      batch.update(sectionRef, {
        order: section.order,
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    console.log('✅ Home sections reordered');
    showNotification('Sections reordered successfully', 'success');
  } catch (error) {
    console.error('❌ Error reordering home sections:', error);
    showNotification('Error reordering sections', 'error');
    throw error;
  }
}

/**
 * Get available pages for section assignment
 */
export function getAvailablePages() {
  return getAvailablePagesArray();
}

/**
 * Generate a section ID from title
 */
function generateSectionId(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);
}