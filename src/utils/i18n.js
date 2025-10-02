// Internationalization (i18n) utilities for GrdlHub
// Handles translation retrieval and language switching

import { getTranslationEntries } from './translationManagement.js';

class I18nManager {
    constructor() {
        this.currentLanguage = 'en'; // Default to English
        this.translations = new Map();
        this.fallbackLanguage = 'en';
        this.initialized = false;
    }

    /**
     * Initialize the translation system
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('🌍 Initializing i18n system...');
            
            // Load current language preference from localStorage
            this.currentLanguage = localStorage.getItem('grdlhub-language') || 'en';
            console.log('🌍 Current language:', this.currentLanguage);

            // Load all translations from Firestore
            await this.loadTranslations();
            
            this.initialized = true;
            console.log('✅ i18n system initialized');
        } catch (error) {
            console.error('❌ Error initializing i18n:', error);
        }
    }

    /**
     * Load translations from Firestore
     */
    async loadTranslations() {
        try {
            const entries = await getTranslationEntries();
            
            // Convert to Map for faster lookups
            this.translations.clear();
            entries.forEach(entry => {
                this.translations.set(entry.key, {
                    en: entry.en,
                    pt: entry.pt || entry.en, // Fallback to English if Portuguese not available
                    category: entry.category
                });
            });

            console.log(`🌍 Loaded ${entries.length} translations`);
        } catch (error) {
            console.error('❌ Error loading translations:', error);
        }
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key (e.g., 'nav.home')
     * @param {Object} variables - Variables to substitute in translation
     * @returns {string} Translated text
     */
    t(key, variables = {}) {
        const translation = this.translations.get(key);
        
        if (!translation) {
            console.warn(`🌍 Translation missing for key: ${key}`);
            return key; // Return the key itself as fallback
        }

        let text = translation[this.currentLanguage] || translation[this.fallbackLanguage] || key;

        // Simple variable substitution
        Object.keys(variables).forEach(variable => {
            text = text.replace(`{{${variable}}}`, variables[variable]);
        });

        return text;
    }

    /**
     * Switch language
     * @param {string} language - Language code ('en' or 'pt')
     */
    setLanguage(language) {
        if (!['en', 'pt'].includes(language)) {
            console.error('🌍 Unsupported language:', language);
            return;
        }

        this.currentLanguage = language;
        localStorage.setItem('grdlhub-language', language);
        
        console.log('🌍 Language switched to:', language);
        
        // Trigger page refresh or re-render to apply new language
        this.notifyLanguageChange();
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' }
        ];
    }

    /**
     * Notify components about language change
     */
    notifyLanguageChange() {
        // Dispatch custom event that components can listen to
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
    }

    /**
     * Reload translations (useful after adding new translations)
     */
    async reload() {
        await this.loadTranslations();
        this.notifyLanguageChange();
    }
}

// Global instance
const i18n = new I18nManager();

// Global translation function
window.t = (key, variables) => i18n.t(key, variables);

// Language switching function
window.setLanguage = (language) => i18n.setLanguage(language);

export default i18n;
export { i18n };

/**
 * Helper function for translations
 * @param {string} key - Translation key
 * @param {Object} variables - Variables to substitute
 * @returns {string} Translated text
 */
export function t(key, variables = {}) {
    return i18n.t(key, variables);
}

/**
 * Initialize i18n system
 */
export async function initializeI18n() {
    await i18n.initialize();
}

/**
 * Set application language
 * @param {string} language - Language code ('en' or 'pt')
 */
export function setLanguage(language) {
    i18n.setLanguage(language);
}

/**
 * Get current language
 */
export function getCurrentLanguage() {
    return i18n.getCurrentLanguage();
}

/**
 * Reload translations from Firestore
 */
export async function reloadTranslations() {
    await i18n.reload();
}