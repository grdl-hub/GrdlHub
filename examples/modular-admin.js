// ✅ ISOLATED ADMIN MODULE
// This module can't break other pages

export class AdminPageManager {
  constructor() {
    // Private state - only this class can access
    this._isInitialized = false
    this._titleManager = null
    this._modalSystem = null
    
    // Namespace all DOM elements under admin
    this.container = document.querySelector('#admin-page')
    
    if (!this.container) {
      throw new Error('Admin container not found - page not loaded correctly')
    }
  }

  // Public API - controlled interface
  async initialize() {
    if (this._isInitialized) return
    
    try {
      // Only import what THIS page needs
      const { TitleManager } = await import('../utils/titleManagement.js')
      const { Modal } = await import('../utils/Modal.js')
      
      // Create isolated instances
      this._titleManager = new TitleManager('admin')
      this._modalSystem = Modal
      
      this._setupEventListeners()
      this._isInitialized = true
      
      console.log('✅ Admin page initialized successfully')
    } catch (error) {
      console.error('❌ Admin initialization failed:', error)
      this._showFallbackUI()
    }
  }

  // Private methods - can't be called from outside
  _setupEventListeners() {
    // Scope ALL event listeners to admin container only
    this.container.addEventListener('click', (e) => {
      // Event delegation - only handles admin events
      if (e.target.matches('.admin-add-title')) {
        this._handleAddTitle(e)
      } else if (e.target.matches('.admin-edit-title')) {
        this._handleEditTitle(e)
      }
      // Other pages' buttons won't trigger this
    })
  }

  _handleAddTitle(e) {
    // Isolated - only affects admin page
    this._titleManager?.openAddTitleModal()
  }

  _handleEditTitle(e) {
    const titleId = e.target.dataset.titleId
    const title = this._titleManager?.getTitleById(titleId)
    if (title) {
      this._titleManager.openEditTitleModal(title)
    }
  }

  _showFallbackUI() {
    // Graceful degradation if something fails
    this.container.innerHTML = `
      <div class="admin-error">
        <h3>Admin features temporarily unavailable</h3>
        <p>Please refresh the page or contact support.</p>
      </div>
    `
  }

  // Public cleanup method
  destroy() {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this._titleManager = null
    this._modalSystem = null
    this._isInitialized = false
  }
}

// Usage in admin.html/admin.js
let adminManager = null

document.addEventListener('DOMContentLoaded', async () => {
  try {
    adminManager = new AdminPageManager()
    await adminManager.initialize()
  } catch (error) {
    console.error('Failed to load admin page:', error)
  }
})

// Cleanup when leaving page
window.addEventListener('beforeunload', () => {
  adminManager?.destroy()
})