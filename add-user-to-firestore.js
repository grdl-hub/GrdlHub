// Quick script to add user directly to Firestore users collection
// This will allow nunomadureiratj@icloud.com to authenticate

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// Your Firebase config (get from .env.local)
const firebaseConfig = {
  // Add your Firebase config here
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function addUserToCollection() {
  try {
    const userData = {
      email: 'nunomadureiratj@icloud.com',
      name: 'Nuno Madureira',
      congregation: '',
      role: 'user',
      permissions: [],
      status: 'active',
      createdAt: new Date(),
      isActive: true
    }
    
    const docRef = await addDoc(collection(db, 'users'), userData)
    console.log('✅ User added with ID:', docRef.id)
    console.log('User can now authenticate with:', userData.email)
    
  } catch (error) {
    console.error('❌ Error adding user:', error)
  }
}

addUserToCollection()
