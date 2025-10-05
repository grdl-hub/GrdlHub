import { getCurrentUser } from '../auth.js'
import { db } from '../auth.js'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore'
import { 
  loadUserReports, 
  getPendingReportTasks, 
  getReportTemplate,
  getAppointmentsForReport 
} from '../utils/reportTemplates.js'
import { showNotification } from '../utils/notifications.js'
import { getTranslatedText } from '../utils/translate.js'

class TestemunhoReportsPage {
  constructor() {
    this.currentUser = null
    this.currentUserData = null
    this.pendingTasks = []
    this.reportHistory = []
  }

  async initialize() {
    console.log('📋 Initializing Testemunho Reports page...')
    
    // Check access
    if (!await this.checkAccess()) {
      this.renderAccessDenied()
      return
    }
    
    await this.loadUserData()
    await this.loadPendingTasks()
    await this.loadReportHistory()
    this.render()
    
    console.log('✅ Testemunho Reports page initialized')
  }

  async checkAccess() {
    this.currentUser = getCurrentUser()
    if (!this.currentUser) return false
    
    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid))
      if (!userDoc.exists()) return false
      
      this.currentUserData = userDoc.data()
      
      // Check if user is admin or has Testemunho Público privilege
      if (this.currentUserData.role === 'admin') return true
      
      const privileges = this.currentUserData.privileges || []
      return privileges.some(privilege => {
        if (typeof privilege === 'string') {
          return privilege === 'Testemunho Público' || privilege.toLowerCase().includes('testemunho')
        } else if (typeof privilege === 'object' && privilege.name) {
          return privilege.name === 'Testemunho Público' || privilege.name.toLowerCase().includes('testemunho')
        }
        return false
      })
    } catch (error) {
      console.error('Error checking access:', error)
      return false
    }
  }

  async loadUserData() {
    if (!this.currentUser) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid))
      if (userDoc.exists()) {
        this.currentUserData = userDoc.data()
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  async loadPendingTasks() {
    try {
      this.pendingTasks = await getPendingReportTasks(this.currentUser.uid)
      console.log('📋 Loaded pending tasks:', this.pendingTasks.length)
    } catch (error) {
      console.error('Error loading pending tasks:', error)
      this.pendingTasks = []
    }
  }

  async loadReportHistory() {
    try {
      this.reportHistory = await loadUserReports(this.currentUser.uid)
      console.log('📊 Loaded report history:', this.reportHistory.length)
    } catch (error) {
      console.error('Error loading report history:', error)
      this.reportHistory = []
    }
  }

  renderAccessDenied() {
    const container = document.getElementById('testemunho-reports-container')
    if (!container) return

    container.innerHTML = `
      <div class="access-denied">
        <div class="access-denied-icon">🔒</div>
        <h3>Access Restricted</h3>
        <p>You need "Testemunho Público" privilege to access this page.</p>
        <div class="access-info">
          <p><strong>Current Status:</strong></p>
          <ul>
            <li>User Role: ${this.currentUserData?.role || 'user'}</li>
            <li>Privileges: ${this.currentUserData?.privileges?.length || 0} assigned</li>
          </ul>
        </div>
        <a href="#home" class="btn btn-primary">← Return to Home</a>
      </div>
    `
  }

  render() {
    const container = document.getElementById('testemunho-reports-container')
    if (!container) {
      console.error('Testemunho reports container not found')
      return
    }

    container.innerHTML = `
      <div class="testemunho-reports-page">
        <div class="page-header">
          <h2 class="page-title">📋 Testemunho Público Reports</h2>
          <p class="page-description">Submit reports and view your submission history</p>
          ${this.currentUserData?.role === 'admin' ? '<span class="admin-badge">👑 Admin View</span>' : ''}
        </div>

        <div class="reports-content">
          ${this.renderPendingReports()}
          ${this.renderReportHistory()}
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  renderPendingReports() {
    if (this.pendingTasks.length === 0) {
      return `
        <div class="pending-reports-section">
          <div class="section-header">
            <h3>🔴 Pending Reports</h3>
            <span class="section-badge">0</span>
          </div>
          
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h4>All caught up!</h4>
            <p>No pending reports at this time.</p>
          </div>
        </div>
      `
    }

    const tasksHtml = this.pendingTasks.map(task => this.renderPendingTask(task)).join('')

    return `
      <div class="pending-reports-section">
        <div class="section-header">
          <h3>🔴 Pending Reports</h3>
          <span class="section-badge">${this.pendingTasks.length}</span>
        </div>
        
        <div class="pending-tasks-list">
          ${tasksHtml}
        </div>
      </div>
    `
  }

  renderPendingTask(task) {
    const dueDate = task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date'
    const isOverdue = task.dueDate && task.dueDate < new Date()
    const template = getReportTemplate(task.reportTemplateId)
    
    // Get date range for appointments
    const startDate = task.appointmentsDateRange?.startDate?.toDate?.() || task.appointmentsDateRange?.startDate
    const endDate = task.appointmentsDateRange?.endDate?.toDate?.() || task.appointmentsDateRange?.endDate
    const dateRangeText = startDate && endDate ? 
      `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : 
      'Date range not specified'

    return `
      <div class="pending-task-card ${isOverdue ? 'overdue' : ''}">
        <div class="task-header">
          <h4 class="task-title">${task.title}</h4>
          <span class="task-status ${isOverdue ? 'status-overdue' : 'status-pending'}">
            ${isOverdue ? '⚠️ Overdue' : '🕐 Pending'}
          </span>
        </div>

        <div class="task-details">
          <p class="task-description">${task.description || 'No description'}</p>
          
          <div class="task-meta">
            <div class="meta-item">
              <span class="meta-label">📅 Due Date:</span>
              <span class="meta-value ${isOverdue ? 'overdue-text' : ''}">${dueDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">📋 Report Type:</span>
              <span class="meta-value">${template?.name || 'Unknown template'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">📅 Appointments Period:</span>
              <span class="meta-value">${dateRangeText}</span>
            </div>
          </div>
        </div>

        <div class="task-actions">
          <button class="btn btn-primary" onclick="testemunhoReports.submitReport('${task.id}')">
            📝 Submit Report
          </button>
          <button class="btn btn-secondary" onclick="testemunhoReports.viewAppointments('${task.id}')">
            📅 View Appointments
          </button>
        </div>
      </div>
    `
  }

  renderReportHistory() {
    if (this.reportHistory.length === 0) {
      return `
        <div class="report-history-section">
          <div class="section-header">
            <h3>📊 Submission History</h3>
            <span class="section-badge">0</span>
          </div>
          
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h4>No submissions yet</h4>
            <p>Your report submission history will appear here.</p>
          </div>
        </div>
      `
    }

    const historyHtml = this.reportHistory.map(report => this.renderHistoryItem(report)).join('')

    return `
      <div class="report-history-section">
        <div class="section-header">
          <h3>📊 Submission History</h3>
          <span class="section-badge">${this.reportHistory.length}</span>
          <button id="refresh-history-btn" class="btn btn-secondary btn-small">
            🔄 Refresh
          </button>
        </div>
        
        <div class="history-list">
          ${historyHtml}
        </div>
      </div>
    `
  }

  renderHistoryItem(report) {
    const template = getReportTemplate(report.reportTemplateId)
    const submittedDate = report.submittedAt.toLocaleDateString()
    
    // Extract key metrics from submission data
    const data = report.submissionData || {}
    const metrics = []
    
    if (data.totalHours !== undefined) metrics.push(`${data.totalHours}h`)
    if (data.activities !== undefined) metrics.push(`${data.activities} activities`)
    if (data.placements !== undefined) metrics.push(`${data.placements} placements`)
    
    const metricsText = metrics.length > 0 ? metrics.join(' | ') : 'No metrics'

    return `
      <div class="history-item">
        <div class="history-header">
          <h4 class="history-title">${template?.name || 'Unknown Report'}</h4>
          <span class="history-date">📅 ${submittedDate}</span>
        </div>

        <div class="history-details">
          <div class="history-metrics">
            <span class="metrics-text">${metricsText}</span>
          </div>
          
          ${data.notes ? `
            <div class="history-notes">
              <strong>Notes:</strong> ${data.notes.substring(0, 100)}${data.notes.length > 100 ? '...' : ''}
            </div>
          ` : ''}
        </div>

        <div class="history-actions">
          <button class="btn btn-secondary btn-small" onclick="testemunhoReports.viewReportDetails('${report.id}')">
            👁️ View Details
          </button>
          <button class="btn btn-secondary btn-small" disabled title="Coming soon">
            📄 Download
          </button>
        </div>
      </div>
    `
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-history-btn')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh())
    }
  }

  async refresh() {
    console.log('🔄 Refreshing reports page...')
    await this.loadPendingTasks()
    await this.loadReportHistory()
    this.render()
    showNotification('Reports refreshed', 'success')
  }

  async submitReport(taskId) {
    const task = this.pendingTasks.find(t => t.id === taskId)
    if (!task) {
      showNotification('Task not found', 'error')
      return
    }

    console.log('📝 Starting report submission for task:', task.title)
    
    // Get the report template
    const template = getReportTemplate(task.reportTemplateId)
    if (!template) {
      showNotification('Report template not found', 'error')
      return
    }

    // Get appointments for this period
    const startDate = task.appointmentsDateRange?.startDate?.toDate?.() || task.appointmentsDateRange?.startDate
    const endDate = task.appointmentsDateRange?.endDate?.toDate?.() || task.appointmentsDateRange?.endDate
    
    let appointments = []
    if (startDate && endDate) {
      appointments = await getAppointmentsForReport(startDate, endDate)
    }

    // Show report submission modal
    this.showReportSubmissionModal(task, template, appointments)
  }

  async viewAppointments(taskId) {
    const task = this.pendingTasks.find(t => t.id === taskId)
    if (!task) {
      showNotification('Task not found', 'error')
      return
    }

    const startDate = task.appointmentsDateRange?.startDate?.toDate?.() || task.appointmentsDateRange?.startDate
    const endDate = task.appointmentsDateRange?.endDate?.toDate?.() || task.appointmentsDateRange?.endDate
    
    if (!startDate || !endDate) {
      showNotification('Date range not specified for this task', 'error')
      return
    }

    const appointments = await getAppointmentsForReport(startDate, endDate)
    this.showAppointmentsModal(task, appointments)
  }

  showAppointmentsModal(task, appointments) {
    const appointmentsHtml = appointments.length > 0 ? 
      appointments.map(apt => `
        <div class="appointment-item">
          <div class="apt-date">${apt.date.toLocaleDateString()}</div>
          <div class="apt-details">
            <strong>${apt.title}</strong>
            ${apt.location ? `<br>📍 ${apt.location}` : ''}
            ${apt.time ? `<br>🕐 ${apt.time}` : ''}
          </div>
        </div>
      `).join('') :
      '<div class="empty-state"><p>No appointments found for this period.</p></div>'

    const modalHtml = `
      <div class="modal-overlay" onclick="this.remove()">
        <div class="modal appointments-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>📅 Appointments for ${task.title}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="appointments-list">
              ${appointmentsHtml}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Close
            </button>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }

  showReportSubmissionModal(task, template, appointments) {
    // This will be implemented in the next phase
    showNotification('Report submission modal coming in next phase!', 'info')
    console.log('📝 Report submission modal data:', { task, template, appointments })
  }

  viewReportDetails(reportId) {
    const report = this.reportHistory.find(r => r.id === reportId)
    if (!report) {
      showNotification('Report not found', 'error')
      return
    }

    console.log('👁️ Viewing report details:', report)
    // This will be implemented in the next phase
    showNotification('Report details modal coming soon!', 'info')
  }
}

// Initialize and export
let testemunhoReports = null

export function initializeTestemunhoReportsPage() {
  console.log('🔧 Setting up Testemunho Reports page...')
  testemunhoReports = new TestemunhoReportsPage()
  testemunhoReports.initialize()
}

// Make available globally for button clicks
window.testemunhoReports = testemunhoReports

export { TestemunhoReportsPage }