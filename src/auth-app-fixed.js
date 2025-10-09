// Clean Authentication Portal - Simple Email-Based Access
console.log('🚀 Authentication Portal Loaded')

// Global variables
let authModule = null
let isReady = false

// Storage keys for magic link flow
const STORED_EMAIL_LINK_KEY = 'auth:pendingEmailLink'
const STORED_EMAIL_KEY = 'auth:pendingEmail'

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthPortal)
} else {
  initAuthPortal()
}

async function initAuthPortal() {
  console.log('🎨 Initializing authentication portal...')
  
  const container = document.getElementById('auth-container')
  if (!container) {
    console.error('❌ auth-container not found!')
    return
  }
  
  try {
    // Load Firebase auth module
    authModule = await import('./auth-standalone.js')
    console.log('🔐 Firebase auth module loaded. Current URL:', window.location.href)
    await authModule.initializeStandaloneAuth()
    console.log('🔐 Standalone auth initialized. Firebase sign-in link detected?', authModule.isFirebaseSignInLink())
    isReady = true
    
    // Check if user is already signed in
    const currentUser = authModule.getCurrentAuthUser()
    if (currentUser) {
      console.log('✅ User already signed in:', currentUser.email)
      showSignedInState(container)
      return
    }
    
      // Check if this is a magic link in the current URL
      if (authModule.isFirebaseSignInLink()) {
        console.log('🔗 Processing magic link in URL:', window.location.href)
        await processMagicLink(container)
        return
      }

      // Check if we have a stored pending magic link (from handler)
      const storedLink = window.localStorage.getItem(STORED_EMAIL_LINK_KEY)
      if (storedLink && authModule.isFirebaseSignInLink(storedLink)) {
        console.log('🔗 Processing stored magic link from handler:', storedLink)
        await processMagicLink(container, storedLink)
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    if (!storedLink && urlParams.get('from') === 'email-link') {
      console.warn('⚠️ Returned from email link but no stored magic link was found. Showing helper UI.')
      showMagicLinkHelperPrompt(container)
      return
    }
    
    // Show email input form
    showEmailForm(container)
    
  } catch (error) {
    console.error('❌ Initialization error:', error)
    showErrorState(container, 'Failed to initialize authentication system.')
  }
}

function showEmailForm(container) {
  // Use Portuguese hardcoded text for auth portal
  const title = 'GrdlHub'
  const subtitle = 'Portal de Acesso Seguro'
  const signin = 'Entrar'
  const emailPrompt = 'Digite seu endereço de email para acessar o GrdlHub'
  const emailLabel = 'Endereço de Email'
  const emailPlaceholder = 'seu.email@exemplo.com'
  const signinButton = 'Entrar'
  const secureNote = '🔒 Autenticação segura baseada em email'
  
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">${title}</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">${subtitle}</p>
      
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">${signin}</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem;">${emailPrompt}</p>
      
      <form id="email-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label for="email-input" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">${emailLabel}</label>
          <input 
            type="email" 
            id="email-input" 
            placeholder="${emailPlaceholder}" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.3s ease; box-sizing: border-box;"
            required
          >
        </div>
        
        <button 
          type="submit" 
          id="submit-btn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease;"
        >
          ${signinButton}
        </button>
      </form>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">${secureNote}</p>
      </div>
    </div>
  `
  
  // Bind form submission
  const form = document.getElementById('email-form')
  if (form) {
    form.addEventListener('submit', handleEmailSubmit)
    console.log('✅ Email form ready')
  }
}

function showMagicLinkHelperPrompt(container) {
  const helperUrl = '/magic-link-helper.html'
  const debugUrl = '/cache-reset.html'

  container.innerHTML = `
    <div style="max-width: 480px; margin: 0 auto; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.15); text-align: left;">
      <h1 style="margin: 0 0 12px; color: #0d47a1; font-size: 1.85rem; font-weight: 600;">Precisamos do seu link</h1>
      <p style="margin: 0 0 24px; color: #4b5563; line-height: 1.6;">Não conseguimos completar o acesso automático porque o link seguro não chegou até aqui. Seguindo os passos abaixo, você conclui o acesso em poucos segundos:</p>

      <ol style="margin: 0 0 24px 20px; padding: 0; color: #374151; line-height: 1.6;">
        <li>Abra o e-mail que recebeu com o link de acesso.</li>
        <li>Copie o link inteiro (começa com <code>https://kgdmin.firebaseapp.com/__/auth/action...</code>).</li>
        <li>Cole o link na ferramenta “Abrir link seguro” abaixo.</li>
      </ol>

      <a href="${helperUrl}" style="display: inline-flex; align-items: center; gap: 10px; padding: 12px 18px; background: linear-gradient(135deg, #1976d2, #0d47a1); color: white; border-radius: 999px; text-decoration: none; font-weight: 600;">
        Abrir ferramenta “Abrir link seguro”
        <span aria-hidden="true">↗</span>
      </a>

      <div style="margin-top: 24px; padding: 16px; background: #e0f2fe; border-radius: 12px; color: #0c4a6e;">
        <strong>Dica:</strong> se já tentou antes, limpe os arquivos salvos clicando em
        <a href="${debugUrl}" style="color: #0d47a1; font-weight: 600;">Atualizar GrdlHub</a> em uma nova aba.
      </div>
    </div>
  `
}

function normalizeEmailLink(link) {
  try {
    const url = new URL(link)
    const mode = url.searchParams.get('mode')
    const oobCode = url.searchParams.get('oobCode')
    const apiKey = url.searchParams.get('apiKey')
    const languageCode = url.searchParams.get('lang') || url.searchParams.get('languageCode')
    const continueUrl = url.searchParams.get('continueUrl')

    if (!mode || !oobCode || !apiKey) {
      return link
    }

    const firebaseActionUrl = new URL('/__/auth/action', 'https://kgdmin.firebaseapp.com')
    firebaseActionUrl.searchParams.set('mode', mode)
    firebaseActionUrl.searchParams.set('oobCode', oobCode)
    firebaseActionUrl.searchParams.set('apiKey', apiKey)
    if (languageCode) {
      firebaseActionUrl.searchParams.set('lang', languageCode)
    }
    if (continueUrl) {
      firebaseActionUrl.searchParams.set('continueUrl', continueUrl)
    }

    return firebaseActionUrl.toString()
  } catch (error) {
    console.warn('⚠️ Failed to normalize magic link, using original.', error)
    return link
  }
}

async function handleEmailSubmit(e) {
  e.preventDefault()
  console.log('📧 Email submitted')
  
  if (!isReady || !authModule) {
    showErrorMessage('Authentication system not ready. Please refresh the page.')
    return
  }
  
  const emailInput = document.getElementById('email-input')
  const submitBtn = document.getElementById('submit-btn')
  const email = emailInput.value.trim().toLowerCase()
  
  if (!email) {
    showFieldError(emailInput, 'Email address is required')
    return
  }
  
  if (!isValidEmail(email)) {
    showFieldError(emailInput, 'Please enter a valid email address')
    return
  }
  
  // Set loading state
  submitBtn.disabled = true
  submitBtn.textContent = 'Checking...'
  
  try {
    console.log('🔍 Checking if email exists in users collection:', email)
    
    // Check if email exists in users collection
    const emailExists = await authModule.isEmailPreApproved(email)
    console.log('✅ Email check result:', emailExists)
    
    if (emailExists) {
      // Email exists - send magic link
      console.log('📧 Sending sign-in link to:', email)
      const result = await authModule.sendFirebaseSignInLink(email)
      
      if (result.success) {
        showEmailSent(email)
      } else {
        throw new Error(result.error || 'Failed to send sign-in link')
      }
    } else {
      // Email does not exist
      showEmailNotRecognized(email)
    }
    
  } catch (error) {
    console.error('❌ Email submission error:', error)
    showFieldError(emailInput, 'Unable to process request. Please try again.')
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Sign In'
  }
}

function showEmailSent(email) {
  const container = document.getElementById('auth-container')
  
  // Use hardcoded Portuguese text for reliable experience
  const title = 'GrdlHub'
  const checkEmail = 'Verifique seu Email'
  const linkSent = 'Link de Acesso Enviado'
  const sentTo = 'Enviamos um link de acesso seguro para:'
  const nextSteps = 'Próximos Passos:'
  const step1 = 'Verifique sua caixa de entrada (e pasta de spam)'
  const step2 = 'Clique no link de acesso'
  const step3 = 'Você será conectado automaticamente'
  const tryDifferent = 'Tentar Email Diferente'
  
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">${title}</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">${checkEmail}</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">📧</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">${linkSent}</h2>
      <p style="margin: 0 0 8px 0; color: #757575;">${sentTo}</p>
      <p style="margin: 0 0 24px 0; color: #1976d2; font-weight: 600;">${email}</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #e3f2fd; border-radius: 8px; text-align: left;">
        <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 1rem;">${nextSteps}</h3>
        <ol style="margin: 0; padding-left: 20px; color: #424242; font-size: 0.875rem;">
          <li>${step1}</li>
          <li>${step2}</li>
          <li>${step3}</li>
        </ol>
      </div>
      
      <button onclick="location.reload()" style="padding: 8px 16px; background: #e0e0e0; color: #424242; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
        ${tryDifferent}
      </button>
    </div>
  `
}

function showEmailNotRecognized(email) {
  const container = document.getElementById('auth-container')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Access Restricted</p>
      
      <div style="font-size: 3rem; margin: 0 0 16px 0;">🚫</div>
      <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 1.25rem; font-weight: 500;">Email Not Recognized</h2>
      <p style="margin: 0 0 24px 0; color: #757575;">The email address <strong>${email}</strong> is not recognized.</p>
      
      <div style="margin: 24px 0; padding: 16px; background: #fff3e0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #f57c00; font-size: 1rem;">Need Access?</h3>
        <p style="margin: 0; color: #424242; font-size: 0.875rem;"><strong>Please contact the administrator</strong> to request access to GrdlHub.</p>
      </div>
      
      <button onclick="location.reload()" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Try Different Email
      </button>
    </div>
  `
}

async function processMagicLink(container, linkOverride = null) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Signing you in...</p>
      <div style="color: #666;">Processing secure link...</div>
    </div>
  `
  
  try {
    // Get email from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const emailFromUrl = urlParams.get('email')
    const storedEmail = window.localStorage.getItem(STORED_EMAIL_KEY)
    const email = emailFromUrl || storedEmail || window.localStorage.getItem('emailForSignIn')
  const rawLink = linkOverride || window.localStorage.getItem(STORED_EMAIL_LINK_KEY) || window.location.href
  const linkToUse = normalizeEmailLink(rawLink)
    
    console.log('🔗 Processing magic link for email:', email)
    console.log('🔗 URL params:', Object.fromEntries(urlParams.entries()))
    console.log('🔗 Local storage email:', window.localStorage.getItem('emailForSignIn'))
    console.log('🔗 Stored handler email:', storedEmail)
    console.log('🔗 Link override?', !!linkOverride)
    console.log('🔗 Link to use for sign-in:', linkToUse)
    
    if (!email) {
      throw new Error('Email address required to complete sign-in')
    }
    
    // Sign in with magic link
    const result = await authModule.signInWithFirebaseLink(email, linkToUse)
    
    if (result.success) {
      console.log('✅ Magic link sign-in successful. Firebase user:', result.user?.email)
      clearPendingMagicLink()
      await showSignInSuccess(container)
    } else {
      throw new Error(result.error || 'Failed to complete sign-in')
    }
    
  } catch (error) {
    console.error('❌ Magic link error:', error)
    showMagicLinkError(container, error.message)
    clearPendingMagicLink()
  }
}

async function showSignInSuccess(container) {
  console.log('🚦 showSignInSuccess() called. Waiting for auth state confirmation...')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome!</p>
      <div style="color: #4caf50; margin-bottom: 16px;">✅ Sign-in successful!</div>
      <div style="color: #666;">Redirecting to GrdlHub...</div>
    </div>
  `
  
  // Wait for Firebase Auth state to fully propagate
  try {
    const { getAuth } = await import('firebase/auth')
    const auth = getAuth()
    console.log('🚦 Firebase auth instance ready. Current user at start:', auth.currentUser?.email)
    
    // Wait for auth state to be confirmed
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          console.log('✅ Auth state confirmed before redirect:', user.email)
          unsubscribe()
          resolve()
        }
      })
      
      // Failsafe: redirect after 3 seconds even if not confirmed
      setTimeout(() => {
        console.warn('⏱️ Auth state confirmation timed out after 3s. Proceeding with redirect.')
        unsubscribe()
        resolve()
      }, 3000)
    })
  } catch (error) {
    console.error('⚠️ Auth state check error:', error)
  }
  
  // Redirect to main app
  console.log('➡️ Redirecting to /index.html#home')
  window.location.href = '/index.html#home'
}

function clearPendingMagicLink() {
  try {
    window.localStorage.removeItem(STORED_EMAIL_LINK_KEY)
    window.localStorage.removeItem(STORED_EMAIL_KEY)
  } catch (error) {
    console.warn('⚠️ Failed to clear pending magic link storage keys:', error)
  }
}

async function showSignedInState(container) {
  console.log('🚦 showSignedInState() called. User already signed in, verifying state before redirect...')
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Welcome back!</p>
      <div style="color: #4caf50; margin-bottom: 16px;">✅ Already signed in</div>
      <div style="color: #666;">Redirecting to GrdlHub...</div>
    </div>
  `
  
  // Wait for Firebase Auth state to fully propagate
  try {
    const { getAuth } = await import('firebase/auth')
    const auth = getAuth()
    console.log('🚦 Current auth user before confirmation:', auth.currentUser?.email)
    
    // Wait for auth state to be confirmed
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          console.log('✅ Auth state confirmed for already signed-in user:', user.email)
          unsubscribe()
          resolve()
        }
      })
      
      // Failsafe: redirect after 2 seconds even if not confirmed
      setTimeout(() => {
        console.warn('⏱️ Auth state confirmation timed out after 2s (already signed-in path). Proceeding with redirect.')
        unsubscribe()
        resolve()
      }, 2000)
    })
  } catch (error) {
    console.error('⚠️ Auth state check error:', error)
  }
  
  // Redirect to main app
  console.log('➡️ Redirecting (already signed-in) to /index.html#home')
  clearPendingMagicLink()
  window.location.href = '/index.html#home'
}

function showMagicLinkError(container, errorMessage) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">Sign-in Error</p>
      <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828; margin-bottom: 16px;">
        <strong>Error:</strong> ${errorMessage}
      </div>
      <button onclick="location.href='/auth.html'" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Try Again
      </button>
    </div>
  `
}

function showErrorState(container, message) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
      <p style="margin: 0 0 32px 0; color: #757575; font-size: 1rem;">System Error</p>
      <div style="padding: 16px; background: #ffebee; border-radius: 8px; color: #c62828;">
        <strong>Error:</strong> ${message}<br>
        <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `
}

function showFieldError(field, message) {
  // Remove existing error
  const existingError = field.parentNode.querySelector('.field-error')
  if (existingError) existingError.remove()
  
  // Add error styling
  field.style.borderColor = '#f44336'
  
  // Add error message
  const errorDiv = document.createElement('div')
  errorDiv.className = 'field-error'
  errorDiv.style.cssText = 'color: #f44336; font-size: 0.875rem; margin-top: 4px;'
  errorDiv.textContent = message
  field.parentNode.appendChild(errorDiv)
  
  // Focus the field
  field.focus()
  
  // Remove error on input
  field.addEventListener('input', () => {
    field.style.borderColor = '#e0e0e0'
    const error = field.parentNode.querySelector('.field-error')
    if (error) error.remove()
  }, { once: true })
}

function showErrorMessage(message) {
  alert(message) // Simple fallback for errors
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}