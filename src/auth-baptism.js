// Baptism Date Authentication System
// Simple, secure authentication using email + baptism date verification
// No passwords required - uses session-based authentication

import { initializeStandaloneAuth } from './auth-standalone.js'
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore'

const db = getFirestore()

console.log('🔐 Baptism Date Auth Module Loaded')

// Session management functions
function setSessionUser(userData) {
  const sessionData = {
    email: userData.email,
    userId: userData.userId,
    name: userData.name,
    role: userData.role,
    authenticatedAt: new Date().toISOString()
  }
  sessionStorage.setItem('authUser', JSON.stringify(sessionData))
  localStorage.setItem('authUser', JSON.stringify(sessionData)) // Also save to localStorage for persistence
  console.log('✅ Session created for:', userData.email)
}

function getSessionUser() {
  // Check sessionStorage first, then localStorage
  const sessionData = sessionStorage.getItem('authUser') || localStorage.getItem('authUser')
  if (sessionData) {
    try {
      return JSON.parse(sessionData)
    } catch (e) {
      console.error('Error parsing session data:', e)
      return null
    }
  }
  return null
}

function clearSession() {
  sessionStorage.removeItem('authUser')
  localStorage.removeItem('authUser')
  console.log('🔓 Session cleared')
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

async function init() {
  console.log('🎨 Initializing Baptism Date Authentication...')
  
  const container = document.getElementById('auth-container')
  if (!container) {
    console.error('❌ auth-container not found!')
    return
  }
  
  // Initialize Firebase
  await initializeStandaloneAuth()
  
  // Check if user is already authenticated via session
  const sessionUser = getSessionUser()
  if (sessionUser) {
    console.log('✅ User already authenticated:', sessionUser.email)
    showAlreadySignedIn(container, sessionUser.email)
    return
  }
  
  // Show email + baptism date form
  showAuthForm(container)
}

function showAuthForm(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
        <p style="margin: 0; color: #757575; font-size: 1rem;">Portal de Acesso Seguro</p>
      </div>
      
      <h2 style="margin: 0 0 8px 0; color: #212121; font-size: 1.25rem; font-weight: 500; text-align: center;">Entrar</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem; text-align: center;">Digite seu email para começar</p>
      
      <form id="email-form">
        <div style="margin-bottom: 24px;">
          <label for="email" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Email</label>
          <input 
            type="email" 
            id="email" 
            placeholder="seu.email@exemplo.com" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;"
            required
            autocomplete="email"
            autofocus
          >
        </div>
        
        <button 
          type="submit" 
          id="submitBtn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.3s;"
        >
          Continuar
        </button>
      </form>
      
      <div id="errorMsg" style="display: none; margin-top: 16px; padding: 12px; background: #ffebee; border-radius: 8px; color: #c62828; font-size: 0.875rem;"></div>
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #757575; font-size: 0.875rem;">🔒 Autenticação segura baseada em verificação</p>
      </div>
    </div>
  `
  
  const form = document.getElementById('email-form')
  form.addEventListener('submit', handleEmailSubmit)
}

async function handleEmailSubmit(e) {
  e.preventDefault()
  
  const email = document.getElementById('email').value.trim()
  const submitBtn = document.getElementById('submitBtn')
  const errorMsg = document.getElementById('errorMsg')
  
  if (!email) {
    showError(errorMsg, 'Por favor, digite seu email.')
    return
  }
  
  // Disable form
  submitBtn.disabled = true
  submitBtn.textContent = 'Verificando...'
  submitBtn.style.background = '#999'
  errorMsg.style.display = 'none'
  
  try {
    console.log('🔍 Checking if email exists...', email)
    
    // Check if user exists in Firestore
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email.toLowerCase()))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      showError(errorMsg, 'Email não encontrado. Entre em contato com o administrador.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Continuar'
      submitBtn.style.background = '#1976d2'
      return
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    console.log('✅ Email found:', userData.email)
    
    // Check if baptism date exists
    const storedDate = userData.baptismDate || userData.BaptismDate
    
    if (!storedDate) {
      showError(errorMsg, 'Data de batismo não configurada. Entre em contato com o administrador.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Continuar'
      submitBtn.style.background = '#1976d2'
      return
    }
    
    // Email is valid, show baptism date form
    console.log('✅ Moving to baptism date verification')
    showBaptismDateForm(document.getElementById('auth-container'), email, userDoc.id, userData)
    
  } catch (error) {
    console.error('❌ Error:', error)
    showError(errorMsg, 'Erro ao verificar email: ' + error.message)
    submitBtn.disabled = false
    submitBtn.textContent = 'Continuar'
    submitBtn.style.background = '#1976d2'
  }
}

function showBaptismDateForm(container, email, userId, userData) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
        <p style="margin: 0; color: #757575; font-size: 1rem;">Verificação de Identidade</p>
      </div>
      
      <div style="margin-bottom: 24px; padding: 12px; background: #e3f2fd; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #1976d2; font-size: 0.875rem; font-weight: 500;">📧 ${email}</p>
      </div>
      
      <h2 style="margin: 0 0 8px 0; color: #212121; font-size: 1.25rem; font-weight: 500; text-align: center;">Data de Batismo</h2>
      <p style="margin: 0 0 24px 0; color: #757575; font-size: 0.875rem; text-align: center;">Por favor, digite sua data de batismo</p>
      
      <form id="baptism-form">
        <div style="margin-bottom: 24px;">
          <label for="baptismDate" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Data de Batismo</label>
          <input 
            type="date" 
            id="baptismDate" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;"
            required
            autofocus
          >
        </div>
        
        <button 
          type="submit" 
          id="submitBtn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.3s; margin-bottom: 12px;"
        >
          Verificar
        </button>
        
        <button 
          type="button" 
          id="backBtn"
          style="width: 100%; padding: 12px; background: transparent; color: #1976d2; border: 1px solid #1976d2; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.3s;"
        >
          ← Voltar
        </button>
      </form>
      
      <div id="errorMsg" style="display: none; margin-top: 16px; padding: 12px; background: #ffebee; border-radius: 8px; color: #c62828; font-size: 0.875rem;"></div>
    </div>
  `
  
  const form = document.getElementById('baptism-form')
  const backBtn = document.getElementById('backBtn')
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await handleBaptismDateSubmit(e, email, userId, userData)
  })
  
  backBtn.addEventListener('click', () => {
    console.log('🔙 Going back to email form')
    showAuthForm(container)
  })
}

async function handleBaptismDateSubmit(e, email, userId, userData) {
  const baptismDate = document.getElementById('baptismDate').value
  const submitBtn = document.getElementById('submitBtn')
  const errorMsg = document.getElementById('errorMsg')
  
  if (!baptismDate) {
    showError(errorMsg, 'Por favor, digite a data de batismo.')
    return
  }
  
  submitBtn.disabled = true
  submitBtn.textContent = 'Verificando...'
  submitBtn.style.background = '#999'
  errorMsg.style.display = 'none'
  
  try {
    console.log('🔍 Verifying baptism date...', baptismDate)
    
    // Get stored baptism date
    const storedDate = userData.baptismDate || userData.BaptismDate
    
    // Normalize dates for comparison
    const normalizeDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toISOString().split('T')[0] // YYYY-MM-DD
    }
    
    const storedDateNormalized = normalizeDate(storedDate)
    const inputDateNormalized = normalizeDate(baptismDate)
    
    console.log('🔍 Comparing dates:', storedDateNormalized, '===', inputDateNormalized)
    
    if (storedDateNormalized !== inputDateNormalized) {
      showError(errorMsg, 'Data de batismo incorreta. Por favor, tente novamente.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Verificar'
      submitBtn.style.background = '#1976d2'
      return
    }
    
    console.log('✅ Baptism date verified!')
    
    // Automatically authenticate user with session
    await autoSignInUser(document.getElementById('auth-container'), email, userId, userData)
    
  } catch (error) {
    console.error('❌ Error:', error)
    showError(errorMsg, 'Erro ao verificar: ' + error.message)
    submitBtn.disabled = false
    submitBtn.textContent = 'Verificar'
    submitBtn.style.background = '#1976d2'
  }
}

async function autoSignInUser(container, email, userId, userData) {
  console.log('🔐 Session-based authentication starting...')
  
  // Show loading state
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <div style="margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; border: 4px solid #e3f2fd; border-top-color: #1976d2; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
      </div>
      <h2 style="margin: 0 0 8px 0; color: #1976d2; font-size: 1.5rem;">Autenticando...</h2>
      <p style="margin: 0; color: #757575;">Por favor, aguarde</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `
  
  try {
    // Update last login timestamp in Firestore
    await setDoc(doc(db, 'users', userId), {
      lastLogin: serverTimestamp()
    }, { merge: true })
    
    console.log('✅ User record updated with last login')
    
    // Create session with user data
    setSessionUser({
      email: userData.email,
      userId: userId,
      name: userData.name,
      role: userData.role
    })
    
    console.log('✅ Session created successfully!')
    
    // Show success and redirect
    showSuccess(container)
    
  } catch (error) {
    console.error('❌ Error during authentication:', error)
    
    container.innerHTML = `
      <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 64px; height: 64px; background: #ffebee; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">❌</span>
          </div>
        </div>
        <h2 style="margin: 0 0 16px 0; color: #c62828; text-align: center; font-size: 1.5rem;">Erro</h2>
        <p style="margin: 0 0 24px 0; color: #212121; text-align: center;">Erro ao autenticar: ${error.message}</p>
        <button 
          onclick="location.reload()" 
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer;"
        >
          Tentar Novamente
        </button>
      </div>
    `
  }
}

function showPasswordSetup(container, email, userId, userData) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
        <p style="margin: 0; color: #757575; font-size: 1rem;">Criar Senha</p>
      </div>
      
      <p style="margin: 0 0 24px 0; color: #212121; font-size: 0.875rem; text-align: center;">Bem-vindo! Por favor, crie uma senha para sua conta.</p>
      
      <form id="password-setup-form">
        <div style="margin-bottom: 16px;">
          <label for="password" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Nova Senha</label>
          <input 
            type="password" 
            id="password" 
            placeholder="Mínimo 6 caracteres" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;"
            required
            minlength="6"
          >
        </div>
        
        <div style="margin-bottom: 24px;">
          <label for="passwordConfirm" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Confirmar Senha</label>
          <input 
            type="password" 
            id="passwordConfirm" 
            placeholder="Digite a senha novamente" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;"
            required
            minlength="6"
          >
        </div>
        
        <button 
          type="submit" 
          id="submitBtn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer;"
        >
          Criar Conta e Entrar
        </button>
      </form>
      
      <div id="errorMsg" style="display: none; margin-top: 16px; padding: 12px; background: #ffebee; border-radius: 8px; color: #c62828; font-size: 0.875rem;"></div>
    </div>
  `
  
  const form = document.getElementById('password-setup-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('passwordConfirm').value
    const submitBtn = document.getElementById('submitBtn')
    const errorMsg = document.getElementById('errorMsg')
    
    if (password !== passwordConfirm) {
      showError(errorMsg, 'As senhas não coincidem.')
      return
    }
    
    if (password.length < 6) {
      showError(errorMsg, 'A senha deve ter no mínimo 6 caracteres.')
      return
    }
    
    submitBtn.disabled = true
    submitBtn.textContent = 'Criando conta...'
    submitBtn.style.background = '#999'
    errorMsg.style.display = 'none'
    
    try {
      console.log('🔐 Creating Firebase account...')
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log('✅ Account created:', user.uid)
      
      // Update Firestore with Firebase UID
      await setDoc(doc(db, 'users', userId), {
        firebaseUid: user.uid,
        accountCreated: true,
        createdAt: serverTimestamp()
      }, { merge: true })
      
      console.log('✅ User document updated')
      
      showSuccess(container)
      
    } catch (error) {
      console.error('❌ Error:', error)
      showError(errorMsg, 'Erro ao criar conta: ' + error.message)
      submitBtn.disabled = false
      submitBtn.textContent = 'Criar Conta e Entrar'
      submitBtn.style.background = '#1976d2'
    }
  })
}

function showPasswordForm(container, email, userData) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0 0 8px 0; color: #1976d2; font-size: 2rem; font-weight: 600;">GrdlHub</h1>
        <p style="margin: 0; color: #757575; font-size: 1rem;">Entrar</p>
      </div>
      
      <p style="margin: 0 0 24px 0; color: #212121; font-size: 0.875rem; text-align: center;">Digite sua senha para continuar</p>
      
      <form id="password-form">
        <div style="margin-bottom: 24px;">
          <label for="password" style="display: block; margin-bottom: 8px; color: #424242; font-weight: 500; font-size: 0.875rem;">Senha</label>
          <input 
            type="password" 
            id="password" 
            placeholder="Sua senha" 
            style="width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;"
            required
          >
        </div>
        
        <button 
          type="submit" 
          id="submitBtn"
          style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer;"
        >
          Entrar
        </button>
      </form>
      
      <div id="errorMsg" style="display: none; margin-top: 16px; padding: 12px; background: #ffebee; border-radius: 8px; color: #c62828; font-size: 0.875rem;"></div>
    </div>
  `
  
  const form = document.getElementById('password-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const password = document.getElementById('password').value
    const submitBtn = document.getElementById('submitBtn')
    const errorMsg = document.getElementById('errorMsg')
    
    submitBtn.disabled = true
    submitBtn.textContent = 'Entrando...'
    submitBtn.style.background = '#999'
    errorMsg.style.display = 'none'
    
    try {
      console.log('🔐 Signing in...')
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log('✅ Signed in:', user.uid)
      
      // Update last sign in
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('firebaseUid', '==', user.uid))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        await setDoc(doc(db, 'users', userDoc.id), {
          lastSignIn: serverTimestamp()
        }, { merge: true })
      }
      
      showSuccess(container)
      
    } catch (error) {
      console.error('❌ Error:', error)
      showError(errorMsg, 'Senha incorreta. Tente novamente.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Entrar'
      submitBtn.style.background = '#1976d2'
    }
  })
}

function showSuccess(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 72px; margin-bottom: 16px;">✅</div>
      <h2 style="margin: 0 0 16px 0; color: #4caf50; font-size: 1.5rem; font-weight: 600;">Sucesso!</h2>
      <p style="margin: 0; color: #757575;">Redirecionando para o GrdlHub...</p>
    </div>
  `
  
  setTimeout(() => {
    window.location.href = '/'
  }, 2000)
}

function showAlreadySignedIn(container, email) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 72px; margin-bottom: 16px;">✅</div>
      <h2 style="margin: 0 0 8px 0; color: #4caf50; font-size: 1.5rem; font-weight: 600;">Já está autenticado!</h2>
      <p style="margin: 0 0 16px 0; color: #757575;">${email}</p>
      <p style="margin: 0; color: #757575;">Redirecionando para o GrdlHub...</p>
    </div>
  `
  
  setTimeout(() => {
    window.location.href = '/'
  }, 1500)
}

function showError(errorDiv, message) {
  errorDiv.textContent = message
  errorDiv.style.display = 'block'
}
