// Translation Management Page
// Dedicated admin interface for managing translations with Firestore backend

import { getCurrentUser } from '../auth.js';
import { showNotification } from '../utils/notifications.js';
import { hasPageAccess } from '../accessControl.js';
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
                        <select id="category-filter" class="category-filter">
                            <option value="">All Categories</option>
                            <option value="navigation">Navigation</option>
                            <option value="actions">Actions</option>
                            <option value="forms">Forms</option>
                            <option value="messages">Messages</option>
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
                    <span class="updated-by">by ${translation.updatedBy}</span>
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

        // Export button
        const exportBtn = document.getElementById('export-translations-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTranslations());
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
                    
                    <div class="form-group">
                        <label for="portuguese-text">🇵🇹 Portuguese Translation:</label>
                        <input 
                            type="text" 
                            id="portuguese-text" 
                            value="${translation?.pt || ''}"
                            placeholder="Portuguese translation (optional)"
                        >
                        <small class="form-hint">Leave empty if translation is not available yet</small>
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
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    getCompletionPercentage() {
        const translated = this.translations.filter(t => t.pt && t.pt.trim() !== '').length;
        return Math.round((translated / this.translations.length) * 100);
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