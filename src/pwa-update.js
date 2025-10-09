// PWA Update Manager - Handles service worker updates with user prompt

import { registerSW } from 'virtual:pwa-register'
import packageJson from '../package.json'

let updateAvailableToast = null

export function initializePWAUpdates() {
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('🔄 New version available!')
      showUpdatePrompt(updateSW)
    },
    onOfflineReady() {
      console.log('✅ App ready to work offline')
      showOfflineReady()
    },
    onRegistered(registration) {
      console.log('✅ Service Worker registered')
      // Check for updates every hour
      setInterval(() => {
        console.log('🔍 Checking for updates...')
        registration?.update()
      }, 60 * 60 * 1000)
    },
    onRegisterError(error) {
      console.error('❌ Service Worker registration error:', error)
    }
  })

  // Add manual check button to settings if available
  addManualUpdateCheck(updateSW)
  
  // Display current version
  displayAppVersion()
}

function showUpdatePrompt(updateSW) {
  // Remove any existing toast
  if (updateAvailableToast) {
    updateAvailableToast.remove()
  }

  // Create update toast
  updateAvailableToast = document.createElement('div')
  updateAvailableToast.className = 'pwa-update-toast'
  updateAvailableToast.innerHTML = `
    <div class="pwa-update-content">
      <div class="pwa-update-icon">🔄</div>
      <div class="pwa-update-text">
        <strong>Nova versão disponível!</strong>
        <p>Atualize para ter acesso às últimas funcionalidades.</p>
      </div>
      <div class="pwa-update-actions">
        <button class="pwa-update-btn pwa-update-primary" id="pwa-update-reload">
          Atualizar Agora
        </button>
        <button class="pwa-update-btn pwa-update-secondary" id="pwa-update-later">
          Mais Tarde
        </button>
      </div>
    </div>
  `

  document.body.appendChild(updateAvailableToast)

  // Add styles if not already present
  if (!document.getElementById('pwa-update-styles')) {
    const style = document.createElement('style')
    style.id = 'pwa-update-styles'
    style.textContent = `
      .pwa-update-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        max-width: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideInUp 0.3s ease-out;
      }

      @keyframes slideInUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .pwa-update-content {
        padding: 20px;
      }

      .pwa-update-icon {
        font-size: 2rem;
        margin-bottom: 12px;
      }

      .pwa-update-text strong {
        display: block;
        color: #1976d2;
        font-size: 1.1rem;
        margin-bottom: 8px;
      }

      .pwa-update-text p {
        margin: 0;
        color: #666;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .pwa-update-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
      }

      .pwa-update-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .pwa-update-primary {
        background: #1976d2;
        color: white;
      }

      .pwa-update-primary:hover {
        background: #1565c0;
        transform: translateY(-1px);
      }

      .pwa-update-secondary {
        background: #e0e0e0;
        color: #424242;
      }

      .pwa-update-secondary:hover {
        background: #d0d0d0;
      }

      @media (max-width: 500px) {
        .pwa-update-toast {
          bottom: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `
    document.head.appendChild(style)
  }

  // Handle update action
  document.getElementById('pwa-update-reload').addEventListener('click', () => {
    updateSW(true) // This will reload the page with the new service worker
  })

  // Handle dismiss action
  document.getElementById('pwa-update-later').addEventListener('click', () => {
    updateAvailableToast.remove()
    updateAvailableToast = null
    
    // Remind again in 30 minutes
    setTimeout(() => {
      showUpdatePrompt(updateSW)
    }, 30 * 60 * 1000)
  })
}

function showOfflineReady() {
  const toast = document.createElement('div')
  toast.className = 'pwa-update-toast'
  toast.innerHTML = `
    <div class="pwa-update-content">
      <div class="pwa-update-icon">✅</div>
      <div class="pwa-update-text">
        <strong>Pronto para uso offline!</strong>
        <p>O GrdlHub agora funciona sem conexão à internet.</p>
      </div>
    </div>
  `

  document.body.appendChild(toast)

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.remove()
  }, 5000)
}

function addManualUpdateCheck(updateSW) {
  // This can be called from settings or a menu
  window.checkForAppUpdates = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        
        // Show checking message
        const toast = document.createElement('div')
        toast.className = 'pwa-update-toast'
        toast.innerHTML = `
          <div class="pwa-update-content">
            <div class="pwa-update-icon">🔍</div>
            <div class="pwa-update-text">
              <strong>Verificando atualizações...</strong>
            </div>
          </div>
        `
        document.body.appendChild(toast)
        
        // Auto-dismiss
        setTimeout(() => {
          toast.remove()
        }, 2000)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }
}

function displayAppVersion() {
  const versionDisplay = document.getElementById('app-version-display')
  if (versionDisplay) {
    const version = packageJson.version
    const buildDate = new Date().toLocaleDateString('pt-PT')
    versionDisplay.innerHTML = `
      <div style="padding: 12px; background: #f5f5f5; border-radius: 8px; font-family: monospace;">
        <strong style="color: #1976d2;">v${version}</strong>
        <br>
        <small style="color: #666;">Build: ${buildDate}</small>
      </div>
    `
  }
}

// Export for use in main app
export default { initializePWAUpdates }
