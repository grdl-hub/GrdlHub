/**
 * Simple Translation Utility
 * Basic i18n functionality for the application
 */

// Default language
let currentLanguage = 'en'

// Translation storage
const translations = {
  en: {
    // Add English translations as needed
  },
  pt: {
    // Add Portuguese translations as needed
  }
}

/**
 * Get translated text for a given key
 * @param {string} key - The translation key
 * @param {string} defaultText - Default text if translation not found
 * @returns {string} Translated text or default text
 */
export function getTranslatedText(key, defaultText = key) {
  const currentTranslations = translations[currentLanguage] || translations.en
  return currentTranslations[key] || defaultText
}

/**
 * Set the current language
 * @param {string} lang - Language code (e.g., 'en', 'pt')
 */
export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang
  }
}

/**
 * Get current language
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Add translations for a language
 * @param {string} lang - Language code
 * @param {Object} translationMap - Object with key-value pairs
 */
export function addTranslations(lang, translationMap) {
  if (!translations[lang]) {
    translations[lang] = {}
  }
  Object.assign(translations[lang], translationMap)
}

/**
 * Translate with interpolation
 * @param {string} key - Translation key
 * @param {Object} params - Parameters for interpolation
 * @param {string} defaultText - Default text
 * @returns {string} Translated and interpolated text
 */
export function t(key, params = {}, defaultText = key) {
  let text = getTranslatedText(key, defaultText)
  
  // Simple interpolation - replace {{param}} with values
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param])
  })
  
  return text
}