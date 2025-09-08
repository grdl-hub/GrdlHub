// Notification system
let notificationContainer

// Initialize notifications
export function initializeNotifications() {
  notificationContainer = document.getElementById('notification-container')
  if (!notificationContainer) {
    console.warn('Notification container not found')
  }
}

// Show notification
export function showNotification(message, type = 'info', duration = 5000, persistent = false) {
  if (!notificationContainer) {
    initializeNotifications()
  }
  
  if (!notificationContainer) {
    console.warn('Cannot show notification: container not found')
    return
  }
  
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  
  const content = document.createElement('div')
  content.className = 'notification-content'
  content.textContent = message
  
  const closeBtn = document.createElement('button')
  closeBtn.className = 'notification-close'
  closeBtn.innerHTML = '&times;'
  closeBtn.addEventListener('click', () => {
    removeNotification(notification)
  })
  
  notification.appendChild(content)
  notification.appendChild(closeBtn)
  
  // Add to container
  notificationContainer.appendChild(notification)
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show')
  }, 10)
  
  // Auto remove (unless persistent)
  if (!persistent && duration > 0) {
    setTimeout(() => {
      removeNotification(notification)
    }, duration)
  }
  
  return notification
}

// Remove notification
function removeNotification(notification) {
  if (notification && notification.parentNode) {
    notification.classList.add('hide')
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }
}

// Show loading
export function showLoading(message = 'Loading...') {
  const spinner = document.getElementById('loading-spinner')
  if (spinner) {
    spinner.querySelector('p').textContent = message
    spinner.classList.remove('hidden')
  }
}

// Hide loading
export function hideLoading() {
  const spinner = document.getElementById('loading-spinner')
  if (spinner) {
    spinner.classList.add('hidden')
  }
}

// Clear all notifications
export function clearNotifications() {
  if (notificationContainer) {
    notificationContainer.innerHTML = ''
  }
}
