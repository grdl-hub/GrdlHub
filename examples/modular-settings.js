// ✅ ISOLATED SETTINGS MODULE  
// Completely independent from admin module

export class SettingsPageManager {
  constructor() {
    this._isInitialized = false
    this._titleManager = null
    
    // Different container = different scope
    this.container = document.querySelector('#settings-page')
    
    if (!this.container) {
      throw new Error('Settings container not found')
    }
  }

  async initialize() {
    if (this._isInitialized) return
    
    try {
      // Same TitleManager class, different instance
      const { TitleManager } = await import('../utils/titleManagement.js')
      
      // Settings-specific configuration
      this._titleManager = new TitleManager('settings')
      
      // Settings has different behavior than admin
      this._titleManager.onTitlesChanged = () => {
        this._refreshSettingsView()
      }
      
      this._setupSettingsEvents()
      this._loadUserPreferences()
      
      this._isInitialized = true
    } catch (error) {
      console.error('Settings initialization failed:', error)
    }
  }

  _setupSettingsEvents() {
    // Only listens to settings container events
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('.settings-edit-title')) {
        // Same method name, different behavior
        this._handleEditTitle(e)
      } else if (e.target.matches('.settings-save-preferences')) {
        this._savePreferences(e)
      }
    })
  }

  _handleEditTitle(e) {
    // Settings version - might have different validation
    const titleId = e.target.dataset.titleId
    const title = this._titleManager?.getTitleById(titleId)
    
    if (title) {
      // Settings might show usage stats
      this._titleManager.openEditTitleModal(title, { 
        showUsageStats: true 
      })
    }
  }

  _refreshSettingsView() {
    // Settings-specific refresh logic
    console.log('🔄 Refreshing settings view...')
  }

  _loadUserPreferences() {
    // Only settings page needs this
    console.log('⚙️ Loading user preferences...')
  }

  _savePreferences(e) {
    // Settings-only functionality
    console.log('💾 Saving preferences...')
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this._titleManager = null
    this._isInitialized = false
  }
}

// Independent initialization - won't interfere with admin
let settingsManager = null

if (document.querySelector('#settings-page')) {
  document.addEventListener('DOMContentLoaded', async () => {
    settingsManager = new SettingsPageManager()
    await settingsManager.initialize()
  })
}