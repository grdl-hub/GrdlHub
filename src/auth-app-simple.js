// Standalone Auth Page - Simple working version for testing
console.log('🚀 Auth app module loaded')

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthPage)
} else {
  initAuthPage()
}

function initAuthPage() {
  console.log('🎨 Initializing auth page...')
  
  const container = document.getElementById('auth-container')
  if (!container) {
    console.error('❌ auth-container element not found!')
    return
  }
  
  console.log('✅ auth-container found, setting up interface...')
  
  // Insert the email form
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Secure Access Portal</p>
      
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Access Required</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem;">Please enter your email address to request access to GrdlHub.</p>
      
      <form id="simple-auth-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label for="email-input" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Email Address</label>
          <input 
            type="email" 
            id="email-input" 
            placeholder="your.email@example.com" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.3s ease;"
            required
          >
        </div>
        
        <button 
          type="submit" 
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease;"
        >
          Check Access
        </button>
      </form>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #757575; font-size: 0.875rem;">🔒 This application requires invitation-only access.</p>
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">If you need access, please contact an administrator.</p>
      </div>
    </div>
  `
  
  console.log('✅ HTML inserted successfully')
  
  // Bind form event
  const form = document.getElementById('simple-auth-form')
  if (form) {
    form.addEventListener('submit', handleFormSubmit)
    console.log('✅ Form event bound')
  } else {
    console.error('❌ Form not found after insertion')
  }
  
  // Try to load Firebase after the basic interface is ready
  loadFirebaseAuth()
}

function handleFormSubmit(e) {
  e.preventDefault()
  console.log('📧 Form submitted')
  
  const emailInput = document.getElementById('email-input')
  const email = emailInput ? emailInput.value.trim() : ''
  
  console.log('📧 Email entered:', email)
  
  if (!email) {
    alert('Please enter an email address.')
    return
  }
  
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.')
    return
  }
  
  // For now, just show a test message
  alert(`Testing successful! You entered: ${email}\n\nIn the full version, this would:\n1. Check if email is pre-approved\n2. Send a magic link if approved\n3. Show appropriate message`)
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function loadFirebaseAuth() {
  console.log('📦 Attempting to load Firebase modules...')
  
  try {
    const authModule = await import('./auth-standalone.js')
    console.log('✅ Auth module loaded:', Object.keys(authModule))
    
    // Try to initialize Firebase
    await authModule.initializeStandaloneAuth()
    console.log('✅ Firebase initialized successfully')
    
    // TODO: Replace the basic form handler with real Firebase auth
    console.log('🎉 Ready to implement full Firebase auth functionality')
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error)
    
    // Show error in UI (but don't break the basic functionality)
    const container = document.getElementById('auth-container')
    if (container) {
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = 'margin-top: 16px; padding: 12px; background: #ffebee; border: 1px solid #f44336; border-radius: 8px; color: #c62828; font-size: 0.875rem;'
      errorDiv.innerHTML = `<strong>Firebase Error:</strong> ${error.message}<br><em>Basic email form is still functional for testing.</em>`
      container.appendChild(errorDiv)
    }
  }
}
