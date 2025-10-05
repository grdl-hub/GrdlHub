// Form Types Registry
// Defines all available form types for task submissions

export const FORM_TYPES = {
  'monthly-availability': {
    id: 'monthly-availability',
    name: 'Monthly Availability Report',
    icon: '📅',
    collection: 'availabilitySubmissions',
    pageRoute: 'availability-forms',
    description: 'Submit your availability for meetings and service',
    category: 'monthly',
    fields: ['appointments', 'availability', 'notes']
  },
  'monthly-field-service': {
    id: 'monthly-field-service',
    name: 'Monthly Field Service Report',
    icon: '📊',
    collection: 'fieldServiceReports',
    pageRoute: 'monthly-field-service',
    description: 'Report hours, placements, and Bible studies',
    category: 'monthly',
    fields: ['hours', 'placements', 'videos', 'returnVisits', 'bibleStudies']
  },
  'monthly-attendance': {
    id: 'monthly-attendance',
    name: 'Monthly Attendance Report',
    icon: '👥',
    collection: 'attendanceReports',
    pageRoute: 'monthly-attendance',
    description: 'Track meeting attendance and participation',
    category: 'monthly',
    fields: ['meetingType', 'attendanceCount', 'notes']
  },
  'monthly-territory': {
    id: 'monthly-territory',
    name: 'Monthly Territory Report',
    icon: '🗺️',
    collection: 'territoryReports',
    pageRoute: 'monthly-territory',
    description: 'Update territory coverage status',
    category: 'monthly',
    fields: ['territoryNumber', 'status', 'completionDate']
  },
  'pioneer-application': {
    id: 'pioneer-application',
    name: 'Pioneer Application',
    icon: '🎯',
    collection: 'pioneerApplications',
    pageRoute: 'pioneer-application',
    description: 'Apply for pioneer service',
    category: 'application',
    fields: ['applicationType', 'startDate', 'recommendations']
  },
  'application-renewal': {
    id: 'application-renewal',
    name: 'Application Renewal',
    icon: '📝',
    collection: 'applicationRenewals',
    pageRoute: 'application-renewal',
    description: 'Renew your pioneer/auxiliary application',
    category: 'application',
    fields: ['currentStatus', 'renewalDate', 'recommendations']
  }
}

// Get form type by ID
export function getFormType(formTypeId) {
  return FORM_TYPES[formTypeId] || null
}

// Get all form types
export function getAllFormTypes() {
  return Object.values(FORM_TYPES)
}

// Get form types by category
export function getFormTypesByCategory(category) {
  return Object.values(FORM_TYPES).filter(type => type.category === category)
}

// Get monthly report forms
export function getMonthlyReportForms() {
  return getFormTypesByCategory('monthly')
}

// Get application forms
export function getApplicationForms() {
  return getFormTypesByCategory('application')
}

// Generate form type options HTML for dropdown
export function generateFormTypeOptionsHTML() {
  const monthly = getMonthlyReportForms()
  const applications = getApplicationForms()
  
  let html = '<option value="">Select a form type...</option>'
  
  if (monthly.length > 0) {
    html += '<optgroup label="Monthly Reports">'
    monthly.forEach(form => {
      html += `<option value="${form.id}">${form.icon} ${form.name}</option>`
    })
    html += '</optgroup>'
  }
  
  if (applications.length > 0) {
    html += '<optgroup label="Applications">'
    applications.forEach(form => {
      html += `<option value="${form.id}">${form.icon} ${form.name}</option>`
    })
    html += '</optgroup>'
  }
  
  return html
}

// Helper to generate smart defaults for reporting period
export function generateDefaultReportingPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  
  // First day of current month
  const startDate = new Date(year, month, 1)
  
  // Last day of current month
  const endDate = new Date(year, month + 1, 0)
  
  // Format dates as YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  
  // Generate display name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const displayName = `${monthNames[month]} ${year}`
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    displayName: displayName
  }
}
