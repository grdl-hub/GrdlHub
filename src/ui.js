import { initializeNotifications } from './utils/notifications.js'

// Initialize UI components
export function initializeUI() {
  try {
    initializeNotifications()
    setupModals()
    setupFormValidation()
    console.log('UI initialized')
  } catch (error) {
    console.error('Error initializing UI:', error)
    throw error
  }
}

// Setup modal functionality
function setupModals() {
  const modals = document.querySelectorAll('.modal')
  
  modals.forEach(modal => {
    const closeBtn = modal.querySelector('.close-btn')
    const cancelBtn = modal.querySelector('.btn-secondary')
    
    // Close modal on close button click
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideModal(modal.id)
      })
    }
    
    // Close modal on cancel button click
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        hideModal(modal.id)
      })
    }
    
    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id)
      }
    })
  })
}

// Show modal
export function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    
    // Focus first input
    const firstInput = modal.querySelector('input, select, textarea')
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100)
    }
  }
}

// Hide modal
export function hideModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add('hidden')
    document.body.style.overflow = ''
    
    // Reset form if present
    const form = modal.querySelector('form')
    if (form) {
      form.reset()
    }
  }
}

// Setup form validation
function setupFormValidation() {
  const forms = document.querySelectorAll('form')
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]')
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        validateField(input)
      })
      
      input.addEventListener('input', () => {
        clearFieldError(input)
      })
    })
  })
}

// Validate individual field
function validateField(field) {
  const value = field.value.trim()
  let isValid = true
  let errorMessage = ''
  
  // Required validation
  if (field.hasAttribute('required') && !value) {
    isValid = false
    errorMessage = 'This field is required'
  }
  
  // Email validation
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      isValid = false
      errorMessage = 'Please enter a valid email address'
    }
  }
  
  // Password validation
  if (field.type === 'password' && value) {
    if (value.length < 6) {
      isValid = false
      errorMessage = 'Password must be at least 6 characters'
    }
  }
  
  // Show/hide error
  if (!isValid) {
    showFieldError(field, errorMessage)
  } else {
    clearFieldError(field)
  }
  
  return isValid
}

// Show field error
function showFieldError(field, message) {
  clearFieldError(field)
  
  field.classList.add('error')
  
  const errorElement = document.createElement('span')
  errorElement.className = 'field-error'
  errorElement.textContent = message
  
  field.parentNode.appendChild(errorElement)
}

// Clear field error
function clearFieldError(field) {
  field.classList.remove('error')
  
  const errorElement = field.parentNode.querySelector('.field-error')
  if (errorElement) {
    errorElement.remove()
  }
}

// Validate entire form
export function validateForm(formElement) {
  const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]')
  let isValid = true
  
  inputs.forEach(input => {
    if (!validateField(input)) {
      isValid = false
    }
  })
  
  return isValid
}

// Setup responsive table
export function setupResponsiveTable(tableElement) {
  if (!tableElement) return
  
  const wrapper = tableElement.closest('.table-responsive')
  if (!wrapper) return
  
  // Add scroll indicators
  function updateScrollIndicators() {
    const scrollLeft = wrapper.scrollLeft
    const scrollWidth = wrapper.scrollWidth
    const clientWidth = wrapper.clientWidth
    
    wrapper.classList.toggle('scroll-left', scrollLeft > 0)
    wrapper.classList.toggle('scroll-right', scrollLeft < scrollWidth - clientWidth)
  }
  
  wrapper.addEventListener('scroll', updateScrollIndicators)
  updateScrollIndicators()
}
