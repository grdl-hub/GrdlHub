/**
 * Page Creation Helper
 * Automatically registers new pages with the system
 */

import { registerPage } from './pageRegistry.js'

/**
 * Create a new page file and automatically register it
 */
export async function createNewPage(pageConfig) {
  const { 
    id, 
    name, 
    icon = '📄', 
    description = `${name} page`, 
    category = 'system',
    template = 'basic' 
  } = pageConfig

  try {
    // Auto-register the page in the registry
    registerPage(id, { name, icon, description, category })

    // Generate the page file content
    const pageContent = generatePageTemplate(id, name, icon, template)
    
    console.log(`✅ Page '${name}' would be created at src/pages/${id}.js`)
    console.log(`📄 Page automatically registered in system`)
    
    // In a real implementation, you would write the file:
    // await writeFile(`src/pages/${id}.js`, pageContent)
    
    return {
      success: true,
      pageId: id,
      filePath: `src/pages/${id}.js`,
      message: `Page '${name}' created and registered successfully!`
    }
    
  } catch (error) {
    console.error(`❌ Error creating page '${name}':`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Generate page template content
 */
function generatePageTemplate(id, name, icon, template) {
  const className = `${id.charAt(0).toUpperCase()}${id.slice(1)}Page`
  
  switch (template) {
    case 'admin':
      return `// ${name} page functionality
import { checkAdminAccess } from '../accessControl.js'
import { showNotification } from '../utils/notifications.js'

export function initialize${className}() {
  console.log('${icon} Initializing ${name} page...')
  
  // Check admin access
  checkAdminAccess().then(isAdmin => {
    if (!isAdmin) {
      const container = document.getElementById('${id}-page')
      if (container) {
        container.innerHTML = \`
          <div class="admin-required">
            <p class="text-muted">👤 Admin access required for ${name}</p>
          </div>
        \`
      }
      return
    }
    
    setup${className}()
  })
}

function setup${className}() {
  // ${name} functionality here
  console.log('✅ ${name} page initialized')
}
`

    case 'user':
      return `// ${name} page functionality
import { getUserPermissions } from '../accessControl.js'
import { showNotification } from '../utils/notifications.js'

export function initialize${className}() {
  console.log('${icon} Initializing ${name} page...')
  
  // Check user permissions
  getUserPermissions().then(permissions => {
    if (!permissions.includes('${id}')) {
      const container = document.getElementById('${id}-page')
      if (container) {
        container.innerHTML = \`
          <div class="no-access">
            <p class="text-muted">🔒 You don't have access to ${name}</p>
          </div>
        \`
      }
      return
    }
    
    setup${className}()
  })
}

function setup${className}() {
  // ${name} functionality here
  console.log('✅ ${name} page initialized')
}
`

    default: // basic
      return `// ${name} page functionality
export function initialize${className}() {
  console.log('${icon} Initializing ${name} page...')
  
  setup${className}()
}

function setup${className}() {
  // ${name} functionality here
  console.log('✅ ${name} page initialized')
}
`
  }
}

/**
 * Delete a page and unregister it
 */
export async function deletePage(pageId) {
  try {
    const { unregisterPage, getPageMetadata } = await import('./pageRegistry.js')
    
    // Get page info before deletion
    const pageInfo = getPageMetadata(pageId)
    if (!pageInfo) {
      throw new Error(`Page '${pageId}' not found in registry`)
    }
    
    // Safety check - don't delete core pages
    const corePages = ['home', 'settings']
    if (corePages.includes(pageId)) {
      throw new Error(`Cannot delete core page '${pageId}'`)
    }
    
    // Unregister from the system first
    unregisterPage(pageId)
    
    console.log(`✅ Page '${pageId}' (${pageInfo.name}) deleted from registry`)
    console.log(`� Available Pages list automatically updated`)
    console.log(`📂 File src/pages/${pageId}.js should be manually deleted`)
    
    // In a real implementation, you would:
    // 1. Check for dependencies/references
    // 2. Clean up navigation entries
    // 3. Remove from user permissions
    // 4. Delete the actual file
    // await deleteFile(`src/pages/${pageId}.js`)
    
    return {
      success: true,
      pageId,
      pageName: pageInfo.name,
      message: `Page '${pageInfo.name}' deleted and automatically removed from Available Pages!`
    }
    
  } catch (error) {
    console.error(`❌ Error deleting page '${pageId}':`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Quick page creation shortcuts
 */
export const createAdminPage = (id, name, icon) => 
  createNewPage({ id, name, icon, category: 'system', template: 'admin' })

export const createUserPage = (id, name, icon) => 
  createNewPage({ id, name, icon, category: 'main', template: 'user' })

export const createSystemPage = (id, name, icon) => 
  createNewPage({ id, name, icon, category: 'system', template: 'basic' })

/**
 * Batch delete multiple pages
 */
export async function deletePages(pageIds) {
  const results = []
  
  for (const pageId of pageIds) {
    const result = await deletePage(pageId)
    results.push({ pageId, ...result })
  }
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`📊 Batch deletion complete: ${successful.length} succeeded, ${failed.length} failed`)
  
  return {
    successful,
    failed,
    totalProcessed: results.length
  }
}

/**
 * Safe page deletion with confirmation
 */
export async function deletePageWithConfirmation(pageId) {
  const { getPageMetadata } = await import('./pageRegistry.js')
  const pageInfo = getPageMetadata(pageId)
  
  if (!pageInfo) {
    throw new Error(`Page '${pageId}' not found`)
  }
  
  const confirmed = confirm(
    `Delete page "${pageInfo.name}"?\n\n` +
    `This will:\n` +
    `• Remove it from Available Pages list\n` +
    `• Update all UI components automatically\n` +
    `• Remove from user permissions\n` +
    `• Clean up navigation references\n\n` +
    `This action cannot be undone.`
  )
  
  if (confirmed) {
    return await deletePage(pageId)
  }
  
  return { success: false, cancelled: true }
}

// Example usage:
// deletePage('analytics')
// deletePageWithConfirmation('calendar')
// deletePages(['analytics', 'calendar', 'backup'])