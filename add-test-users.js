// Script to add test users to Firestore
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDUD1OsgbhwD-w_C6YwKR67eDW_egPtKbY",
  authDomain: "grdlhub-9eae1.firebaseapp.com",
  projectId: "grdlhub-9eae1",
  storageBucket: "grdlhub-9eae1.firebasestorage.app",
  messagingSenderId: "708488529302",
  appId: "1:708488529302:web:aa7063abae41f71bc7c9b7"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function addTestUsers() {
  try {
    console.log('Adding test users...')
    
    // Test users
    const testUsers = [
      {
        name: 'Nuno Madureira',
        email: 'nuno@example.com',
        role: 'admin',
        permissions: ['home', 'content', 'users', 'admin'],
        status: 'active',
        congregation: 'Development'
      }
    ]
    
    for (const user of testUsers) {
      try {
        const docRef = await addDoc(collection(db, 'users'), user)
        console.log(`✅ Added user: ${user.email} with ID: ${docRef.id}`)
      } catch (error) {
        console.log(`❌ Failed to add ${user.email}:`, error.message)
      }
    }
    
    console.log('🎉 Process completed!')
    
  } catch (error) {
    console.error('❌ Error adding test users:', error)
  }
}

addTestUsers()
