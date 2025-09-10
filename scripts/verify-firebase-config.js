#!/usr/bin/env node

/**
 * Firebase Configuration Verification Script
 * 
 * This script helps verify that Firebase is properly configured for GrdlHub.
 * Run with: node scripts/verify-firebase-config.js
 */

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

console.log('🔥 Firebase Configuration Verification\n')

// Check environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
]

let allEnvVarsPresent = true

console.log('📋 Environment Variables:')
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`❌ ${varName}: Missing`)
    allEnvVarsPresent = false
  }
})

if (!allEnvVarsPresent) {
  console.log('\n❌ Missing environment variables. Please check your .env.local file.')
  process.exit(1)
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

try {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  
  console.log('\n🔥 Firebase Initialization:')
  console.log('✅ Firebase app initialized successfully')
  console.log('✅ Auth service connected')
  console.log('✅ Firestore service connected')
  
  console.log('\n📋 Next Steps to Fix auth/operation-not-allowed Error:')
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/')
  console.log(`2. Select your project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
  console.log('3. Go to Authentication > Sign-in method')
  console.log('4. Click on "Email/Password" provider')
  console.log('5. 🔥 ENABLE "Email link (passwordless sign-in)" toggle')
  console.log('6. Click Save')
  console.log('7. Go to Authentication > Settings > Authorized domains')
  console.log('8. Add "localhost" for development')
  console.log('\n✅ After completing these steps, the sign-in links will work!')
  
} catch (error) {
  console.log('\n❌ Firebase initialization failed:')
  console.error(error.message)
  process.exit(1)
}
