// Script to initialize appointmentTitles collection with default data
// Run this once to create the collection in Firestore

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  Timestamp 
} from 'firebase/firestore'

// Firebase config (same as in your auth.js)
const firebaseConfig = {
  apiKey: "AIzaSyAlLv9l5M1B7nKFIZ5UeC0oLu8tIJ5HgJI",
  authDomain: "grdlhub-9eae1.firebaseapp.com",
  projectId: "grdlhub-9eae1",
  storageBucket: "grdlhub-9eae1.appspot.com",
  messagingSenderId: "794398959845",
  appId: "1:794398959845:web:1a4f5c7b0d9e8f9a6b7c8d"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Default appointment titles to create
const defaultTitles = [
  {
    title: 'Testemunho Público',
    emoji: '🎤',
    displayOrder: 1,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'system',
    updatedAt: Timestamp.now(),
    updatedBy: 'system'
  },
  {
    title: 'Reunião VMC',
    emoji: '📋',
    displayOrder: 2,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'system',
    updatedAt: Timestamp.now(),
    updatedBy: 'system'
  },
  {
    title: 'Reunião de Oração',
    emoji: '🙏',
    displayOrder: 3,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'system',
    updatedAt: Timestamp.now(),
    updatedBy: 'system'
  },
  {
    title: 'Estudo Bíblico',
    emoji: '📖',
    displayOrder: 4,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'system',
    updatedAt: Timestamp.now(),
    updatedBy: 'system'
  },
  {
    title: 'Culto Dominical',
    emoji: '⛪',
    displayOrder: 5,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'system',
    updatedAt: Timestamp.now(),
    updatedBy: 'system'
  }
]

async function initializeAppointmentTitles() {
  try {
    console.log('🔍 Checking if appointmentTitles collection exists...')
    
    // Check if collection already has documents
    const snapshot = await getDocs(collection(db, 'appointmentTitles'))
    
    if (!snapshot.empty) {
      console.log('✅ appointmentTitles collection already exists with', snapshot.size, 'documents')
      snapshot.forEach(doc => {
        const data = doc.data()
        console.log(`   - ${data.emoji} ${data.title}`)
      })
      return
    }
    
    console.log('📝 Creating appointmentTitles collection with default data...')
    
    // Add each default title
    for (const titleData of defaultTitles) {
      console.log(`   Adding: ${titleData.emoji} ${titleData.title}`)
      const docRef = await addDoc(collection(db, 'appointmentTitles'), titleData)
      console.log(`   ✅ Created document with ID: ${docRef.id}`)
    }
    
    console.log('🎉 Successfully initialized appointmentTitles collection!')
    
  } catch (error) {
    console.error('❌ Error initializing appointmentTitles:', error)
    
    if (error.code === 'permission-denied') {
      console.log('💡 This might be a permissions issue. Make sure you are authenticated as an admin.')
    }
  }
}

// Run the initialization
initializeAppointmentTitles()