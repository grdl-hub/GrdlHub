// Text Extraction Tool
// Automatically finds all English text in the application for translation

import { saveTranslationEntry } from './translationManagement.js';
import { showNotification } from './notifications.js';

export class TextExtractor {
    constructor() {
        this.extractedTexts = new Set();
        this.translationData = [];
        this.excludePatterns = [
            /^[0-9\s\-\+\(\)\[\]{}]*$/, // Numbers and symbols only
            /^[a-z_\-]+\.(js|css|html|png|jpg|svg)$/i, // File names
            /^[A-Z_]+$/, // Constants
            /^https?:\/\//, // URLs
            /^#[a-fA-F0-9]+$/, // Color codes
            /^[0-9]+px$/, // CSS pixels
            /^var\(--/, // CSS variables
            /^\s*$/, // Empty or whitespace only
        ];
    }

    /**
     * Extract all English text from the application
     */
    async extractAllText() {
        console.log('🔍 Starting text extraction...');
        
        // Extract from JavaScript files
        await this.extractFromJavaScript();
        
        // Extract from HTML templates
        await this.extractFromHTML();
        
        // Extract from current DOM
        this.extractFromDOM();
        
        // Process and categorize
        this.processExtractedText();
        
        console.log(`✅ Extracted ${this.translationData.length} translatable texts`);
        return this.translationData;
    }

    /**
     * Extract text from JavaScript files (analyze common patterns)
     */
    async extractFromJavaScript() {
        // Common text patterns in JavaScript
        const jsTexts = [
            // Navigation
            'Home', 'Settings', 'Users', 'Reports', 'Appointments', 'Availability',
            'Monthly View', 'Content', 'Pages', 'Translations',
            
            // Buttons & Actions
            'Save', 'Cancel', 'Delete', 'Edit', 'Add', 'Create', 'Update', 'Remove',
            'Submit', 'Reset', 'Clear', 'Search', 'Filter', 'Export', 'Import',
            'Login', 'Logout', 'Sign In', 'Sign Up', 'Register',
            
            // Messages
            'Success!', 'Error occurred', 'Loading...', 'Please wait',
            'Are you sure?', 'Confirm deletion', 'Operation completed',
            'Something went wrong', 'Try again', 'No data found',
            'Access denied', 'Permission required', 'Invalid input',
            
            // Common Labels
            'Name', 'Email', 'Password', 'Date', 'Time', 'Status', 'Category',
            'Description', 'Title', 'Type', 'Role', 'User', 'Admin',
            'Created', 'Updated', 'Last modified', 'By', 'On',
            
            // App-specific terms
            'Appointments & Scheduling', 'Manage recurring appointments',
            'My Availability Calendar', 'Mark your availability',
            'Translation Management', 'Interface translation management',
            'User Management', 'Manage users and permissions',
            'Home Sections', 'Configure home page sections',
            
            // Forms
            'Required field', 'Optional', 'Choose option', 'Select',
            'Enter text', 'Upload file', 'Browse', 'Attach',
            
            // Time & Dates
            'Today', 'Yesterday', 'Tomorrow', 'This week', 'Last week',
            'This month', 'Last month', 'January', 'February', 'March',
            'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December',
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
            'Saturday', 'Sunday',
            
            // Status
            'Active', 'Inactive', 'Enabled', 'Disabled', 'Available',
            'Unavailable', 'Online', 'Offline', 'Connected', 'Disconnected',
            'Pending', 'Approved', 'Rejected', 'Complete', 'Incomplete',
            
            // Notifications
            'Welcome to GrdlHub!', 'Setup complete', 'Profile updated',
            'Password changed', 'Settings saved', 'Data exported',
            'File uploaded', 'Email sent', 'Invitation sent',
        ];

        jsTexts.forEach(text => {
            if (this.isValidText(text)) {
                this.extractedTexts.add(text);
            }
        });
    }

    /**
     * Extract from HTML templates and current DOM
     */
    extractFromHTML() {
        // Get all text content from current page
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip script and style tags
                    const parent = node.parentElement;
                    if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            const text = textNode.textContent.trim();
            if (this.isValidText(text)) {
                this.extractedTexts.add(text);
            }
        }
    }

    /**
     * Extract from current DOM elements
     */
    extractFromDOM() {
        // Extract from common attributes
        const elements = document.querySelectorAll('[title], [placeholder], [alt]');
        elements.forEach(el => {
            ['title', 'placeholder', 'alt'].forEach(attr => {
                const text = el.getAttribute(attr);
                if (text && this.isValidText(text)) {
                    this.extractedTexts.add(text);
                }
            });
        });
    }

    /**
     * Check if text is valid for translation
     */
    isValidText(text) {
        if (!text || text.length < 2 || text.length > 200) return false;
        
        // Check exclude patterns
        for (const pattern of this.excludePatterns) {
            if (pattern.test(text)) return false;
        }
        
        // Must contain at least one letter
        if (!/[a-zA-Z]/.test(text)) return false;
        
        return true;
    }

    /**
     * Process and categorize extracted text
     */
    processExtractedText() {
        const categorizedTexts = Array.from(this.extractedTexts).map(text => {
            return {
                id: this.generateKey(text),
                key: this.generateKey(text),
                en: text,
                pt: '', // Empty for user to fill
                category: this.categorizeText(text),
                extracted: true,
                needsTranslation: true
            };
        });

        // Sort by category and text length
        this.translationData = categorizedTexts.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.en.length - b.en.length;
        });
    }

    /**
     * Generate translation key from text
     */
    generateKey(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .trim()
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50); // Limit length
    }

    /**
     * Categorize text based on content
     */
    categorizeText(text) {
        const categories = {
            navigation: ['home', 'settings', 'users', 'reports', 'menu', 'page'],
            buttons: ['save', 'cancel', 'delete', 'edit', 'add', 'create', 'submit', 'reset'],
            messages: ['success', 'error', 'loading', 'please', 'try again', 'confirm'],
            forms: ['name', 'email', 'password', 'enter', 'select', 'choose', 'required'],
            time: ['today', 'yesterday', 'week', 'month', 'january', 'monday'],
            status: ['active', 'enabled', 'available', 'online', 'pending', 'complete'],
            auth: ['login', 'logout', 'sign', 'register', 'password', 'permission'],
            appointments: ['appointment', 'schedule', 'availability', 'calendar'],
        };

        const lowerText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    /**
     * Render extraction results in a table for easy translation
     */
    renderExtractionTable() {
        return `
            <div class="text-extraction-results">
                <div class="extraction-header">
                    <h3>🔍 Extracted Text for Translation</h3>
                    <p>Found ${this.translationData.length} texts that need Portuguese translation</p>
                    <div class="extraction-actions">
                        <button id="select-all-btn" class="btn btn-secondary">Select All</button>
                        <button id="bulk-save-btn" class="btn btn-primary">Save Selected</button>
                        <button id="export-csv-btn" class="btn btn-secondary">Export CSV</button>
                    </div>
                </div>
                
                <div class="extraction-table-container">
                    <table class="extraction-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="select-all-checkbox"></th>
                                <th>Category</th>
                                <th>🇺🇸 English Text</th>
                                <th>🇵🇹 Portuguese Translation</th>
                                <th>Suggested Key</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.translationData.map((item, index) => `
                                <tr data-index="${index}">
                                    <td>
                                        <input type="checkbox" class="item-checkbox" data-index="${index}">
                                    </td>
                                    <td>
                                        <span class="category-badge">${item.category}</span>
                                    </td>
                                    <td class="english-text">${item.en}</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            class="portuguese-input" 
                                            data-index="${index}"
                                            placeholder="Enter Portuguese translation..."
                                            value="${item.pt}"
                                        >
                                    </td>
                                    <td class="key-text">
                                        <code>${item.key}</code>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for the extraction table
     */
    setupExtractionEventListeners() {
        // Select all functionality
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }

        // Bulk save functionality
        const bulkSaveBtn = document.getElementById('bulk-save-btn');
        if (bulkSaveBtn) {
            bulkSaveBtn.addEventListener('click', () => this.bulkSaveTranslations());
        }

        // Export CSV functionality
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Update translation data when Portuguese input changes
        document.querySelectorAll('.portuguese-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.translationData[index].pt = e.target.value;
            });
        });
    }

    /**
     * Save selected translations to Firestore
     */
    async bulkSaveTranslations() {
        const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
        let savedCount = 0;
        let errorCount = 0;

        for (const checkbox of selectedCheckboxes) {
            const index = parseInt(checkbox.dataset.index);
            const item = this.translationData[index];
            
            if (item.pt && item.pt.trim()) {
                try {
                    await saveTranslationEntry(item.key, item.en, item.pt, item.category);
                    savedCount++;
                } catch (error) {
                    console.error('Error saving translation:', item.key, error);
                    errorCount++;
                }
            }
        }

        if (savedCount > 0) {
            showNotification(`✅ Saved ${savedCount} translations successfully!`, 'success');
        }
        if (errorCount > 0) {
            showNotification(`❌ Failed to save ${errorCount} translations`, 'error');
        }
    }

    /**
     * Export to CSV for external translation
     */
    exportToCSV() {
        const csvContent = [
            ['Category', 'English', 'Portuguese', 'Key'],
            ...this.translationData.map(item => [
                item.category,
                `"${item.en.replace(/"/g, '""')}"`,
                `"${item.pt.replace(/"/g, '""')}"`,
                item.key
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grdlhub-translations-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

export default TextExtractor;