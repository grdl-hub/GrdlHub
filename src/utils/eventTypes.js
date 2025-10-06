// Event Types Configuration
// Defines different appointment/event types with their specific properties

export const EVENT_TYPES = {
  'field-service-meeting': {
    id: 'field-service-meeting',
    name: 'Reuniões para o Serviço de Campo',
    icon: '🚪',
    description: 'Organize field service meetings and activities',
    privilegeRequired: 'Reuniões para o Serviço de Campo',
    color: '#4CAF50',
    fields: {
      title: {
        enabled: true,
        custom: true,
        label: 'Meeting Title',
        placeholder: 'e.g., Saturday Morning Field Service, Letter Writing...',
        default: 'Reuniões para o Serviço de Campo'
      },
      type: {
        enabled: false,
        fixed: 'meeting'
      },
      date: { enabled: true, required: true },
      time: { enabled: true, required: true },
      place: { 
        enabled: true, 
        required: true,
        label: 'Meeting Point',
        placeholder: 'Where to meet for field service...',
        suggestions: [
          'Kingdom Hall',
          'Public Square',
          'Coffee Shop',
          'Online - Zoom',
          'Territory Address'
        ]
      },
      duration: { 
        enabled: false
      },
      recurring: {
        enabled: true,
        defaultPatterns: ['weekly', 'biweekly', 'monthly']
      },
      designations: {
        enabled: true,
        required: false,
        filterByPrivilege: true,
        maxSelections: 1,
        displayType: 'toggle-buttons',
        label: '👥 Meeting Organizers'
      },
      description: {
        enabled: true,
        required: false,
        label: 'Meeting Details',
        placeholder: 'Territory to work, special instructions, what to bring...'
      }
    },
    validation: {
      requiresPrivilege: false,
      requiresDesignations: false
    }
  },
  
  'prison-witnessing': {
    id: 'prison-witnessing',
    name: 'Testemunho em Prisões',
    icon: '🏢',
    description: 'Prison witnessing and ministry',
    privilegeRequired: 'Testemunho em Prisões',
    color: '#2196F3',
    fields: {
      title: {
        enabled: false,
        fixed: 'Testemunho em Prisões'
      },
      type: {
        enabled: false,
        fixed: 'meeting'
      },
      date: { enabled: true, required: true },
      time: { enabled: true, required: true },
      place: { 
        enabled: true, 
        required: true,
        label: 'Prison Facility',
        placeholder: 'Prison name and location...',
        suggestions: [
          'State Correctional Facility',
          'County Detention Center',
          'Federal Prison'
        ]
      },
      duration: { 
        enabled: true, 
        required: true,
        default: 90,
        options: [60, 90, 120, 180]
      },
      recurring: {
        enabled: true,
        defaultPatterns: ['weekly', 'biweekly', 'monthly']
      },
      designations: {
        enabled: true,
        required: true,
        filterByPrivilege: true,
        maxSelections: 3,
        label: '👥 Assigned Publishers',
        helpText: 'Select up to 3 publishers for this prison visit. Only users with "Testemunho em Prisões" privilege can be selected.'
      },
      description: {
        enabled: true,
        required: false,
        label: 'Security & Visit Notes',
        placeholder: 'Security requirements, visitor list, special procedures, contact information...'
      }
    },
    validation: {
      requiresPrivilege: true,
      requiresDesignations: true
    }
  }
}

// Get event type by ID
export function getEventType(eventTypeId) {
  return EVENT_TYPES[eventTypeId] || null
}

// Get event type by privilege name (for migration)
export function getEventTypeByPrivilege(privilegeName) {
  return Object.values(EVENT_TYPES).find(type => type.privilegeRequired === privilegeName) || null
}

// Get all event types as array
export function getAllEventTypes() {
  return Object.values(EVENT_TYPES)
}

// Check if user has permission to create event type
export function canUserCreateEventType(userPrivileges, eventTypeId) {
  const eventType = getEventType(eventTypeId)
  if (!eventType) return false
  
  if (!eventType.validation.requiresPrivilege) return true
  
  return userPrivileges && userPrivileges.includes(eventType.privilegeRequired)
}

// Get available event types for user based on their privileges
export function getAvailableEventTypesForUser(userPrivileges = []) {
  return getAllEventTypes().filter(eventType => {
    if (!eventType.validation.requiresPrivilege) return true
    return userPrivileges.includes(eventType.privilegeRequired)
  })
}

// Detect event type from existing appointment data (for migration)
export function detectEventType(appointment) {
  const title = appointment.title || ''
  
  // Check if title matches any event type name
  const matchedType = Object.values(EVENT_TYPES).find(type => 
    type.name === title || type.fields.title.fixed === title
  )
  
  if (matchedType) {
    return matchedType.id
  }
  
  // Default: if no match, it's a generic appointment
  return null
}
