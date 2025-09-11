import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore'
import { showNotification } from './utils/notifications.js'

// Firebase configuration - Using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Please check your .env.local file.')
  throw new Error('Firebase configuration is incomplete.')
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Export db for use in other modules
export { db }

// Initialize authentication
export async function initializeAuth() {
  try {
    // Set up auth form handling
    setupAuthForm()
    // Check for invite links on page load
    checkInviteLink()
    console.log('Firebase Auth initialized')
  } catch (error) {
    console.error('Error initializing auth:', error)
    throw error
  }
}

// Auth form handling - invite-only access
function setupAuthForm() {
  const authForm = document.getElementById('auth-form')
  const authResult = document.getElementById('auth-result')
  
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const email = document.getElementById('auth-email').value
    await checkUserInviteStatus(email)
  })
}

// Check if user has been invited and handle accordingly
export async function checkUserInviteStatus(email) {
  try {
    showAuthLoading(true)
    
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const querySnapshot = await getDocs(q)
    
    const authResult = document.getElementById('auth-result')
    authResult.classList.remove('hidden')
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      
      if (userData.status === 'active') {
        // User is already active - they can use their existing credentials
        showAuthResult('success', 'You already have access!', 
          'You can sign in with your existing credentials. If you forgot your password, contact an administrator.')
      } else if (userData.status === 'invited') {
        // User has been invited but hasn't completed setup
        await sendInviteLink(email, userDoc.id)
        showAuthResult('info', 'Invite sent!', 
          'Check your email for an invite link to complete your account setup.')
      } else {
        // User exists but disabled
        showAuthResult('warning', 'Account disabled', 
          'Your account has been disabled. Contact an administrator for assistance.')
      }
    } else {
      // User not found in system
      showAuthResult('error', 'Email not found', 
        'Your email is not in our system. Contact an administrator to request access.')
    }
    
    showAuthLoading(false)
  } catch (error) {
    console.error('Error checking user invite status:', error)
    showAuthResult('error', 'Error occurred', 'Please try again or contact support.')
    showAuthLoading(false)
  }
}

// Send invite link to user
export async function sendInviteLink(email, userId) {
  try {
    // Generate invite link
    const inviteToken = generateInviteToken()
    const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${userId}&token=${inviteToken}`
    
    // Update user with invite token
    await setDoc(doc(db, 'users', userId), {
      inviteToken,
      inviteExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      inviteSentAt: new Date()
    }, { merge: true })
    
    // In a real app, you'd send this via email service
    // For now, we'll show it to the user
    console.log('Invite link:', inviteLink)
    
    showNotification('Invite link generated successfully', 'success')
    
    return inviteLink
  } catch (error) {
    console.error('Error sending invite link:', error)
    throw error
  }
}

// Generate invite token
function generateInviteToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Check for invite link on page load
function checkInviteLink() {
  const urlParams = new URLSearchParams(window.location.search)
  const inviteUserId = urlParams.get('invite')
  const inviteToken = urlParams.get('token')
  
  if (inviteUserId && inviteToken) {
    handleInviteLink(inviteUserId, inviteToken)
  }
}

// Handle invite link activation
async function handleInviteLink(userId, token) {
  try {
    showAuthLoading(true)
    
    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (!userDoc.exists()) {
      showAuthResult('error', 'Invalid invite', 'This invite link is not valid.')
      return
    }
    
    const userData = userDoc.data()
    
    // Check token and expiration
    if (userData.inviteToken !== token) {
      showAuthResult('error', 'Invalid invite', 'This invite link is not valid.')
      return
    }
    
    if (userData.inviteExpires && userData.inviteExpires.toDate() < new Date()) {
      showAuthResult('error', 'Invite expired', 'This invite link has expired. Request a new one.')
      return
    }
    
    // Show account setup form
    showAccountSetupForm(userId, userData)
    
  } catch (error) {
    console.error('Error handling invite link:', error)
    showAuthResult('error', 'Error occurred', 'Failed to process invite link.')
  } finally {
    showAuthLoading(false)
  }
}

// Show account setup form for invited users
function showAccountSetupForm(userId, userData) {
  const authResult = document.getElementById('auth-result')
  
  authResult.innerHTML = `
    <div class="account-setup">
      <h3>Complete Your Account Setup</h3>
      <p>Welcome ${userData.name || userData.email}! Create your password to access the system.</p>
      
      <form id="setup-form" class="setup-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" value="${userData.email}" disabled class="form-input">
        </div>
        
        <div class="form-group">
          <label for="setup-name" class="form-label">Full Name</label>
          <input type="text" id="setup-name" value="${userData.name || ''}" class="form-input" required>
        </div>
        
        <div class="form-group">
          <label for="setup-password" class="form-label">Password</label>
          <input type="password" id="setup-password" class="form-input" required minlength="6" placeholder="Choose a secure password">
        </div>
        
        <div class="form-group">
          <label for="setup-confirm" class="form-label">Confirm Password</label>
          <input type="password" id="setup-confirm" class="form-input" required minlength="6" placeholder="Confirm your password">
        </div>
        
        <button type="submit" class="btn btn-primary">Complete Setup</button>
      </form>
    </div>
  `
  
  authResult.classList.remove('hidden')
  
  // Handle setup form submission
  const setupForm = document.getElementById('setup-form')
  setupForm.addEventListener('submit', (e) => {
    e.preventDefault()
    completeAccountSetup(userId, e.target)
  })
}

// Complete account setup
async function completeAccountSetup(userId, form) {
  try {
    const formData = new FormData(form)
    const name = formData.get('setup-name') || document.getElementById('setup-name').value
    const password = formData.get('setup-password').value
    const confirmPassword = formData.get('setup-confirm').value
    
    // Validate passwords match
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error')
      return
    }
    
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error')
      return
    }
    
    showAuthLoading(true)
    
    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId))
    const userData = userDoc.data()
    
    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password)
    const user = userCredential.user
    
    // Update profile
    await updateProfile(user, { displayName: name })
    
    // Update user document
    await setDoc(doc(db, 'users', userId), {
      name,
      status: 'active',
      activatedAt: new Date(),
      firebaseUid: user.uid,
      // Remove invite tokens
      inviteToken: null,
      inviteExpires: null
    }, { merge: true })
    
    showNotification('Account setup complete! Welcome to GrdlHub!', 'success')
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname)
    
    // User will be redirected by auth state observer
    
  } catch (error) {
    console.error('Error completing account setup:', error)
    let errorMessage = 'Failed to complete setup'
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists. Try signing in instead.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please choose a stronger password.'
    }
    
    showNotification(errorMessage, 'error')
  } finally {
    showAuthLoading(false)
  }
}

// Sign in user
export async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Update user data in Firestore
    await updateUserLoginTime(user.uid)
    
    showNotification('Signed in successfully!', 'success')
    return user
  } catch (error) {
    console.error('Sign in error:', error)
    let errorMessage = 'Failed to sign in'
    
    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password'
        break
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled'
        break
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later'
        break
    }
    
    showNotification(errorMessage, 'error')
    throw error
  }
}

// Sign up user (for invite system)
export async function signUpUser(email, password, userData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Update user profile
    if (userData.name) {
      await updateProfile(user, { displayName: userData.name })
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name: userData.name || '',
      role: userData.role || 'user',
      permissions: userData.permissions || ['home', 'appointments', 'content'],
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date()
    })
    
    showNotification('Account created successfully!', 'success')
    return user
  } catch (error) {
    console.error('Sign up error:', error)
    let errorMessage = 'Failed to create account'
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already in use'
        break
      case 'auth/weak-password':
        errorMessage = 'Password is too weak'
        break
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
    }
    
    showNotification(errorMessage, 'error')
    throw error
  }
}

// Update user login time
async function updateUserLoginTime(userId) {
  try {
    await setDoc(doc(db, 'users', userId), {
      lastLogin: new Date()
    }, { merge: true })
  } catch (error) {
    console.error('Error updating login time:', error)
  }
}

// Sign out user
export async function signOut() {
  try {
    await firebaseSignOut(auth)
    showNotification('Signed out successfully', 'success')
  } catch (error) {
    console.error('Sign out error:', error)
    showNotification('Error signing out', 'error')
    throw error
  }
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser
}

// Auth state observer
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// Get user data from Firestore
export async function getUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data()
    }
    return null
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

// Create user invite
export async function createUserInvite(userData) {
  try {
    // Add to users collection with pending status
    const userRef = doc(collection(db, 'users'))
    await setDoc(userRef, {
      ...userData,
      status: 'invited',
      inviteId: userRef.id,
      invitedAt: new Date()
    })
    
    return userRef.id
  } catch (error) {
    console.error('Error creating user invite:', error)
    throw error
  }
}

// Helper functions for auth UI

// Show auth result message
function showAuthResult(type, title, message) {
  const authResult = document.getElementById('auth-result')
  
  authResult.innerHTML = `
    <div class="auth-result-content auth-result-${type}">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `
  
  authResult.classList.remove('hidden')
}

// Show/hide auth loading state
function showAuthLoading(show) {
  const submitBtn = document.getElementById('auth-submit-btn')
  const authForm = document.getElementById('auth-form')
  
  if (show) {
    submitBtn.textContent = 'Checking...'
    submitBtn.disabled = true
    authForm.style.opacity = '0.6'
  } else {
    submitBtn.textContent = 'Check Access'
    submitBtn.disabled = false
    authForm.style.opacity = '1'
  }
}
