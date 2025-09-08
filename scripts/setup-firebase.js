#!/usr/bin/env node

/**
 * Firebase Configuration Helper for GrdlHub
 * Run this script to set up your Firebase configuration
 */

import { writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

console.log('🔥 Firebase Configuration Setup for GrdlHub')
console.log('===============================================\n')

console.log('📋 Before running this script, make sure you have:')
console.log('1. Created a Firebase project at https://console.firebase.google.com/')
console.log('2. Enabled Authentication (Email/Password provider)')
console.log('3. Created a Firestore database')
console.log('4. Added a web app to your Firebase project')
console.log('5. Copied your Firebase configuration object\n')

// Check if .env.local already exists
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  console.log('⚠️  .env.local file already exists!')
  console.log('Please edit it manually or delete it and run this script again.\n')
  process.exit(0)
}

console.log('📝 Please provide your Firebase configuration:')
console.log('(You can find this in Firebase Console > Project Settings > Your apps)\n')

// In a real implementation, you'd use a library like 'inquirer' for interactive prompts
// For now, we'll create the template file

const envTemplate = `# Firebase Configuration for GrdlHub
# Copy these values from your Firebase Console > Project Settings > Your apps

# Required Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Optional: Analytics (if you enabled Google Analytics)
# VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# App Configuration
VITE_APP_NAME=GrdlHub
VITE_APP_DESCRIPTION=Secure PWA Hub with Firebase Authentication

# Example Firebase config object from Firebase Console:
# const firebaseConfig = {
#   apiKey: "AIzaSyX...",
#   authDomain: "grdlhub-app.firebaseapp.com", 
#   projectId: "grdlhub-app",
#   storageBucket: "grdlhub-app.appspot.com",
#   messagingSenderId: "123456789",
#   appId: "1:123456789:web:abcdef..."
# };
`

try {
  writeFileSync(envPath, envTemplate)
  console.log('✅ Created .env.local file!')
  console.log('📍 Location:', envPath)
  console.log('\n📝 Next steps:')
  console.log('1. Edit .env.local and replace the placeholder values with your actual Firebase config')
  console.log('2. Save the file')
  console.log('3. Run: npm run dev')
  console.log('4. Check the browser console for any configuration errors\n')
  
  console.log('🔧 Firebase Console Setup Checklist:')
  console.log('□ Enable Email/Password authentication')
  console.log('□ Create Firestore database (start in test mode)')
  console.log('□ Set up Firestore security rules')
  console.log('□ Create preApprovedEmails collection')
  console.log('□ Add your first admin email to preApprovedEmails\n')
  
  console.log('📚 For detailed setup instructions, see: FIREBASE_SETUP.md')
  
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message)
  process.exit(1)
}
