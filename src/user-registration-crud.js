// Fresh User Registration CRUD System
// Completely isolated from main app - no conflicts

console.log('🆕 Fresh User Registration CRUD loaded')

class UserRegistrationCRUD {
  constructor() {
    this.db = null
    this.currentUser = null
    this.users = []
    this.editingUserId = null
    console.log('🔧 UserRegistrationCRUD constructor called')
    this.initialize()
  }

  async initialize() {
    console.log('🚀 Initializing User Registration CRUD...')
    
    try {
      // Show immediate feedback
      console.log('🔧 Starting initialization...')
      
      // Try to import Firebase functions
      console.log('📦 Importing Firebase modules...')
      const { 
        initializeStandaloneAuth,
        getCurrentAuthUser
      } = await import('./auth-standalone.js')
      
      const { 
        getFirestore, 
        collection, 
        doc, 
        addDoc,
        getDocs, 
        updateDoc,
        deleteDoc,
        query,
        where,
        orderBy,
        serverTimestamp 
      } = await import('firebase/firestore')
      
      // Store Firebase functions
      this.initializeStandaloneAuth = initializeStandaloneAuth
      this.getCurrentAuthUser = getCurrentAuthUser
      this.getFirestore = getFirestore
      this.collection = collection
      this.doc = doc
      this.addDoc = addDoc
      this.getDocs = getDocs
      this.updateDoc = updateDoc
      this.deleteDoc = deleteDoc
      this.query = query
      this.where = where
      this.orderBy = orderBy
      this.serverTimestamp = serverTimestamp
      
      console.log('✅ Firebase modules imported')

      // Initialize Firebase
      console.log('🔥 Initializing Firebase...')
      await this.initializeStandaloneAuth()
      this.db = this.getFirestore()
      console.log('✅ Firebase initialized')

      // Check authentication
      this.currentUser = this.getCurrentAuthUser()
      if (!this.currentUser) {
        console.log('❌ No authenticated user, redirecting...')
        window.location.href = '/auth.html'
        return
      }

      console.log('✅ User authenticated:', this.currentUser.email)

      // Load existing users
      await this.loadUsers()
      
      // Setup event handlers
      this.setupEventHandlers()
      
      // Render users table
      this.renderUsersTable()
      
      console.log('✅ User Registration CRUD ready!')

    } catch (error) {
      console.error('❌ Initialization failed:', error)
      this.showNotification('Failed to initialize: ' + error.message, 'error')
    }
  }

  setupEventHandlers() {
    // Form submission
    const form = document.getElementById('userForm')
    form.addEventListener('submit', (e) => this.handleFormSubmit(e))

    // Clear form button
    const clearBtn = document.getElementById('clearFormBtn')
    clearBtn.addEventListener('click', () => this.clearForm())

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn')
    refreshBtn.addEventListener('click', () => this.refreshUsers())
  }

  async handleFormSubmit(e) {
    e.preventDefault()
    
    const formData = this.getFormData()
    
    if (!this.validateFormData(formData)) {
      return
    }

    const submitBtn = document.getElementById('submitBtn')
    const originalText = submitBtn.textContent
    
    try {
      submitBtn.disabled = true
      submitBtn.textContent = this.editingUserId ? 'Updating...' : 'Adding...'

      if (this.editingUserId) {
        await this.updateUser(this.editingUserId, formData)
      } else {
        await this.createUser(formData)
      }

    } catch (error) {
      console.error('❌ Form submission error:', error)
      this.showNotification('Operation failed: ' + error.message, 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  }

  getFormData() {
    return {
      name: document.getElementById('userName').value.trim(),
      email: document.getElementById('userEmail').value.trim().toLowerCase(), // Normalize email
      congregation: document.getElementById('userCongregation').value.trim(),
      role: document.getElementById('userRole').value,
      status: document.getElementById('userStatus').value,
      notes: document.getElementById('userNotes').value.trim()
    }
  }

  async validateFormData(data) {
    // Trim and normalize data
    data.name = data.name.trim()
    data.email = data.email.trim().toLowerCase()
    data.congregation = data.congregation.trim()
    
    if (!data.name || !data.email || !data.congregation) {
      this.showNotification('Name, email, and congregation are required', 'error')
      return false
    }

    if (!this.isValidEmail(data.email)) {
      this.showNotification('Please enter a valid email address', 'error')
      return false
    }

    // Check for duplicate email (except when editing the same user)
    const existingUserByEmail = this.users.find(user => 
      user.email.toLowerCase() === data.email.toLowerCase() && user.id !== this.editingUserId
    )
    
    if (existingUserByEmail) {
      this.showNotification(`A user with email "${data.email}" already exists`, 'error')
      return false
    }

    // Check for duplicate name (except when editing the same user)
    const existingUserByName = this.users.find(user => 
      user.name && user.name.toLowerCase() === data.name.toLowerCase() && user.id !== this.editingUserId
    )
    
    if (existingUserByName) {
      this.showNotification(`A user with name "${data.name}" already exists`, 'error')
      return false
    }

    // Additional Firestore-level duplicate check for extra safety
    try {
      const usersRef = this.collection(this.db, 'users')
      
      // Check email duplicates in Firestore
      const emailQuery = this.query(usersRef, this.where('email', '==', data.email.toLowerCase()))
      const emailSnapshot = await this.getDocs(emailQuery)
      
      if (!emailSnapshot.empty) {
        const existingEmailDoc = emailSnapshot.docs[0]
        if (existingEmailDoc.id !== this.editingUserId) {
          this.showNotification(`A user with email "${data.email}" already exists in the database`, 'error')
          return false
        }
      }
      
      // Check name duplicates in Firestore
      const nameQuery = this.query(usersRef, this.where('name', '==', data.name))
      const nameSnapshot = await this.getDocs(nameQuery)
      
      if (!nameSnapshot.empty) {
        const existingNameDoc = nameSnapshot.docs[0]
        if (existingNameDoc.id !== this.editingUserId) {
          this.showNotification(`A user with name "${data.name}" already exists in the database`, 'error')
          return false
        }
      }
      
    } catch (error) {
      console.error('Error checking duplicates in Firestore:', error)
      // Continue with local validation if Firestore check fails
    }

    return true
  }

  async createUser(userData) {
    const userDoc = {
      ...userData,
      createdAt: this.serverTimestamp(),
      createdBy: this.currentUser.email,
      lastModified: this.serverTimestamp()
    }

    console.log('👤 Creating user:', userDoc)
    const docRef = await this.addDoc(this.collection(this.db, 'users'), userDoc)
    console.log('✅ User created with ID:', docRef.id)

    // Add to local array for immediate display
    this.users.unshift({
      id: docRef.id,
      ...userDoc,
      createdAt: new Date(),
      lastModified: new Date()
    })

    this.clearForm()
    this.renderUsersTable()
    this.showNotification(`User "${userData.name}" created successfully!`, 'success')
  }

  async updateUser(userId, userData) {
    const userDoc = {
      ...userData,
      lastModified: this.serverTimestamp(),
      modifiedBy: this.currentUser.email
    }

    console.log('📝 Updating user:', userId, userDoc)
    await this.updateDoc(this.doc(this.db, 'users', userId), userDoc)
    console.log('✅ User updated')

    // Update local array
    const userIndex = this.users.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        ...userDoc,
        lastModified: new Date()
      }
    }

    this.clearForm()
    this.renderUsersTable()
    this.showNotification(`User "${userData.name}" updated successfully!`, 'success')
  }

  async deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      console.log('🗑️ Deleting user:', userId)
      await this.deleteDoc(this.doc(this.db, 'users', userId))
      console.log('✅ User deleted')

      // Remove from local array
      this.users = this.users.filter(u => u.id !== userId)
      
      this.renderUsersTable()
      this.showNotification(`User "${userName}" deleted successfully`, 'success')

    } catch (error) {
      console.error('❌ Delete error:', error)
      this.showNotification('Failed to delete user: ' + error.message, 'error')
    }
  }

  editUser(userId) {
    const user = this.users.find(u => u.id === userId)
    if (!user) {
      this.showNotification('User not found', 'error')
      return
    }

    // Populate form with user data
    document.getElementById('userName').value = user.name || ''
    document.getElementById('userEmail').value = user.email || ''
    document.getElementById('userCongregation').value = user.congregation || ''
    document.getElementById('userRole').value = user.role || 'user'
    document.getElementById('userStatus').value = user.status || 'pending'
    document.getElementById('userNotes').value = user.notes || ''

    // Update form state
    this.editingUserId = userId
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.textContent = 'Update User'

    // Scroll to form
    document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' })
  }

  clearForm() {
    document.getElementById('userForm').reset()
    this.editingUserId = null
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.textContent = 'Add User'
  }

  async loadUsers() {
    try {
      console.log('📋 Loading users from Firestore...')
      const usersRef = collection(this.db, 'users')
      const q = query(usersRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      this.users = []
      querySnapshot.forEach((doc) => {
        this.users.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      console.log(`✅ Loaded ${this.users.length} users`)
    } catch (error) {
      console.error('❌ Error loading users:', error)
      this.users = []
    }
  }

  async refreshUsers() {
    const refreshBtn = document.getElementById('refreshBtn')
    const originalText = refreshBtn.textContent
    
    try {
      refreshBtn.disabled = true
      refreshBtn.textContent = '🔄 Loading...'
      
      await this.loadUsers()
      this.renderUsersTable()
      this.showNotification('Users list refreshed', 'success')
      
    } catch (error) {
      this.showNotification('Failed to refresh users', 'error')
    } finally {
      refreshBtn.disabled = false
      refreshBtn.textContent = originalText
    }
  }

  renderUsersTable() {
    const container = document.getElementById('usersContainer')
    
    if (this.users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <p>No users registered yet.</p>
          <p style="font-size: 0.875rem; margin-top: 5px;">Add your first user using the form above.</p>
        </div>
      `
      return
    }

    const tableHTML = `
      <table class="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Congregation</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.users.map(user => this.renderUserRow(user)).join('')}
        </tbody>
      </table>
    `

    container.innerHTML = tableHTML
  }

  renderUserRow(user) {
    const createdDate = user.createdAt?.toDate ? 
      user.createdAt.toDate().toLocaleDateString() : 
      (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown')

    return `
      <tr>
        <td>
          <div style="font-weight: 500;">${this.escapeHtml(user.name)}</div>
          ${user.notes ? `<div style="font-size: 0.75rem; color: #757575; margin-top: 2px;">${this.escapeHtml(user.notes)}</div>` : ''}
        </td>
        <td>${this.escapeHtml(user.email)}</td>
        <td>${this.escapeHtml(user.congregation || 'Not specified')}</td>
        <td>
          <span class="role-badge">${user.role.toUpperCase()}</span>
        </td>
        <td>
          <span class="status-badge status-${user.status}">${user.status.toUpperCase()}</span>
        </td>
        <td style="color: #757575;">${createdDate}</td>
        <td>
          <div class="action-buttons">
            <button 
              class="btn-small btn-edit" 
              onclick="userCRUD.editUser('${user.id}')"
              title="Edit user"
            >
              Edit
            </button>
            <button 
              class="btn-small btn-delete" 
              onclick="userCRUD.deleteUser('${user.id}', '${this.escapeHtml(user.name)}')"
              title="Delete user"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
  }

  showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification')
    existing.forEach(n => n.remove())

    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.textContent = message

    document.body.appendChild(notification)

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100)

    // Hide notification after 4 seconds
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => notification.remove(), 300)
    }, 4000)
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize the CRUD system
const userCRUD = new UserRegistrationCRUD()

// Make it globally available for button clicks
window.userCRUD = userCRUD
