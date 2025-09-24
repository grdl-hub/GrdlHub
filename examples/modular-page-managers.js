// 🔧 REFACTORING YOUR CURRENT PWA TO BE MORE MODULAR

// 1. CREATE PAGE MANAGERS
// ======================

// src/pages/AdminPageManager.js
export class AdminPageManager {
  constructor() {
    this.pageId = 'admin'
    this.container = document.querySelector(`#${this.pageId}-page`)
    this.titleManager = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    // Load dependencies asynchronously  
    const modules = await Promise.all([
      import('../utils/titleManagement.js'),
      import('../utils/Modal.js'),
      import('../utils/notifications.js')
    ])

    const [{ createAdminTitleManager }, { Modal }, { showNotification }] = modules

    // Create admin-specific instances
    this.titleManager = createAdminTitleManager()
    this.Modal = Modal
    this.showNotification = showNotification

    // Setup admin-specific behavior
    this.titleManager.onTitlesChanged = () => {
      this.refreshAdminTitlesList()
      this.showNotification('Admin titles updated', 'success')
    }

    this.setupAdminEvents()
    this.initialized = true
    
    console.log('✅ Admin page initialized')
  }

  setupAdminEvents() {
    // Admin-specific event handling
    this.container?.addEventListener('click', (e) => {
      const target = e.target
      
      if (target.matches('.admin-add-title-btn')) {
        this.handleAddTitle()
      } else if (target.matches('.admin-edit-title-btn')) {
        this.handleEditTitle(target.dataset.titleId)
      } else if (target.matches('.admin-delete-title-btn')) {
        this.handleDeleteTitle(target.dataset.titleId)
      }
    })
  }

  async handleAddTitle() {
    try {
      this.titleManager.openAddTitleModal()
    } catch (error) {
      this.showNotification('Failed to open add title modal', 'error')
    }
  }

  async handleEditTitle(titleId) {
    try {
      const title = await this.titleManager.getTitleById(titleId)
      if (title) {
        this.titleManager.openEditTitleModal(title)
      }
    } catch (error) {
      this.showNotification('Failed to load title for editing', 'error')
    }
  }

  async handleDeleteTitle(titleId) {
    const confirmed = await this.Modal.confirm(
      'Are you sure you want to delete this title?',
      'Confirm Delete'
    )
    
    if (confirmed) {
      try {
        await this.titleManager.deleteTitle(titleId)
        this.showNotification('Title deleted successfully', 'success')
      } catch (error) {
        this.showNotification('Failed to delete title', 'error')
      }
    }
  }

  refreshAdminTitlesList() {
    // Admin-specific refresh logic
    console.log('🔄 Refreshing admin titles list')
  }

  destroy() {
    this.container = null
    this.titleManager = null
    this.initialized = false
  }
}

// 2. SETTINGS PAGE MANAGER (SEPARATE FILE)
// ========================================

export class SettingsPageManager {
  constructor() {
    this.pageId = 'settings'
    this.container = document.querySelector(`#${this.pageId}-page`)
    this.titleManager = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    // Settings might need different dependencies
    const modules = await Promise.all([
      import('../utils/titleManagement.js'),
      import('../utils/Modal.js'),
      import('../utils/notifications.js'),
      import('../utils/userPreferences.js') // Settings-specific
    ])

    const [
      { createSettingsTitleManager }, 
      { Modal }, 
      { showNotification },
      { UserPreferences }
    ] = modules

    // Settings-specific instances
    this.titleManager = createSettingsTitleManager()
    this.Modal = Modal
    this.showNotification = showNotification
    this.userPrefs = new UserPreferences()

    // Settings-specific behavior
    this.titleManager.onTitlesChanged = () => {
      this.refreshSettingsTitlesList()
      this.saveUserPreferences()
    }

    this.setupSettingsEvents()
    this.loadUserPreferences()
    this.initialized = true
    
    console.log('✅ Settings page initialized')
  }

  setupSettingsEvents() {
    // Settings-specific events (different from admin)
    this.container?.addEventListener('click', (e) => {
      const target = e.target
      
      if (target.matches('.settings-edit-title-btn')) {
        this.handleEditTitle(target.dataset.titleId)
      } else if (target.matches('.settings-reorder-btn')) {
        this.handleReorderTitles()
      } else if (target.matches('.settings-export-btn')) {
        this.handleExportSettings()
      }
    })
  }

  async handleEditTitle(titleId) {
    // Settings version - might show more info
    try {
      const title = await this.titleManager.getTitleById(titleId)
      if (title) {
        // Settings shows usage stats
        this.titleManager.openEditTitleModal(title, { 
          showUsageStats: true,
          allowDeactivation: true 
        })
      }
    } catch (error) {
      this.showNotification('Failed to load title', 'error')
    }
  }

  handleReorderTitles() {
    // Settings-only feature
    console.log('🔄 Opening title reorder interface')
  }

  handleExportSettings() {
    // Settings-only feature
    console.log('📤 Exporting settings')
  }

  async loadUserPreferences() {
    try {
      const prefs = await this.userPrefs.load()
      this.applyPreferences(prefs)
    } catch (error) {
      console.log('Using default preferences')
    }
  }

  async saveUserPreferences() {
    // Auto-save when titles change
    const currentPrefs = this.getCurrentPreferences()
    await this.userPrefs.save(currentPrefs)
  }

  applyPreferences(prefs) {
    // Apply settings-specific preferences
    console.log('⚙️ Applying user preferences', prefs)
  }

  getCurrentPreferences() {
    return {
      titleOrder: this.titleManager.getCurrentOrder(),
      displayOptions: this.getDisplayOptions()
    }
  }

  getDisplayOptions() {
    // Settings-specific display options
    return {}
  }

  refreshSettingsTitlesList() {
    console.log('🔄 Refreshing settings titles list')
  }

  destroy() {
    this.container = null
    this.titleManager = null
    this.userPrefs = null
    this.initialized = false
  }
}

// 3. PAGE FACTORY (ROUTER)
// ========================

export class PageFactory {
  static managers = new Map()

  static async createPage(pageType) {
    // Don't recreate if already exists
    if (this.managers.has(pageType)) {
      return this.managers.get(pageType)
    }

    let manager = null

    switch (pageType) {
      case 'admin':
        manager = new AdminPageManager()
        break
      case 'settings':
        manager = new SettingsPageManager()
        break
      default:
        throw new Error(`Unknown page type: ${pageType}`)
    }

    // Initialize and store
    await manager.init()
    this.managers.set(pageType, manager)
    
    return manager
  }

  static destroyPage(pageType) {
    const manager = this.managers.get(pageType)
    if (manager) {
      manager.destroy()
      this.managers.delete(pageType)
    }
  }

  static destroyAll() {
    for (const [pageType, manager] of this.managers) {
      manager.destroy()
    }
    this.managers.clear()
  }
}

// 4. USAGE IN YOUR MAIN APP
// =========================

// In your main router/navigation
export async function navigateToPage(pageType) {
  try {
    // Clean up previous page
    PageFactory.destroyAll()
    
    // Create new page in isolation
    const pageManager = await PageFactory.createPage(pageType)
    
    console.log(`✅ Navigated to ${pageType} page`)
    
  } catch (error) {
    console.error(`❌ Failed to load ${pageType} page:`, error)
    // Show error page or fallback
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  PageFactory.destroyAll()
})