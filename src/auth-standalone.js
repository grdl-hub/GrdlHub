// Standalone Authentication Module
// This module is completely independent from the main app for security

import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional
}

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Please check your .env.local file.')
  throw new Error('Firebase configuration is incomplete. Check console for details.')
}

// Initialize Firebase for auth only
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Export db for other modules that need Firestore access
export { db }

// Auth state management
let authStateInitialized = false
let currentAuthUser = null

// Initialize standalone auth module
export async function initializeStandaloneAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      currentAuthUser = user
      if (!authStateInitialized) {
        authStateInitialized = true
        resolve(user)
        // Keep listening for auth state changes for sign-in flows
      }
    })
    
    // Store the unsubscribe function so we can clean up later if needed
    window._authUnsubscribe = unsubscribe
  })
}

// Get current authenticated user (minimal exposure)
export function getCurrentAuthUser() {
  return currentAuthUser
}

// Check if user is invited (secure check)
export async function checkUserInviteStatus(email) {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email.toLowerCase()))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return { invited: false, message: 'Email not found in authorized users list' }
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    // Check if user already has an account
    if (userData.accountCreated) {
      return { 
        invited: true, 
        hasAccount: true, 
        message: 'Account already exists. Please sign in.' 
      }
    }
    
    return { 
      invited: true, 
      hasAccount: false, 
      userId: userDoc.id,
      userData: userData,
      message: 'Invitation found. Creating secure access link...' 
    }
  } catch (error) {
    console.error('Error checking invite status:', error)
    return { invited: false, message: 'Error checking invitation status' }
  }
}

// Generate secure invite token (server-side in production)
export function generateSecureInviteToken(userId, email) {
  // In production, this should be generated server-side with proper crypto
  const timestamp = Date.now()
  const payload = btoa(JSON.stringify({ userId, email, timestamp }))
  const signature = btoa(`${userId}-${email}-${timestamp}`) // Simplified for demo
  return `${payload}.${signature}`
}

// Validate invite token
export function validateInviteToken(token) {
  try {
    const [payload, signature] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    
    // Check if token is not older than 24 hours
    const tokenAge = Date.now() - decoded.timestamp
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return { valid: false, reason: 'Token expired' }
    }
    
    // Validate signature (simplified for demo)
    const expectedSignature = btoa(`${decoded.userId}-${decoded.email}-${decoded.timestamp}`)
    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid token signature' }
    }
    
    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, reason: 'Malformed token' }
  }
}

// Create user account from invite
export async function createAccountFromInvite(token, password, displayName) {
  try {
    const tokenValidation = validateInviteToken(token)
    if (!tokenValidation.valid) {
      throw new Error(tokenValidation.reason)
    }
    
    const { userId, email } = tokenValidation.data
    
    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Send email verification
    await sendEmailVerification(user)
    
    // Update user document
    await setDoc(doc(db, 'users', userId), {
      accountCreated: true,
      firebaseUid: user.uid,
      displayName: displayName,
      emailVerified: false,
      createdAt: serverTimestamp(),
      lastSignIn: null
    }, { merge: true })
    
    return { success: true, user: user }
  } catch (error) {
    console.error('Error creating account:', error)
    throw error
  }
}

// Sign in user
export async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
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
    
    return { success: true, user: user }
  } catch (error) {
    console.error('Error signing in:', error)
    throw error
  }
}

// Sign out user
export async function signOutUser() {
  try {
    await firebaseSignOut(auth)
    currentAuthUser = null
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

// Check if email exists in users collection
export async function isEmailPreApproved(email) {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email.toLowerCase()))
    const snapshot = await getDocs(q)
    
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking email in users collection:', error)
    return false
  }
}

// Enhanced registration with email verification
export async function registerWithPreApprovedEmail(email, password, displayName) {
  try {
    // First check if email exists in users collection
    const isPreApproved = await isEmailPreApproved(email)
    if (!isPreApproved) {
      throw new Error('This email is not authorized for registration. Please contact an administrator.')
    }
    
    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Send email verification
    await sendEmailVerification(user)
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName,
      email: email.toLowerCase(),
      role: 'user', // Default role
      emailVerified: false,
      isActive: true,
      createdAt: serverTimestamp(),
      lastSignIn: null,
      firebaseUid: user.uid
    })
    
    return { success: true, user: user }
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

// Firebase Sign-In Link Functions (Native Firebase Auth)

export async function sendFirebaseSignInLink(email) {
  try {
    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this URL
      // must be in the authorized domains list in the Firebase Console.
      url: `${window.location.origin}/auth.html?email=${encodeURIComponent(email)}`,
      // This must be true.
      handleCodeInApp: true,
    }

    await sendSignInLinkToEmail(auth, email, actionCodeSettings)
    
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device.
    window.localStorage.setItem('emailForSignIn', email)
    
    console.log('✅ Firebase sign-in link sent successfully to:', email)
    return { success: true, message: 'Sign-in link sent successfully!' }
  } catch (error) {
    console.error('❌ Error sending sign-in link:', error)
    
    // Provide specific error messages for common issues
    let userMessage = error.message
    if (error.code === 'auth/operation-not-allowed') {
      userMessage = '🚨 Firebase Setup Required: Email link sign-in is not enabled.\n\n' +
                   '✅ Quick Fix:\n' +
                   '1. Go to Firebase Console → Authentication → Sign-in method\n' +
                   '2. Click "Email/Password" provider → Edit\n' +
                   '3. Enable "Email link (passwordless sign-in)" toggle\n' +
                   '4. Save changes\n\n' +
                   'Note: This is separate from regular Email/Password authentication!'
    } else if (error.code === 'auth/invalid-email') {
      userMessage = 'Please enter a valid email address.'
    } else if (error.code === 'auth/unauthorized-domain') {
      userMessage = '🚨 Domain not authorized. Add this domain to Firebase Console → Authentication → Settings → Authorized domains'
    } else if (error.code === 'auth/too-many-requests') {
      userMessage = 'Too many requests. Please try again in a few minutes.'
    }
    
    return { success: false, error: userMessage }
  }
}

export async function signInWithFirebaseLink(email, link) {
  try {
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.
    const emailFromStorage = window.localStorage.getItem('emailForSignIn')
    const emailToUse = email || emailFromStorage
    
    if (!emailToUse) {
      throw new Error('Email address is required to complete sign-in')
    }

    // The client SDK will parse the code from the link for you.
    const result = await signInWithEmailLink(auth, emailToUse, link)
    
    // Clear email from storage.
    window.localStorage.removeItem('emailForSignIn')
    
    // Update the current user state immediately
    currentAuthUser = result.user
    console.log('✅ User signed in via Firebase link:', result.user.email)
    
    // Create user document if it doesn't exist
    await createUserDocument(result.user, emailToUse)
    
    return { success: true, user: result.user }
  } catch (error) {
    console.error('Error signing in with email link:', error)
    return { success: false, error: error.message }
  }
}

export function isFirebaseSignInLink(link) {
  return isSignInWithEmailLink(auth, link || window.location.href)
}

async function createUserDocument(firebaseUser, email) {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      // Check if this email exists in users collection and get user data
      const userData = await getUserDataByEmail(email)
      
      await setDoc(userRef, {
        email: email.toLowerCase(),
        name: userData?.name || 'User',
        role: userData?.role || 'user',
        permissions: userData?.permissions || ['home', 'content'],
        status: 'active',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        firebaseUid: firebaseUser.uid
      })
    } else {
      // Update last login time for existing user
      await setDoc(userRef, {
        lastLogin: serverTimestamp()
      }, { merge: true })
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error)
    // Don't throw - user is still authenticated even if document update fails
  }
}

async function getUserDataByEmail(email) {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email.toLowerCase()))
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data()
    }
    return null
  } catch (error) {
    console.error('Error getting user data by email:', error)
    return null
  }
}

// Security utilities
export const SecurityUtils = {
  // Clear sensitive data from memory
  clearAuthData() {
    currentAuthUser = null
  },
  
  // Check if running in secure context
  isSecureContext() {
    return window.isSecureContext || location.protocol === 'https:'
  },
  
  // Generate secure random string
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

// Export only necessary functions for main app
export const AuthAPI = {
  initializeStandaloneAuth,
  getCurrentAuthUser,
  signOutUser,
  isEmailPreApproved,
  registerWithPreApprovedEmail,
  SecurityUtils,
  sendFirebaseSignInLink,
  signInWithFirebaseLink,
  isFirebaseSignInLink
}
