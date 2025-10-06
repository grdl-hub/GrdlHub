/**
 * Central  appointments: { 
    name: 'Appointment  userReports: { 
    name: 'User Reports', 
    ico  admin: { 
    name: 'Admin', 
    icon: '�', 
    description: 'Administrative functions', 
    category: 'system' 
  },', 
    description: 'Generate user-specific reports', 
    category: 'people' 
  },   icon: '📅', 
    description: 'Recurring appointments and scheduling', 
    category: 'main' 
  },age Registry
 * Automatically discovers and manages available pages
 */

// Core page definitions - single source of truth
const PAGE_REGISTRY = {
  // Main pages
  home: { 
    name: 'Home', 
    icon: '🏠', 
    description: 'Dashboard and overview',
    category: 'main'
  },
  appointments: { 
    name: 'Appointments', 
    icon: '�', 
    description: 'Recurring appointments and scheduling', 
    category: 'main' 
  },
  availability: { 
    name: 'Availability', 
    icon: '📋', 
    description: 'Mark availability for appointments', 
    category: 'people' 
  },
  'availability-tracker': { 
    name: 'Availability Tracker', 
    icon: '📅', 
    description: 'Track availability submissions', 
    category: 'people' 
  },
  'availability-forms': { 
    name: 'Availability Forms', 
    icon: '📝', 
    description: 'Submit availability for appointments', 
    category: 'people' 
  },
  monthly: { 
    name: 'Monthly View', 
    icon: '📅', 
    description: 'Simple monthly view of appointments', 
    category: 'main' 
  },
  reports: { 
    name: 'Reports', 
    icon: '📊', 
    description: 'Generate detailed reports and analytics', 
    category: 'main' 
  },
  userReports: { 
    name: 'User Reports', 
    icon: '�', 
    description: 'Generate user-specific reports', 
    category: 'people' 
  },
  users: { 
    name: 'Users', 
    icon: '👥', 
    description: 'User management', 
    category: 'people' 
  },
  templates: { 
    name: 'Templates', 
    icon: '📋', 
    description: 'Appointment templates management',
    category: 'main'
  },
  content: { 
    name: 'Content', 
    icon: '📝', 
    description: 'Dynamic content management', 
    category: 'system' 
  },
  pages: { 
    name: 'Pages', 
    icon: '📄', 
    description: 'Static page management', 
    category: 'system' 
  },
  settings: { 
    name: 'Settings', 
    icon: '⚙️', 
    description: 'App configuration', 
    category: 'system' 
  },
  translations: { 
    name: 'Translations', 
    icon: '🌍', 
    description: 'Multi-language support', 
    category: 'system' 
  },
  'simple-translations': { 
    name: 'Simple Translations', 
    icon: '🌐', 
    description: 'Simplified translation interface', 
    category: 'system' 
  },
  admin: { 
    name: 'Admin', 
    icon: '�', 
    description: 'Administrative functions', 
    category: 'system' 
  },
  preApprovedEmails: { 
    name: 'Pre-approved Emails', 
    icon: '📧', 
    description: 'Email approval management', 
    category: 'system' 
  }
}

const CATEGORIES = {
  main: 'Main Features',
  people: 'People Management',
  system: 'System & Admin'
}

/**
 * Get all available pages as object (for accessControl.js format)
 */
export function getAvailablePages() {
  return PAGE_REGISTRY
}

/**
 * Get all available pages as array (for homeSections.js format)
 */
export function getAvailablePagesArray() {
  return Object.entries(PAGE_REGISTRY).map(([id, metadata]) => ({
    id,
    name: metadata.name,
    icon: metadata.icon
  }))
}

/**
 * Get pages formatted for settings page checkboxes
 */
export function getPageCheckboxes(selectedPages = []) {
  // Convert registry to the format expected by settings page
  const availablePages = Object.entries(PAGE_REGISTRY).map(([id, metadata]) => ({
    id,
    label: `${metadata.icon} ${metadata.name}`,
    category: metadata.category
  }))

  let html = ''
  
  // Add selected pages section first (for reordering)
  if (selectedPages.length > 0) {
    html += `
      <div class="selected-pages-section">
        <div class="selected-pages-list" id="selected-pages-sortable">
    `
    
    // Show selected pages in their current order
    selectedPages.forEach((pageId) => {
      const page = availablePages.find(p => p.id === pageId)
      if (page) {
        html += `
          <div class="selected-page-item" data-page-id="${pageId}">
            <div class="drag-handle">⋮⋮</div>
            <span class="page-icon">${page.label}</span>
            <button type="button" class="remove-page-btn" onclick="removePageFromSelection('${pageId}')">×</button>
          </div>
        `
      }
    })
    
    html += `
        </div>
      </div>
    `
  }
  
  // Add available pages section
  html += `
    <div class="available-pages-section">
      <div class="available-pages-header">
        <span>Available Pages</span>
      </div>
      <div class="available-pages-list">
  `
  
  // Group by category
  Object.entries(CATEGORIES).forEach(([categoryId, categoryName]) => {
    const categoryPages = availablePages.filter(page => page.category === categoryId)
    
    if (categoryPages.length > 0) {
      html += `
        <div class="page-category">
          <h4 class="category-title">${categoryName}</h4>
          <div class="category-pages">
      `
      
      categoryPages.forEach(page => {
        const isSelected = selectedPages.includes(page.id)
        html += `
          <label class="checkbox-item ${isSelected ? 'already-selected' : ''}">
            <input 
              type="checkbox" 
              name="available-pages" 
              value="${page.id}" 
              ${isSelected ? 'checked disabled' : ''}
              onchange="handlePageSelection('${page.id}', this.checked)"
            >
            ${page.label}
            ${isSelected ? '<span class="already-selected-badge">Added</span>' : ''}
          </label>
        `
      })
      
      html += `
          </div>
        </div>
      `
    }
  })
  
  html += `
      </div>
    </div>
    <input type="hidden" name="pages" id="pages-order" value="${selectedPages.join(',')}">
  `
  
  return html
}

/**
 * Get page dropdown options for forms
 */
export function getPageDropdownOptions(selectedValue = '') {
  return Object.entries(PAGE_REGISTRY).map(([id, metadata]) => 
    `<option value="${id}" ${selectedValue === id ? 'selected' : ''}>${metadata.icon} ${metadata.name}</option>`
  ).join('')
}

/**
 * Dynamically register a new page
 */
export function registerPage(id, metadata) {
  if (!metadata.category) {
    metadata.category = 'system' // default category
  }
  
  PAGE_REGISTRY[id] = metadata
  console.log(`📄 Automatically registered new page: ${id} - ${metadata.name}`)
  
  // Trigger update event for UI components that need to refresh
  window.dispatchEvent(new CustomEvent('pageRegistryUpdated', { 
    detail: { action: 'add', pageId: id, metadata } 
  }))
}

/**
 * Remove a page from registry
 */
export function unregisterPage(id) {
  const pageInfo = PAGE_REGISTRY[id]
  if (!pageInfo) {
    console.warn(`⚠️ Attempted to unregister non-existent page: ${id}`)
    return false
  }
  
  delete PAGE_REGISTRY[id]
  console.log(`🗑️ Unregistered page: ${id} (${pageInfo.name})`)
  
  // Trigger update event with page info for cleanup
  window.dispatchEvent(new CustomEvent('pageRegistryUpdated', { 
    detail: { action: 'remove', pageId: id, pageInfo } 
  }))
  
  return true
}

/**
 * Check if a page exists
 */
export function pageExists(id) {
  return id in PAGE_REGISTRY
}

/**
 * Get metadata for a specific page
 */
export function getPageMetadata(id) {
  return PAGE_REGISTRY[id] || null
}

/**
 * Get pages that can be safely deleted (non-core pages)
 */
export function getDeletablePages() {
  const corePages = ['home', 'settings'] // Core pages that cannot be deleted
  
  return Object.entries(PAGE_REGISTRY)
    .filter(([id]) => !corePages.includes(id))
    .map(([id, metadata]) => ({ id, ...metadata }))
}

/**
 * Get core pages that cannot be deleted
 */
export function getCorePages() {
  const corePageIds = ['home', 'settings']
  
  return Object.entries(PAGE_REGISTRY)
    .filter(([id]) => corePageIds.includes(id))
    .map(([id, metadata]) => ({ id, ...metadata }))
}

/**
 * Auto-discover pages from the file system (for development)
 * This scans for actual page files and updates the registry
 */
export async function autoDiscoverPages() {
  console.log('🔍 Running auto-discovery of pages...')
  
  // List of known page files that exist in src/pages/
  const knownPageFiles = [
    'home.js',
    'appointments.js', 
    'availability.js',
    'availability-tracker.js',
    'availability-forms.js',
    'reports.js',
    'userReports.js',
    'users.js',
    'pages.js',
    'templates.js',
    'content.js',
    'settings.js',
    'translations.js',
    'simple-translations.js',
    'admin.js',
    'preApprovedEmails.js'
  ]
  
  let discoveredPages = 0
  let newPages = 0
  
  knownPageFiles.forEach(file => {
    const pageId = file.replace('.js', '')
    discoveredPages++
    
    // Check if page is not in registry
    if (!PAGE_REGISTRY[pageId]) {
      // Auto-generate page info for new pages
      const autoPageInfo = {
        name: pageId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        icon: '📄', // Default icon
        description: `${pageId} page functionality`,
        category: 'main' // Default category
      }
      
      // Add to registry
      PAGE_REGISTRY[pageId] = autoPageInfo
      newPages++
      
      console.log(`📄 Auto-discovered new page: ${pageId} - ${autoPageInfo.name}`)
    }
  })
  
  console.log(`✅ Page discovery complete: ${discoveredPages} total, ${newPages} new pages added`)
  
  // Trigger update event if new pages were found
  if (newPages > 0) {
    window.dispatchEvent(new CustomEvent('pageRegistryUpdated', { 
      detail: { 
        action: 'auto-discovery',
        newPagesCount: newPages,
        totalPages: Object.keys(PAGE_REGISTRY).length
      }
    }))
  }
  
  return {
    totalPages: discoveredPages,
    newPages: newPages,
    registry: PAGE_REGISTRY
  }
}

/**
 * Manual refresh trigger for updating available pages
 */
export async function refreshPageRegistry() {
  console.log('🔄 Manual refresh of page registry triggered...')
  const result = await autoDiscoverPages()
  
  // Force UI refresh
  setTimeout(() => {
    window.location.reload()
  }, 1000)
  
  return result
}

/**
 * Initialize the page registry system
 */
export async function initializePageRegistry() {
  console.log('📄 Initializing Page Registry with', Object.keys(PAGE_REGISTRY).length, 'pages')
  
  // Run auto-discovery on initialization
  try {
    await autoDiscoverPages()
  } catch (error) {
    console.log('⚠️ Auto-discovery failed, using static registry:', error)
  }
  
  // Set up event listeners for automatic UI updates
  window.addEventListener('pageRegistryUpdated', (event) => {
    console.log('📄 Page registry updated:', event.detail)
    
    // Auto-refresh any UI components that depend on the page list
    // This ensures the Available Pages list updates automatically
    const settingsModals = document.querySelectorAll('.appointment-modal-overlay')
    settingsModals.forEach(modal => {
      const checkboxGroup = modal.querySelector('.checkbox-group')
      if (checkboxGroup) {
        // Trigger refresh of the checkbox list
        const refreshEvent = new CustomEvent('refreshPageList')
        checkboxGroup.dispatchEvent(refreshEvent)
      }
    })
  })
}

// Auto-initialize when module is loaded
initializePageRegistry()