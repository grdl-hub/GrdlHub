// Unified Title Management System
// Consolidates duplicate code from admin.js and settings.js

import { 
  loadAppointmentTitles,
  addAppointmentTitle,
  updateAppointmentTitle,
  deleteAppointmentTitle,
  reorderAppointmentTitles
} from './appointmentTitles.js'
import { showNotification } from './notifications.js'
import Modal from './Modal.js'

export class TitleManager {
  constructor(containerType = 'default') {
    this.containerType = containerType // 'admin' or 'settings'
    this.appointmentTitles = []
  }

  // Load titles with usage stats
  async loadTitlesWithStats(forceRefresh = false) {
    try {
      this.appointmentTitles = await loadAppointmentTitles(forceRefresh)
      await this.loadUsageStats()
      return this.appointmentTitles
    } catch (error) {
      console.error('Error loading titles:', error)
      showNotification('Failed to load appointment titles', 'error')
      return []
    }
  }

  // Load usage statistics for each title
  async loadUsageStats() {
    try {
      const { db } = await import('../auth.js')
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      
      for (const title of this.appointmentTitles) {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('title', '==', title.title)
        )
        
        const snapshot = await getDocs(appointmentsQuery)
        title.usageCount = snapshot.size
      }
    } catch (error) {
      console.error('Error loading usage stats:', error)
    }
  }

  // Create unified add title modal
  openAddTitleModal() {
    const modal = new Modal({
      title: '➕ Add New Appointment Title',
      size: 'medium'
    })
    
    const form = modal.createForm([
      {
        label: 'Title',
        name: 'title',
        type: 'text',
        placeholder: 'Enter title...',
        required: true
      },
      {
        label: 'Emoji (optional)',
        name: 'emoji',
        type: 'text',
        placeholder: '🎤',
        maxlength: 2
      },
      {
        label: 'Display Order',
        name: 'order',
        type: 'number',
        value: this.appointmentTitles.length + 1,
        min: 1
      }
    ], {
      buttons: [
        {
          text: 'Cancel',
          variant: 'secondary',
          onClick: () => modal.close()
        },
        {
          text: '💾 Add Title',
          variant: 'primary',
          type: 'submit',
          onClick: (e) => {
            e.preventDefault()
            this.handleAddTitle(e, modal)
          }
        }
      ]
    })
    
    modal.open()
  }

  // Create unified edit title modal
  openEditTitleModal(title) {
    const modal = new Modal({
      title: '✏️ Edit Appointment Title',
      size: 'medium'
    })
    
    const form = modal.createForm([
      {
        label: 'Title',
        name: 'title',
        type: 'text',
        value: title.title,
        required: true
      },
      {
        label: 'Emoji (optional)',
        name: 'emoji',
        type: 'text',
        value: title.emoji || '',
        maxlength: 2
      },
      {
        label: 'Display Order',
        name: 'order',
        type: 'number',
        value: title.displayOrder,
        min: 1
      }
    ], {
      buttons: [
        {
          text: 'Cancel',
          variant: 'secondary',
          onClick: () => modal.close()
        },
        {
          text: '💾 Update Title',
          variant: 'primary',
          type: 'submit',
          onClick: (e) => {
            e.preventDefault()
            this.handleEditTitle(e, modal, title)
          }
        }
      ]
    })
    
    modal.open()
  }

  // Unified add title handler
  async handleAddTitle(e, modal) {
    e.preventDefault()
    
    const formData = modal.getFormData()
    
    const titleData = {
      title: formData.title?.trim(),
      emoji: formData.emoji?.trim(),
      displayOrder: parseInt(formData.order)
    }
    
    if (!titleData.title) {
      showNotification('Title is required', 'error')
      return
    }
    
    try {
      await addAppointmentTitle(titleData)
      
      // Close modal
      modal.close()
      
      // Notify parent to reload
      this.onTitlesChanged?.()
      
    } catch (error) {
      console.error('Error adding title:', error)
      showNotification('Failed to add title', 'error')
    }
  }

  // Unified edit title handler
  async handleEditTitle(e, modal, title) {
    e.preventDefault()
    
    const formData = modal.getFormData()
    
    const updates = {
      title: formData.title?.trim(),
      emoji: formData.emoji?.trim(),
      displayOrder: parseInt(formData.order)
    }
    
    if (!updates.title) {
      showNotification('Title is required', 'error')
      return
    }
    
    try {
      await updateAppointmentTitle(title.id, updates)
      
      // Close modal
      modal.close()
      
      // Notify parent to reload
      this.onTitlesChanged?.()
      
    } catch (error) {
      console.error('Error updating title:', error)
      showNotification('Failed to update title', 'error')
    }
  }

  // Unified deactivate title
  async performDeactivateTitle(titleId, titleName, usageCount) {
    let message
    
    if (usageCount > 0) {
      message = `"${titleName}" is used in ${usageCount} appointment(s).<br><br>` +
        `Removing it will:<br>` +
        `• Hide it from future appointment forms<br>` +
        `• Keep existing appointments unchanged<br><br>` +
        `Are you sure you want to remove this title?`
    } else {
      message = `Are you sure you want to remove "${titleName}"?`
    }
    
    const confirmed = await Modal.confirm(message, 'Confirm Removal')
    
    if (!confirmed) return
    
    try {
      await updateAppointmentTitle(titleId, { isActive: false })
      showNotification(`"${titleName}" removed from dropdown`, 'success')
      
      // Notify parent to reload
      this.onTitlesChanged?.()
      
    } catch (error) {
      console.error('Error deactivating title:', error)
      showNotification('Failed to remove title', 'error')
    }
  }

  // Unified reactivate title
  async performReactivateTitle(titleId) {
    const title = this.appointmentTitles.find(t => t.id === titleId)
    if (!title) return
    
    try {
      await updateAppointmentTitle(titleId, { isActive: true })
      showNotification(`"${title.title}" restored successfully`, 'success')
      
      // Notify parent to reload
      this.onTitlesChanged?.()
      
    } catch (error) {
      console.error('Error reactivating title:', error)
      showNotification('Failed to restore title', 'error')
    }
  }

  // Set callback for when titles change
  onTitlesChanged(callback) {
    this.onTitlesChanged = callback
  }
}

// Export convenience factory functions
export function createAdminTitleManager() {
  return new TitleManager('admin')
}

export function createSettingsTitleManager() {
  return new TitleManager('settings')
}