// Script to add pre-approved email directly to Firestore
// Run this in your browser console on your PWA site

import { db } from './src/auth.js'
import { collection, addDoc } from 'firebase/firestore'

async function addPreApprovedEmail() {
  try {
    const emailData = {
      email: 'nunomadureiratj@icloud.com',
      status: 'pending',
      addedBy: 'admin',
      dateAdded: new Date(),
      notes: 'Added for access'
    }
    
    const docRef = await addDoc(collection(db, 'preApprovedEmails'), emailData)
    console.log('✅ Email added with ID: ', docRef.id)
    
    // Also add to users collection for immediate access
    const userData = {
      email: 'nunomadureiratj@icloud.com',
      name: 'Nuno Madureira',
      congregation: '',
      role: 'user',
      permissions: [],
      status: 'invited',
      createdAt: new Date()
    }
    
    const userRef = await addDoc(collection(db, 'users'), userData)
    console.log('✅ User added with ID: ', userRef.id)
    
  } catch (error) {
    console.error('❌ Error adding email:', error)
  }
}

// Run the function
addPreApprovedEmail()
