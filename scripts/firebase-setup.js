// Firebase Setup and Initial Data Script
// Run this after configuring Firebase to create initial collections and admin user

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Setup functions
export async function createInitialAdminUser(email, password, displayName) {
  try {
    console.log('Creating admin user...')
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: displayName,
      email: email.toLowerCase(),
      role: 'admin',
      permissions: ['home', 'users', 'pages', 'content', 'settings'],
      emailVerified: false,
      isActive: true,
      createdAt: serverTimestamp(),
      lastSignIn: null,
      firebaseUid: user.uid
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('User ID:', user.uid)
    console.log('Email:', email)
    console.log('⚠️  Please verify email before full access')
    
    return { success: true, uid: user.uid }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    return { success: false, error: error.message }
  }
}

export async function addInitialPreApprovedEmails(emails) {
  try {
    console.log('Adding pre-approved emails...')
    
    for (const emailData of emails) {
      await addDoc(collection(db, 'preApprovedEmails'), {
        email: emailData.email.toLowerCase(),
        addedBy: emailData.addedBy || 'System',
        notes: emailData.notes || 'Initial setup',
        status: 'pending',
        createdAt: serverTimestamp()
      })
      console.log(`✅ Added: ${emailData.email}`)
    }
    
    console.log('✅ Pre-approved emails added successfully!')
    return { success: true }
  } catch (error) {
    console.error('❌ Error adding pre-approved emails:', error.message)
    return { success: false, error: error.message }
  }
}

export async function createInitialSettings() {
  try {
    console.log('Creating initial settings...')
    
    await setDoc(doc(db, 'settings', 'app'), {
      appName: 'GrdlHub',
      appDescription: 'A centralized PWA hub with multiple features',
      allowRegistration: true,
      requireEmailVerification: true,
      maxUsersPerRole: {
        admin: 10,
        user: 1000
      },
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Initial settings created!')
    return { success: true }
  } catch (error) {
    console.error('❌ Error creating settings:', error.message)
    return { success: false, error: error.message }
  }
}

// Example usage - uncomment and modify as needed
/*
// Run setup
async function runSetup() {
  try {
    // 1. Create admin user
    await createInitialAdminUser(
      'admin@yourdomain.com',
      'SecurePassword123!',
      'System Administrator'
    )
    
    // 2. Add pre-approved emails
    await addInitialPreApprovedEmails([
      { email: 'admin@yourdomain.com', notes: 'System admin' },
      { email: 'user1@yourdomain.com', notes: 'Initial user' },
      { email: 'user2@yourdomain.com', notes: 'Test account' }
    ])
    
    // 3. Create initial settings
    await createInitialSettings()
    
    console.log('🎉 Firebase setup complete!')
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

// Uncomment to run setup
// runSetup()
*/
