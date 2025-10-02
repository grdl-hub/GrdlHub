// Language Switcher Component
// Displays language selection dropdown in the UI

import { getCurrentLanguage, setLanguage, getAvailableLanguages } from '../utils/i18n.js';

export class LanguageSwitcher {
    constructor(containerId = 'language-switcher') {
        this.containerId = containerId;
        this.currentLanguage = getCurrentLanguage();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Language switcher container not found:', this.containerId);
            return;
        }

        const languages = [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' }
        ];

        container.innerHTML = `
            <div class="language-switcher">
                <select id="language-select" class="language-select">
                    ${languages.map(lang => `
                        <option value="${lang.code}" ${lang.code === this.currentLanguage ? 'selected' : ''}>
                            ${lang.flag} ${lang.name}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        // Add event listener
        const select = container.querySelector('#language-select');
        if (select) {
            select.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
    }

    changeLanguage(languageCode) {
        console.log('🌍 Changing language to:', languageCode);
        setLanguage(languageCode);
        this.currentLanguage = languageCode;
        
        // Show notification
        if (window.showNotification) {
            const languageName = languageCode === 'en' ? 'English' : 'Português';
            window.showNotification(`Language changed to ${languageName}`, 'success');
        }
    }
}

// CSS for language switcher
export const languageSwitcherCSS = `
.language-switcher {
    display: inline-block;
}

.language-select {
    background: var(--bg-primary);
    border: 1px solid var(--gray-400);
    border-radius: 4px;
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
}

.language-select:hover {
    border-color: var(--primary-color);
}

.language-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

@media (max-width: 768px) {
    .language-select {
        font-size: 0.8rem;
        padding: var(--spacing-xs);
    }
}
`;

export default LanguageSwitcher;