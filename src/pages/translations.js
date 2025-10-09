// Translation Management Page
// Dedicated admin interface for managing translations with Firestore backend

import { getCurrentUser } from '../auth.js';
import { showNotification } from '../utils/notifications.js';
import { hasPageAccess } from '../accessControl.js';
import TextExtractor from '../utils/textExtractor.js';
import { translateText, translateBatch } from '../utils/autoTranslate.js';
import { 
    getTranslationEntries,
    saveTranslationEntry,
    deleteTranslationEntry,
    initializeDefaultTranslations,
    searchTranslations,
    getTranslationCategories,
    subscribeToTranslations,
    exportTranslations
} from '../utils/translationManagement.js';

class TranslationManager {
    constructor() {
        this.translations = [];
        this.filteredTranslations = [];
        this.currentLanguages = ['en', 'pt']; // English and Portuguese
        this.initialized = false;
        this.unsubscribe = null; // For real-time updates
        this.textExtractor = new TextExtractor(); // Text extraction tool
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🌍 Initializing Translation Management...');
        
        // Check admin permissions
        const user = getCurrentUser();
        console.log('🔍 Current user for translations:', user?.email);
        
        const hasPermission = await this.hasTranslationPermissions(user);
        if (!user || !hasPermission) {
            console.log('❌ User does not have translation permissions');
            this.renderAccessDenied();
            return;
        }

        console.log('✅ User has translation permissions, proceeding...');

        // Initialize default translations if needed
        await initializeDefaultTranslations();

        await this.loadTranslations();
        this.render();
        this.setupEventListeners();
        this.setupRealTimeUpdates();
        
        this.initialized = true;
        console.log('✅ Translation Management initialized');
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    setupRealTimeUpdates() {
        // Subscribe to real-time translation updates
        this.unsubscribe = subscribeToTranslations((entries) => {
            this.translations = entries;
            this.filteredTranslations = [...this.translations];
            this.updateTranslationTable();
            this.updateStats();
        });
    }

    async hasTranslationPermissions(user) {
        // Use the proper access control system
        console.log('🔍 Checking translation permissions for user:', user?.email);
        try {
            const hasAccess = await hasPageAccess('translations');
            console.log('🔍 Translation access result:', hasAccess);
            return hasAccess;
        } catch (error) {
            console.error('❌ Error checking translation permissions:', error);
            return false;
        }
    }

    async loadTranslations() {
        try {
            console.log('📥 Loading translations from Firestore...');
            this.translations = await getTranslationEntries();
            
            // If no translations found, initialize defaults
            if (this.translations.length === 0) {
                console.log('🔄 No translations found, initializing defaults...');
                const { initializeDefaultTranslations } = await import('../utils/translationManagement.js');
                await initializeDefaultTranslations();
                // Reload after initialization
                this.translations = await getTranslationEntries();
            }
            
            this.filteredTranslations = [...this.translations];
            console.log(`✅ Loaded ${this.translations.length} translations`);
        } catch (error) {
            console.error('❌ Error loading translations:', error);
            showNotification('Error loading translations', 'error');
            this.translations = [];
            this.filteredTranslations = [];
        }
    }

    render() {
        const container = document.getElementById('translations-content');
        if (!container) return;

        const html = `
            <div class="translations-page">
                <div class="translations-header">
                    <div class="header-content">
                        <h1>🌍 Translation Management</h1>
                        <p>Manage interface translations for all supported languages</p>
                    </div>
                    
                    <div class="header-stats">
                        <div class="stat-card">
                            <span class="stat-number">${this.translations.length}</span>
                            <span class="stat-label">Total Translations</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${this.currentLanguages.length}</span>
                            <span class="stat-label">Languages</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${this.getCompletionPercentage()}%</span>
                            <span class="stat-label">Portuguese Complete</span>
                        </div>
                    </div>
                </div>

                <div class="translations-toolbar">
                    <div class="toolbar-left">
                        <button id="add-translation-btn" class="btn btn-primary">
                            ➕ Add Translation
                        </button>
                        <button id="translate-all-btn" class="btn btn-success">
                            🔄 Auto-Translate All
                        </button>
                        <button id="init-page-translations-btn" class="btn btn-info">
                            📄 Initialize Page Names
                        </button>
                        <button id="init-auth-translations-btn" class="btn btn-secondary">
                            🔐 Initialize Auth Portal
                        </button>
                        <button id="extract-text-btn" class="btn btn-success">
                            🔍 Extract App Text
                        </button>
                        <button id="import-translations-btn" class="btn btn-secondary">
                            📥 Import
                        </button>
                        <button id="export-translations-btn" class="btn btn-secondary">
                            📤 Export
                        </button>
                    </div>
                    
                    <div class="toolbar-right">
                        <input 
                            type="text" 
                            id="search-translations" 
                            placeholder="🔍 Search translations..."
                            class="search-input"
                        >
                        <select id="page-filter" class="page-filter">
                            <option value="">All Pages</option>
                            <option value="auth">🔐 Auth Portal</option>
                            <option value="home">🏠 Home Page</option>
                            <option value="users">👥 Users Page</option>
                            <option value="appointments">📅 Appointments</option>
                            <option value="availability">📋 Availability</option>
                            <option value="reports">📊 Reports</option>
                            <option value="settings">⚙️ Settings</option>
                            <option value="translations">🌍 Translations</option>
                            <option value="navigation">🧭 Navigation</option>
                            <option value="common">🔗 Common</option>
                        </select>
                        <select id="category-filter" class="category-filter">
                            <option value="">All Categories</option>
                            <option value="navigation">Navigation</option>
                            <option value="actions">Actions</option>
                            <option value="forms">Forms</option>
                            <option value="messages">Messages</option>
                            <option value="auth">Auth</option>
                            <option value="buttons">Buttons</option>
                            <option value="common">Common</option>
                        </select>
                    </div>
                </div>

                <div class="translations-content">
                    <div class="translations-table-container">
                        <table class="translations-table">
                            <thead>
                                <tr>
                                    <th>Key</th>
                                    <th>🇺🇸 English</th>
                                    <th>🇵🇹 Portuguese</th>
                                    <th>Category</th>
                                    <th>Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="translations-table-body">
                                ${this.renderTranslationRows()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderTranslationRows() {
        if (this.filteredTranslations.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-content">
                            <span class="empty-icon">🌍</span>
                            <h3>No translations found</h3>
                            <p>Add your first translation to get started</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return this.filteredTranslations.map(translation => `
            <tr data-id="${translation.id}" class="translation-row">
                <td class="key-cell">
                    <code>${translation.key}</code>
                    ${translation.category ? `<span class="category-tag">${translation.category}</span>` : ''}
                </td>
                <td class="english-cell">
                    <span class="translation-text">${translation.en}</span>
                </td>
                <td class="portuguese-cell">
                    <span class="translation-text ${!translation.pt ? 'missing' : ''}">${translation.pt || 'Not translated'}</span>
                </td>
                <td class="category-cell">
                    <span class="category-badge">${translation.category || 'General'}</span>
                </td>
                <td class="updated-cell">
                    <span class="updated-date">${this.formatDate(translation.updatedAt)}</span>
                    <span class="updated-by">by ${translation.updatedBy || 'Unknown'}</span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="editTranslation('${translation.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon warning" onclick="deleteTranslation('${translation.id}')" title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderAccessDenied() {
        const container = document.getElementById('translations-content');
        if (!container) return;

        container.innerHTML = `
            <div class="access-denied">
                <div class="access-denied-content">
                    <span class="access-denied-icon">🔒</span>
                    <h2>Access Denied</h2>
                    <p>You don't have permission to manage translations.</p>
                    <p>Please contact an administrator for access.</p>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add translation button
        const addBtn = document.getElementById('add-translation-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openTranslationModal());
        }

        // Auto-translate all button
        const translateAllBtn = document.getElementById('translate-all-btn');
        if (translateAllBtn) {
            translateAllBtn.addEventListener('click', () => this.autoTranslateAll());
        }

        // Initialize Page Translations button
        const initPageTranslationsBtn = document.getElementById('init-page-translations-btn');
        if (initPageTranslationsBtn) {
            initPageTranslationsBtn.addEventListener('click', () => this.initializePageTranslations());
        }

        // Initialize Auth Portal translations button
        const initAuthBtn = document.getElementById('init-auth-translations-btn');
        if (initAuthBtn) {
            initAuthBtn.addEventListener('click', () => this.initializeAuthPortalTranslations());
        }

        // Search functionality
        const searchInput = document.getElementById('search-translations');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.handleCategoryFilter(e.target.value));
        }

        // Page filter
        const pageFilter = document.getElementById('page-filter');
        if (pageFilter) {
            pageFilter.addEventListener('change', (e) => this.handlePageFilter(e.target.value));
        }

        // Export button
        const exportBtn = document.getElementById('export-translations-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTranslations());
        }

        // Extract text button
        const extractBtn = document.getElementById('extract-text-btn');
        if (extractBtn) {
            extractBtn.addEventListener('click', () => this.showTextExtractionModal());
        }
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredTranslations = [...this.translations];
        } else {
            this.filteredTranslations = this.translations.filter(translation =>
                translation.key.toLowerCase().includes(term) ||
                translation.en.toLowerCase().includes(term) ||
                (translation.pt && translation.pt.toLowerCase().includes(term))
            );
        }
        
        this.updateTranslationTable();
    }

    handleCategoryFilter(category) {
        if (category === '') {
            this.filteredTranslations = [...this.translations];
        } else {
            this.filteredTranslations = this.translations.filter(translation =>
                translation.category === category
            );
        }
        
        this.updateTranslationTable();
    }

    handlePageFilter(page) {
        if (page === '') {
            this.filteredTranslations = [...this.translations];
        } else {
            this.filteredTranslations = this.translations.filter(translation => {
                // Filter by translation key prefix that corresponds to the page
                const key = translation.key.toLowerCase();
                
                switch (page) {
                    case 'auth':
                        return key.startsWith('auth.');
                    case 'home':
                        return key.startsWith('home.') || key.startsWith('sections.');
                    case 'users':
                        return key.startsWith('users.') || key.startsWith('user.');
                    case 'appointments':
                        return key.startsWith('appointments.') || key.startsWith('appointment.');
                    case 'availability':
                        return key.startsWith('availability.') || key.startsWith('available.');
                    case 'reports':
                        return key.startsWith('reports.') || key.startsWith('report.');
                    case 'settings':
                        return key.startsWith('settings.') || key.startsWith('setting.');
                    case 'translations':
                        return key.startsWith('translations.') || key.startsWith('translation.');
                    case 'navigation':
                        return key.startsWith('nav.') || key.startsWith('navigation.') || key.startsWith('menu.');
                    case 'common':
                        return key.startsWith('common.') || key.startsWith('buttons.') || key.startsWith('forms.') || key.startsWith('messages.');
                    default:
                        return true;
                }
            });
        }
        
        this.updateTranslationTable();
    }

    updateTranslationTable() {
        const tbody = document.getElementById('translations-table-body');
        if (tbody) {
            tbody.innerHTML = this.renderTranslationRows();
        }
        
        // Update stats if header exists
        this.updateStats();
    }

    updateStats() {
        const totalElement = document.querySelector('.stat-card .stat-number');
        const completionElement = document.querySelectorAll('.stat-card .stat-number')[2];
        
        if (totalElement) {
            totalElement.textContent = this.translations.length;
        }
        
        if (completionElement) {
            completionElement.textContent = this.getCompletionPercentage() + '%';
        }
    }

    openTranslationModal(translationId = null) {
        const isEdit = translationId !== null;
        const translation = isEdit ? this.translations.find(t => t.id === translationId) : null;
        
        console.log('🌍 Opening translation modal for:', translationId || 'new translation');
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Edit Translation' : '➕ Add Translation'}</h3>
                    <button class="modal-close" onclick="closeTranslationModal()">&times;</button>
                </div>
                
                <form id="translation-form" class="translation-form">
                    <div class="form-group">
                        <label for="translation-key">Translation Key:</label>
                        <input 
                            type="text" 
                            id="translation-key" 
                            value="${translation?.key || ''}"
                            placeholder="e.g., nav.home, buttons.save, actions.delete"
                            ${isEdit ? 'readonly' : ''}
                            required
                        >
                        <small class="form-hint">Use dot notation for organization (nav.home, buttons.save, etc.)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="translation-category">Category:</label>
                        <select id="translation-category">
                            <option value="general" ${translation?.category === 'general' ? 'selected' : ''}>General</option>
                            <option value="navigation" ${translation?.category === 'navigation' ? 'selected' : ''}>Navigation</option>
                            <option value="actions" ${translation?.category === 'actions' ? 'selected' : ''}>Actions</option>
                            <option value="buttons" ${translation?.category === 'buttons' ? 'selected' : ''}>Buttons</option>
                            <option value="forms" ${translation?.category === 'forms' ? 'selected' : ''}>Forms</option>
                            <option value="messages" ${translation?.category === 'messages' ? 'selected' : ''}>Messages</option>
                            <option value="auth" ${translation?.category === 'auth' ? 'selected' : ''}>Authentication</option>
                            <option value="appointments" ${translation?.category === 'appointments' ? 'selected' : ''}>Appointments</option>
                            <option value="reports" ${translation?.category === 'reports' ? 'selected' : ''}>Reports</option>
                            <option value="settings" ${translation?.category === 'settings' ? 'selected' : ''}>Settings</option>
                            <option value="time" ${translation?.category === 'time' ? 'selected' : ''}>Time & Dates</option>
                            <option value="status" ${translation?.category === 'status' ? 'selected' : ''}>Status</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="english-text">🇺🇸 English (Primary Language):</label>
                        <input 
                            type="text" 
                            id="english-text" 
                            value="${translation?.en || ''}"
                            placeholder="English text"
                            required
                        >
                        <small class="form-hint">This is the primary text that will be displayed if no translation exists</small>
                    </div>
                    
                    <div class="form-group portuguese-translation-group">
                        <div class="label-with-action">
                            <label for="portuguese-text">🇵🇹 Portuguese Translation:</label>
                            <button type="button" class="btn btn-small btn-secondary" id="auto-translate-btn" title="Auto-translate from English to Portuguese">
                                🔄 Auto-translate
                            </button>
                        </div>
                        <input 
                            type="text" 
                            id="portuguese-text" 
                            value="${translation?.pt || ''}"
                            placeholder="Portuguese translation (will auto-translate if empty)"
                        >
                        <small class="form-hint">Click "Auto-translate" to generate Portuguese translation, or type manually</small>
                    </div>

                    <div class="form-group">
                        <label for="translation-page">📄 Page:</label>
                        <select id="translation-page">
                            <option value="">Select Page</option>
                            <option value="auth" ${translation?.key?.startsWith('auth.') ? 'selected' : ''}>🔐 Auth Portal</option>
                            <option value="home" ${translation?.key?.startsWith('home.') || translation?.key?.startsWith('sections.') ? 'selected' : ''}>🏠 Home Page</option>
                            <option value="users" ${translation?.key?.startsWith('users.') || translation?.key?.startsWith('user.') ? 'selected' : ''}>👥 Users Page</option>
                            <option value="appointments" ${translation?.key?.startsWith('appointments.') || translation?.key?.startsWith('appointment.') ? 'selected' : ''}>📅 Appointments</option>
                            <option value="availability" ${translation?.key?.startsWith('availability.') ? 'selected' : ''}>📋 Availability</option>
                            <option value="reports" ${translation?.key?.startsWith('reports.') ? 'selected' : ''}>📊 Reports</option>
                            <option value="settings" ${translation?.key?.startsWith('settings.') ? 'selected' : ''}>⚙️ Settings</option>
                            <option value="translations" ${translation?.key?.startsWith('translations.') ? 'selected' : ''}>🌍 Translations</option>
                            <option value="navigation" ${translation?.key?.startsWith('nav.') || translation?.key?.startsWith('navigation.') || translation?.key?.startsWith('menu.') ? 'selected' : ''}>🧭 Navigation</option>
                            <option value="common" ${translation?.key?.startsWith('common.') || translation?.key?.startsWith('buttons.') || translation?.key?.startsWith('forms.') || translation?.key?.startsWith('messages.') ? 'selected' : ''}>🔗 Common</option>
                        </select>
                        <small class="form-hint">Select which page this translation belongs to</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="translation-category">🏷️ Category:</label>
                        <select id="translation-category">
                            <option value="">Select Category</option>
                            <option value="navigation" ${translation?.category === 'navigation' ? 'selected' : ''}>Navigation</option>
                            <option value="actions" ${translation?.category === 'actions' ? 'selected' : ''}>Actions</option>
                            <option value="forms" ${translation?.category === 'forms' ? 'selected' : ''}>Forms</option>
                            <option value="messages" ${translation?.category === 'messages' ? 'selected' : ''}>Messages</option>
                            <option value="auth" ${translation?.category === 'auth' ? 'selected' : ''}>Auth</option>
                            <option value="buttons" ${translation?.category === 'buttons' ? 'selected' : ''}>Buttons</option>
                            <option value="common" ${translation?.category === 'common' ? 'selected' : ''}>Common</option>
                        </select>
                        <small class="form-hint">Select the type/category of this translation</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeTranslationModal()">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? '💾 Update Translation' : '➕ Add Translation'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup auto-translate button
        const autoTranslateBtn = document.getElementById('auto-translate-btn');
        const englishInput = document.getElementById('english-text');
        const portugueseInput = document.getElementById('portuguese-text');
        
        if (autoTranslateBtn && englishInput && portugueseInput) {
            autoTranslateBtn.addEventListener('click', async () => {
                const englishText = englishInput.value.trim();
                
                if (!englishText) {
                    showNotification('Please enter English text first', 'warning');
                    englishInput.focus();
                    return;
                }
                
                // Show loading state
                autoTranslateBtn.disabled = true;
                autoTranslateBtn.innerHTML = '⏳ Translating...';
                
                try {
                    // Auto-translate
                    const translated = await translateText(englishText, 'pt');
                    portugueseInput.value = translated;
                    
                    // Success feedback
                    showNotification('✅ Translated to Portuguese!', 'success');
                    autoTranslateBtn.innerHTML = '✅ Translated';
                    
                    // Reset button after 2 seconds
                    setTimeout(() => {
                        autoTranslateBtn.innerHTML = '🔄 Auto-translate';
                        autoTranslateBtn.disabled = false;
                    }, 2000);
                    
                } catch (error) {
                    console.error('Translation error:', error);
                    showNotification('Failed to translate. Please try manually.', 'error');
                    autoTranslateBtn.innerHTML = '🔄 Auto-translate';
                    autoTranslateBtn.disabled = false;
                }
            });
        }
        
        // Setup form submission
        const form = document.getElementById('translation-form');
        form.addEventListener('submit', (e) => this.handleTranslationSubmit(e, isEdit));
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([readonly])');
            if (firstInput) firstInput.focus();
        }, 100);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTranslationModal();
            }
        });
    }

    async handleTranslationSubmit(event, isEdit) {
        event.preventDefault();
        
        const key = document.getElementById('translation-key').value.trim();
        const category = document.getElementById('translation-category').value;
        const englishText = document.getElementById('english-text').value.trim();
        const portugueseText = document.getElementById('portuguese-text').value.trim();
        
        if (!key || !englishText) {
            showNotification('Key and English text are required', 'error');
            return;
        }
        
        // Validate key format
        if (!/^[a-zA-Z][a-zA-Z0-9._]*$/.test(key)) {
            showNotification('Key must start with a letter and contain only letters, numbers, dots, and underscores', 'error');
            return;
        }
        
        try {
            // Disable submit button to prevent double submission
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = isEdit ? '💾 Updating...' : '➕ Adding...';
            
            const success = await saveTranslationEntry(key, englishText, portugueseText, category);
            
            if (success) {
                closeTranslationModal();
                // Real-time updates will refresh the table automatically
            }
        } catch (error) {
            console.error('❌ Error saving translation:', error);
            showNotification('Error saving translation', 'error');
        } finally {
            // Re-enable submit button
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = isEdit ? '💾 Update Translation' : '➕ Add Translation';
            }
        }
    }

    async exportTranslations() {
        try {
            const exportData = await exportTranslations();
            if (!exportData) {
                showNotification('Error exporting translations', 'error');
                return;
            }
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `grdlhub-translations-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            showNotification(`Exported ${exportData.totalTranslations} translations successfully!`, 'success');
        } catch (error) {
            console.error('❌ Error exporting translations:', error);
            showNotification('Error exporting translations', 'error');
        }
    }

    formatDate(date) {
        if (!date) return 'Never';
        
        let dateObj;
        
        // Handle Firestore timestamp objects
        if (date && typeof date.toDate === 'function') {
            dateObj = date.toDate();
        } else if (date && typeof date.seconds === 'number') {
            // Handle Firestore timestamp as plain object
            dateObj = new Date(date.seconds * 1000);
        } else {
            // Handle regular date strings/objects
            dateObj = new Date(date);
        }
        
        // Check if the date is valid
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }
        
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(dateObj);
    }

    async showTextExtractionModal() {
        console.log('🔍 Opening text extraction modal...');
        
        // Show loading notification
        showNotification('🔍 Extracting text from application...', 'info');
        
        try {
            // Extract all text
            await this.textExtractor.extractAllText();
            
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'modal-overlay extraction-modal';
            modal.innerHTML = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>🔍 App Text Extraction</h3>
                        <button class="modal-close" onclick="closeExtractionModal()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="extraction-intro">
                            <p><strong>Perfect! Here's all the English text I found in your app.</strong></p>
                            <p>Simply fill in the Portuguese translations and click "Save Selected" to add them to your translation system.</p>
                        </div>
                        
                        ${this.textExtractor.renderExtractionTable()}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Setup event listeners
            this.textExtractor.setupExtractionEventListeners();
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeExtractionModal();
                }
            });
            
            showNotification(`✅ Found ${this.textExtractor.translationData.length} texts ready for translation!`, 'success');
            
        } catch (error) {
            console.error('❌ Error extracting text:', error);
            showNotification('Error extracting text from application', 'error');
        }
    }

    getCompletionPercentage() {
        const translated = this.translations.filter(t => t.pt && t.pt.trim() !== '').length;
        return this.translations.length > 0 ? Math.round((translated / this.translations.length) * 100) : 0;
    }

    async autoTranslateAll() {
        console.log('🔄 Starting bulk auto-translation...');
        
        // Find all translations missing Portuguese
        const missingTranslations = this.translations.filter(t => !t.pt || t.pt.trim() === '');
        
        if (missingTranslations.length === 0) {
            showNotification('✅ All translations already have Portuguese text!', 'info');
            return;
        }
        
        // Confirm action
        const confirmed = confirm(
            `This will auto-translate ${missingTranslations.length} entries from English to Portuguese.\n\n` +
            `You can review and edit any translations afterwards.\n\n` +
            `Continue?`
        );
        
        if (!confirmed) return;
        
        // Show progress notification
        showNotification(`🔄 Translating ${missingTranslations.length} entries...`, 'info');
        
        try {
            let successCount = 0;
            let failCount = 0;
            
            // Process translations in batches
            for (const translation of missingTranslations) {
                try {
                    // Auto-translate
                    const portugueseText = await translateText(translation.en, 'pt');
                    
                    // Update translation
                    const updatedTranslation = {
                        ...translation,
                        pt: portugueseText,
                        updatedAt: new Date(),
                        updatedBy: getCurrentUser()?.email || 'System',
                        autoTranslated: true // Mark as auto-translated
                    };
                    
                    // Save to Firestore
                    await saveTranslationEntry(updatedTranslation);
                    successCount++;
                    
                    // Update progress every 5 translations
                    if (successCount % 5 === 0) {
                        showNotification(
                            `🔄 Progress: ${successCount}/${missingTranslations.length} translated...`,
                            'info'
                        );
                    }
                    
                } catch (error) {
                    console.error(`Failed to translate ${translation.key}:`, error);
                    failCount++;
                }
            }
            
            // Reload translations
            await this.loadTranslations();
            this.updateTranslationTable();
            this.updateStats();
            
            // Show results
            if (failCount === 0) {
                showNotification(
                    `✅ Successfully auto-translated all ${successCount} entries!`,
                    'success'
                );
            } else {
                showNotification(
                    `✅ Translated ${successCount} entries (${failCount} failed)`,
                    'warning'
                );
            }
            
        } catch (error) {
            console.error('❌ Error during bulk translation:', error);
            showNotification('Error during bulk translation. Please try again.', 'error');
        }
    }

    async initializeAuthPortalTranslations() {
        try {
            console.log('🔐 Initializing Auth Portal translations...');
            showNotification('🔐 Initializing Auth Portal translations...', 'info');

            const { saveTranslationEntry } = await import('../utils/translationManagement.js');

            // Define the auth portal translations we need
            const authTranslations = [
                { key: 'auth.title', en: 'GrdlHub', pt: 'GrdlHub', category: 'auth' },
                { key: 'auth.subtitle', en: 'Secure Access Portal', pt: 'Portal de Acesso Seguro', category: 'auth' },
                { key: 'auth.signin', en: 'Sign In', pt: 'Entrar', category: 'auth' },
                { key: 'auth.email_prompt', en: 'Enter your email address to access GrdlHub', pt: 'Digite seu endereço de email para acessar o GrdlHub', category: 'auth' },
                { key: 'auth.email_label', en: 'Email Address', pt: 'Endereço de Email', category: 'auth' },
                { key: 'auth.email_placeholder', en: 'your.email@example.com', pt: 'seu.email@exemplo.com', category: 'auth' },
                { key: 'auth.signin_button', en: 'Sign In', pt: 'Entrar', category: 'auth' },
                { key: 'auth.secure_note', en: '🔒 Secure email-based authentication', pt: '🔒 Autenticação segura baseada em email', category: 'auth' },
                { key: 'auth.processing', en: 'Processing...', pt: 'Processando...', category: 'auth' },
                { key: 'auth.check_email', en: 'Check your email for the sign-in link', pt: 'Verifique seu email pelo link de acesso', category: 'auth' },
                { key: 'auth.link_sent', en: 'Sign-in Link Sent', pt: 'Link de Acesso Enviado', category: 'auth' },
                { key: 'auth.sent_to', en: 'We\'ve sent a secure sign-in link to:', pt: 'Enviamos um link de acesso seguro para:', category: 'auth' },
                { key: 'auth.next_steps', en: 'Next Steps:', pt: 'Próximos Passos:', category: 'auth' },
                { key: 'auth.step1', en: 'Check your email inbox (and spam folder)', pt: 'Verifique sua caixa de entrada (e pasta de spam)', category: 'auth' },
                { key: 'auth.step2', en: 'Click the sign-in link', pt: 'Clique no link de acesso', category: 'auth' },
                { key: 'auth.step3', en: 'You\'ll be automatically signed in', pt: 'Você será conectado automaticamente', category: 'auth' },
                { key: 'auth.try_different', en: 'Try Different Email', pt: 'Tentar Email Diferente', category: 'auth' }
            ];

            let successCount = 0;
            
            for (const translation of authTranslations) {
                try {
                    await saveTranslationEntry(translation.key, translation.en, translation.pt, translation.category);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Error saving translation ${translation.key}:`, error);
                }
            }

            // Reload translations
            await this.loadTranslations();
            this.updateTranslationTable();
            this.updateStats();

            showNotification(`✅ Initialized ${successCount}/${authTranslations.length} Auth Portal translations!`, 'success');
            
        } catch (error) {
            console.error('❌ Error initializing Auth Portal translations:', error);
            showNotification('Error initializing Auth Portal translations', 'error');
        }
    }

    async initializePageTranslations() {
        try {
            console.log('📄 Initializing Page Name translations...');
            showNotification('📄 Initializing Page Name translations...', 'info');

            const { saveTranslationEntry } = await import('../utils/translationManagement.js');

            // Define all page name translations from PAGE_REGISTRY
            const pageTranslations = [
                // Main Pages
                { key: 'pages.home', en: 'Home', pt: 'Início', category: 'navigation' },
                { key: 'pages.users', en: 'Users', pt: 'Utilizadores', category: 'navigation' },
                { key: 'pages.pages', en: 'Pages', pt: 'Páginas', category: 'navigation' },
                { key: 'pages.content', en: 'Content', pt: 'Conteúdo', category: 'navigation' },
                { key: 'pages.templates', en: 'Templates', pt: 'Modelos', category: 'navigation' },
                { key: 'pages.settings', en: 'Settings', pt: 'Definições', category: 'navigation' },
                { key: 'pages.translations', en: 'Translations', pt: 'Traduções', category: 'navigation' },
                { key: 'pages.appointments', en: 'Appointments', pt: 'Compromissos', category: 'navigation' },
                { key: 'pages.availability', en: 'Availability', pt: 'Disponibilidade', category: 'navigation' },
                { key: 'pages.availability-tracker', en: 'Availability Tracker', pt: 'Rastreador de Disponibilidade', category: 'navigation' },
                { key: 'pages.availability-forms', en: 'Availability Forms', pt: 'Formulários de Disponibilidade', category: 'navigation' },
                { key: 'pages.reports', en: 'Reports', pt: 'Relatórios', category: 'navigation' },
                { key: 'pages.field-service-meetings', en: 'Field Service Schedule', pt: 'Agenda de Serviço de Campo', category: 'navigation' },
                { key: 'pages.admin', en: 'Admin', pt: 'Administrador', category: 'navigation' },
                
                // Page Descriptions
                { key: 'pages.home.description', en: 'Dashboard and overview', pt: 'Painel e visão geral', category: 'navigation' },
                { key: 'pages.users.description', en: 'User management', pt: 'Gestão de utilizadores', category: 'navigation' },
                { key: 'pages.pages.description', en: 'Page configuration', pt: 'Configuração de páginas', category: 'navigation' },
                { key: 'pages.content.description', en: 'Content management', pt: 'Gestão de conteúdo', category: 'navigation' },
                { key: 'pages.templates.description', en: 'Document templates', pt: 'Modelos de documentos', category: 'navigation' },
                { key: 'pages.settings.description', en: 'Application settings', pt: 'Definições da aplicação', category: 'navigation' },
                { key: 'pages.translations.description', en: 'Translation management', pt: 'Gestão de traduções', category: 'navigation' },
                { key: 'pages.appointments.description', en: 'Appointment scheduling', pt: 'Agendamento de compromissos', category: 'navigation' },
                { key: 'pages.availability.description', en: 'Availability management', pt: 'Gestão de disponibilidade', category: 'navigation' },
                { key: 'pages.reports.description', en: 'Reports and analytics', pt: 'Relatórios e análises', category: 'navigation' },
                
                // Navigation elements
                { key: 'nav.back_to_home', en: 'Back to Home', pt: 'Voltar ao Início', category: 'navigation' },
                { key: 'nav.sign_out', en: 'Sign Out', pt: 'Sair', category: 'navigation' },
                { key: 'nav.user_settings', en: 'User Settings', pt: 'Definições de Utilizador', category: 'navigation' },
                
                // Common UI elements
                { key: 'common.language', en: 'Language', pt: 'Idioma', category: 'ui' },
                { key: 'common.english', en: 'English', pt: 'Inglês', category: 'ui' },
                { key: 'common.portuguese', en: 'Portuguese', pt: 'Português', category: 'ui' },
            ];

            let successCount = 0;
            let skippedCount = 0;
            
            for (const translation of pageTranslations) {
                try {
                    // Check if translation already exists
                    const existing = this.translations.find(t => t.key === translation.key);
                    
                    if (existing && existing.pt && existing.pt !== translation.key) {
                        // Already has Portuguese translation, skip
                        skippedCount++;
                        continue;
                    }
                    
                    await saveTranslationEntry(translation.key, translation.en, translation.pt, translation.category);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Error saving translation ${translation.key}:`, error);
                }
            }

            // Reload translations
            await this.loadTranslations();
            this.updateTranslationTable();
            this.updateStats();

            showNotification(
                `✅ Initialized ${successCount} page translations! (${skippedCount} already existed)`,
                'success'
            );
            
        } catch (error) {
            console.error('❌ Error initializing page translations:', error);
            showNotification('Error initializing page translations', 'error');
        }
    }
}

// Global instance
const translationManager = new TranslationManager();

// Global functions for modal interactions
window.closeTranslationModal = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
};

window.closeExtractionModal = function() {
    const modal = document.querySelector('.extraction-modal');
    if (modal) {
        modal.remove();
    }
};

window.confirmDeleteTranslation = function(translationId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h3>🗑️ Delete Translation</h3>
                <button class="modal-close" onclick="closeDeleteModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this translation?</p>
                <p class="warning-text">⚠️ This action cannot be undone and may affect the application display.</p>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeDeleteModal()">
                    Cancel
                </button>
                <button type="button" class="btn btn-danger" onclick="executeDelete('${translationId}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDeleteModal();
        }
    });
};

window.closeDeleteModal = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
};

window.executeDelete = async function(translationId) {
    try {
        const deleteBtn = document.querySelector('.btn-danger');
        deleteBtn.disabled = true;
        deleteBtn.textContent = '🗑️ Deleting...';
        
        const success = await deleteTranslationEntry(translationId);
        
        if (success) {
            closeDeleteModal();
            // Real-time updates will refresh the table automatically
        }
    } catch (error) {
        console.error('❌ Error deleting translation:', error);
        showNotification('Error deleting translation', 'error');
    } finally {
        const deleteBtn = document.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑️ Delete';
        }
    }
};

// Global functions for buttons
window.editTranslation = function(id) {
    translationManager.openTranslationModal(id);
};

window.deleteTranslation = function(id) {
    confirmDeleteTranslation(id);
};

// Export for use in other modules
export function initializeTranslationsPage() {
    console.log('🌍 Initializing Translations page...');
    translationManager.initialize();
}