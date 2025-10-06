/**
 * Report Templates Utility
 * Manages report templates and related functionality
 */

// Sample report templates
export const REPORT_TEMPLATES = {
  testemunho: {
    id: 'testemunho',
    name: 'Testemunho Público Report',
    description: 'Standard report template for Testemunho Público activities',
    fields: [
      { id: 'date', name: 'Date', type: 'date', required: true },
      { id: 'participants', name: 'Participants', type: 'number', required: true },
      { id: 'duration', name: 'Duration (hours)', type: 'number', required: true },
      { id: 'notes', name: 'Notes', type: 'textarea', required: false },
      { id: 'publications', name: 'Publications Placed', type: 'number', required: false },
      { id: 'studies', name: 'Bible Studies Started', type: 'number', required: false }
    ],
    active: true
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Activity Report',
    description: 'Monthly summary of all activities',
    fields: [
      { id: 'month', name: 'Month', type: 'select', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], required: true },
      { id: 'totalHours', name: 'Total Hours', type: 'number', required: true },
      { id: 'appointments', name: 'Total Appointments', type: 'number', required: true },
      { id: 'highlights', name: 'Highlights', type: 'textarea', required: false }
    ],
    active: true
  },
  attendance: {
    id: 'attendance',
    name: 'Attendance Report',
    description: 'Track attendance for appointments',
    fields: [
      { id: 'appointmentId', name: 'Appointment ID', type: 'text', required: true },
      { id: 'attendees', name: 'Number of Attendees', type: 'number', required: true },
      { id: 'feedback', name: 'Feedback', type: 'textarea', required: false }
    ],
    active: true
  }
}

/**
 * Get all report templates
 */
export function getAllReportTemplates() {
  return Object.values(REPORT_TEMPLATES).filter(template => template.active)
}

/**
 * Get a specific report template by ID
 */
export function getReportTemplate(templateId) {
  return REPORT_TEMPLATES[templateId] || null
}

/**
 * Load user reports (placeholder function)
 */
export async function loadUserReports(userId) {
  // Placeholder implementation
  console.log('📊 Loading user reports for:', userId)
  return []
}

/**
 * Get pending report tasks (placeholder function)
 */
export async function getPendingReportTasks(userId) {
  // Placeholder implementation
  console.log('📋 Getting pending report tasks for:', userId)
  return []
}

/**
 * Get appointments for report (placeholder function)
 */
export async function getAppointmentsForReport(startDate, endDate) {
  // Placeholder implementation
  console.log('📅 Getting appointments for report period:', startDate, 'to', endDate)
  return []
}

/**
 * Submit a report (placeholder function)
 */
export async function submitReport(reportData) {
  // Placeholder implementation
  console.log('📝 Submitting report:', reportData)
  return { success: true, id: 'report_' + Date.now() }
}

/**
 * Validate report data
 */
export function validateReportData(templateId, data) {
  const template = getReportTemplate(templateId)
  if (!template) {
    return { valid: false, errors: ['Invalid template'] }
  }

  const errors = []
  
  // Check required fields
  template.fields.forEach(field => {
    if (field.required && (!data[field.id] || data[field.id] === '')) {
      errors.push(`${field.name} is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}