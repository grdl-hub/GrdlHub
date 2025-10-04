/**
 * Demo: How to create a new page that automatically updates Available Pages list
 */

import { createAdminPage, createUserPage } from '../utils/pageCreator.js'
import { registerPage } from '../utils/pageRegistry.js'

// Example 1: Create a new admin page
console.log('📄 Demo: Creating new pages...')

// This automatically registers the page and makes it appear in Available Pages
createAdminPage('analytics', 'Analytics', '📊').then(result => {
  if (result.success) {
    console.log('✅', result.message)
  }
})

// Example 2: Create a user page  
createUserPage('calendar', 'Calendar', '📅').then(result => {
  if (result.success) {
    console.log('✅', result.message)
  }
})

// Example 3: Manually register an existing page
registerPage('custom', {
  name: 'Custom Feature',
  icon: '⚡',
  description: 'Custom functionality',
  category: 'main'
})

console.log('📄 All new pages automatically appear in:')
console.log('   - Settings > Home Sections > Available Pages')
console.log('   - User permissions system')
console.log('   - Navigation menus')
console.log('   - Access control lists')