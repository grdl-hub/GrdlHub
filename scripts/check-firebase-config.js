#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * Validates Firebase setup and identifies common issues
 */

import { config } from 'dotenv'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Load environment variables
config({ path: '.env.local' })

console.log('🔥 Firebase Configuration Checker\n')

// Check environment variables
console.log('📋 Checking environment variables...')
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
]

let envVarsOk = true
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`❌ Missing: ${varName}`)
    envVarsOk = false
  } else {
    console.log(`✅ Found: ${varName}`)
  }
})

if (!envVarsOk) {
  console.log('\n❌ Environment variables missing. Check your .env.local file.')
  process.exit(1)
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

try {
  console.log('\n🚀 Initializing Firebase...')
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  
  console.log('✅ Firebase initialized successfully')
  console.log(`✅ Project ID: ${firebaseConfig.projectId}`)
  console.log(`✅ Auth Domain: ${firebaseConfig.authDomain}`)
  
  console.log('\n📋 Configuration Summary:')
  console.log('─'.repeat(50))
  console.log(`Project ID: ${firebaseConfig.projectId}`)
  console.log(`Auth Domain: ${firebaseConfig.authDomain}`)
  console.log(`Current Domain: ${typeof window !== 'undefined' ? window.location.origin : 'localhost:5173 (dev)'}`)
  
  console.log('\n✅ Firebase configuration is valid!')
  
  console.log('\n📝 Next Steps to Fix auth/operation-not-allowed:')
  console.log('─'.repeat(50))
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/')
  console.log(`2. Select project: ${firebaseConfig.projectId}`)
  console.log('3. Go to Authentication → Sign-in method')
  console.log('4. Click on "Email/Password" provider')
  console.log('5. Enable "Email link (passwordless sign-in)" toggle')
  console.log('6. Click Save')
  console.log('7. Add authorized domains if needed (localhost for development)')
  
} catch (error) {
  console.log('❌ Firebase initialization failed:')
  console.error(error.message)
  
  if (error.code === 'app/invalid-api-key') {
    console.log('\n💡 Check your VITE_FIREBASE_API_KEY in .env.local')
  } else if (error.code === 'app/invalid-project-id') {
    console.log('\n💡 Check your VITE_FIREBASE_PROJECT_ID in .env.local')
  }
  
  process.exit(1)
}
