// Firestore Translation Management System
// Real-time admin translation management with Firestore backend

import { db } from '../auth.js';
import { getCurrentUser } from '../auth.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  where,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { showNotification } from './notifications.js';

const TRANSLATIONS_COLLECTION = 'translations';

/**
 * Load all translations from Firestore
 * @returns {Object} Translations object { en: {...}, pt: {...} }
 */
export async function loadTranslationsFromFirestore() {
  try {
    console.log('🌍 Loading translations from Firestore...');
    const translationsRef = collection(db, TRANSLATIONS_COLLECTION);
    const q = query(translationsRef, orderBy('key'));
    const snapshot = await getDocs(q);
    
    const translations = {
      en: {},
      pt: {}
    };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const key = data.key;
      
      if (data.en) translations.en[key] = data.en;
      if (data.pt) translations.pt[key] = data.pt;
    });
    
    console.log(`✅ Loaded ${snapshot.size} translation entries from Firestore`);
    return translations;
  } catch (error) {
    console.error('❌ Error loading translations from Firestore:', error);
    return { en: {}, pt: {} };
  }
}

/**
 * Get all translation entries for admin management
 * @returns {Array} Array of translation objects
 */
export async function getTranslationEntries() {
  try {
    console.log('🔍 Fetching translation entries...');
    const translationsRef = collection(db, TRANSLATIONS_COLLECTION);
    const q = query(translationsRef, orderBy('key'));
    const snapshot = await getDocs(q);
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📋 Found ${entries.length} translation entries`);
    return entries;
  } catch (error) {
    console.error('❌ Error getting translation entries:', error);
    return [];
  }
}

/**
 * Add or update a translation entry
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} englishText - English text (primary language)
 * @param {string} portugueseText - Portuguese translation
 * @param {string} category - Optional category
 * @returns {boolean} Success status
 */
export async function saveTranslationEntry(key, englishText, portugueseText = '', category = '') {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use the key as document ID for easy updates
    const docRef = doc(db, TRANSLATIONS_COLLECTION, key);
    
    const translationData = {
      key: key,
      en: englishText,
      pt: portugueseText,
      category: category || 'general',
      updatedAt: new Date(),
      updatedBy: user.email || user.uid
    };
    
    await setDoc(docRef, translationData, { merge: true });
    
    console.log(`✅ Saved translation: ${key}`);
    showNotification(`Translation "${key}" saved successfully!`, 'success');
    return true;
  } catch (error) {
    console.error('❌ Error saving translation:', error);
    showNotification('Error saving translation: ' + error.message, 'error');
    return false;
  }
}

/**
 * Delete a translation entry
 * @param {string} key - Translation key to delete
 * @returns {boolean} Success status
 */
export async function deleteTranslationEntry(key) {
  try {
    const docRef = doc(db, TRANSLATIONS_COLLECTION, key);
    await deleteDoc(docRef);
    
    console.log(`✅ Deleted translation: ${key}`);
    showNotification(`Translation "${key}" deleted successfully!`, 'success');
    return true;
  } catch (error) {
    console.error('❌ Error deleting translation:', error);
    showNotification('Error deleting translation: ' + error.message, 'error');
    return false;
  }
}

/**
 * Listen to real-time translation updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTranslations(callback) {
  try {
    const translationsRef = collection(db, TRANSLATIONS_COLLECTION);
    const q = query(translationsRef, orderBy('key'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = [];
      snapshot.forEach(doc => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`🔄 Real-time update: ${entries.length} translations`);
      callback(entries);
    }, (error) => {
      console.error('❌ Error in translation subscription:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up translation subscription:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Initialize default translations if collection is empty
 */
export async function initializeDefaultTranslations() {
  try {
    const entries = await getTranslationEntries();
    
    if (entries.length === 0) {
      console.log('🌍 Initializing default translations in Firestore...');
      
      const defaultTranslations = [
        // Navigation
        { key: 'nav.home', en: 'Home', pt: 'Início', category: 'navigation' },
        { key: 'nav.appointments', en: 'Appointments', pt: 'Compromissos', category: 'navigation' },
        { key: 'nav.availability', en: 'Availability', pt: 'Disponibilidade', category: 'navigation' },
        { key: 'nav.monthly', en: 'Monthly View', pt: 'Vista Mensal', category: 'navigation' },
        { key: 'nav.reports', en: 'Reports', pt: 'Relatórios', category: 'navigation' },
        { key: 'nav.users', en: 'Users', pt: 'Utilizadores', category: 'navigation' },
        { key: 'nav.settings', en: 'Settings', pt: 'Definições', category: 'navigation' },
        { key: 'nav.pages', en: 'Pages', pt: 'Páginas', category: 'navigation' },
        { key: 'nav.content', en: 'Content', pt: 'Conteúdo', category: 'navigation' },
        { key: 'nav.translations', en: 'Translations', pt: 'Traduções', category: 'navigation' },
        
        // Common Actions
        { key: 'actions.save', en: 'Save', pt: 'Guardar', category: 'actions' },
        { key: 'actions.cancel', en: 'Cancel', pt: 'Cancelar', category: 'actions' },
        { key: 'actions.delete', en: 'Delete', pt: 'Apagar', category: 'actions' },
        { key: 'actions.edit', en: 'Edit', pt: 'Editar', category: 'actions' },
        { key: 'actions.add', en: 'Add', pt: 'Adicionar', category: 'actions' },
        { key: 'actions.create', en: 'Create', pt: 'Criar', category: 'actions' },
        { key: 'actions.update', en: 'Update', pt: 'Atualizar', category: 'actions' },
        { key: 'actions.remove', en: 'Remove', pt: 'Remover', category: 'actions' },
        { key: 'actions.restore', en: 'Restore', pt: 'Restaurar', category: 'actions' },
        
        // Buttons
        { key: 'buttons.saveChanges', en: 'Save Changes', pt: 'Guardar Alterações', category: 'buttons' },
        { key: 'buttons.generateReport', en: 'Generate Report', pt: 'Gerar Relatório', category: 'buttons' },
        { key: 'buttons.addNew', en: 'Add New', pt: 'Adicionar Novo', category: 'buttons' },
        { key: 'buttons.exportPdf', en: 'Export PDF', pt: 'Exportar PDF', category: 'buttons' },
        { key: 'buttons.exportExcel', en: 'Export Excel', pt: 'Exportar Excel', category: 'buttons' },
        { key: 'buttons.uploadImage', en: 'Upload Image', pt: 'Carregar Imagem', category: 'buttons' },
        
        // Auth
        { key: 'auth.login', en: 'Login', pt: 'Entrar', category: 'auth' },
        { key: 'auth.logout', en: 'Logout', pt: 'Sair', category: 'auth' },
        { key: 'auth.signup', en: 'Sign Up', pt: 'Registar', category: 'auth' },
        { key: 'auth.welcome', en: 'Welcome', pt: 'Bem-vindo', category: 'auth' },
        { key: 'auth.welcomeBack', en: 'Welcome back', pt: 'Bem-vindo de volta', category: 'auth' },
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
        { key: 'auth.try_different', en: 'Try Different Email', pt: 'Tentar Email Diferente', category: 'auth' },
        
        // Forms
        { key: 'forms.required', en: 'Required', pt: 'Obrigatório', category: 'forms' },
        { key: 'forms.optional', en: 'Optional', pt: 'Opcional', category: 'forms' },
        { key: 'forms.email', en: 'Email', pt: 'Email', category: 'forms' },
        { key: 'forms.password', en: 'Password', pt: 'Palavra-passe', category: 'forms' },
        { key: 'forms.name', en: 'Name', pt: 'Nome', category: 'forms' },
        
        // Messages
        { key: 'messages.success', en: 'Success!', pt: 'Sucesso!', category: 'messages' },
        { key: 'messages.error', en: 'Error', pt: 'Erro', category: 'messages' },
        { key: 'messages.warning', en: 'Warning', pt: 'Aviso', category: 'messages' },
        { key: 'messages.loading', en: 'Loading...', pt: 'A carregar...', category: 'messages' },
        { key: 'messages.noResults', en: 'No results found', pt: 'Nenhum resultado encontrado', category: 'messages' },
        { key: 'messages.confirmDelete', en: 'Are you sure you want to delete this?', pt: 'Tem a certeza que deseja eliminar?', category: 'messages' },
        
        // Appointments
        { key: 'appointments.title', en: 'Appointments', pt: 'Compromissos', category: 'appointments' },
        { key: 'appointments.description', en: 'Manage recurring appointments and view your schedule', pt: 'Gerir compromissos recorrentes e ver o seu horário', category: 'appointments' },
        { key: 'appointments.create', en: 'Create Appointment', pt: 'Criar Compromisso', category: 'appointments' },
        { key: 'appointments.edit', en: 'Edit Appointment', pt: 'Editar Compromisso', category: 'appointments' },
        { key: 'appointments.date', en: 'Date', pt: 'Data', category: 'appointments' },
        { key: 'appointments.time', en: 'Time', pt: 'Hora', category: 'appointments' },
        
        // Reports
        { key: 'reports.title', en: 'Reports', pt: 'Relatórios', category: 'reports' },
        { key: 'reports.generate', en: 'Generate Report', pt: 'Gerar Relatório', category: 'reports' },
        { key: 'reports.month', en: 'Month', pt: 'Mês', category: 'reports' },
        { key: 'reports.year', en: 'Year', pt: 'Ano', category: 'reports' },
        { key: 'reports.loading', en: 'Generating report...', pt: 'A gerar relatório...', category: 'reports' },
        
        // Settings
        { key: 'settings.title', en: 'Settings', pt: 'Definições', category: 'settings' },
        { key: 'settings.language', en: 'Language', pt: 'Idioma', category: 'settings' },
        { key: 'settings.general', en: 'General', pt: 'Geral', category: 'settings' },
        
        // Time & Dates
        { key: 'time.today', en: 'Today', pt: 'Hoje', category: 'time' },
        { key: 'time.yesterday', en: 'Yesterday', pt: 'Ontem', category: 'time' },
        { key: 'time.tomorrow', en: 'Tomorrow', pt: 'Amanhã', category: 'time' },
        { key: 'time.never', en: 'Never', pt: 'Nunca', category: 'time' },
        
        // Status
        { key: 'status.active', en: 'Active', pt: 'Ativo', category: 'status' },
        { key: 'status.inactive', en: 'Inactive', pt: 'Inativo', category: 'status' },
        { key: 'status.enabled', en: 'Enabled', pt: 'Ativado', category: 'status' },
        { key: 'status.disabled', en: 'Disabled', pt: 'Desativado', category: 'status' }
      ];
      
      let successCount = 0;
      for (const translation of defaultTranslations) {
        const success = await saveTranslationEntry(translation.key, translation.en, translation.pt, translation.category);
        if (success) successCount++;
      }
      
      console.log(`✅ Initialized ${successCount}/${defaultTranslations.length} default translations`);
      showNotification(`Initialized ${successCount} default translations!`, 'success');
      return true;
    } else {
      console.log(`ℹ️ Translations already exist (${entries.length} entries), skipping initialization`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing default translations:', error);
    showNotification('Error initializing translations: ' + error.message, 'error');
    return false;
  }
}

/**
 * Search translations by key or text
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered translation entries
 */
export async function searchTranslations(searchTerm) {
  try {
    const entries = await getTranslationEntries();
    const term = searchTerm.toLowerCase();
    
    return entries.filter(entry => 
      entry.key.toLowerCase().includes(term) ||
      entry.en.toLowerCase().includes(term) ||
      (entry.pt && entry.pt.toLowerCase().includes(term)) ||
      (entry.category && entry.category.toLowerCase().includes(term))
    );
  } catch (error) {
    console.error('❌ Error searching translations:', error);
    return [];
  }
}

/**
 * Get unique categories from translations
 * @returns {Array} Array of category names
 */
export async function getTranslationCategories() {
  try {
    const entries = await getTranslationEntries();
    const categories = [...new Set(entries.map(entry => entry.category).filter(Boolean))];
    return categories.sort();
  } catch (error) {
    console.error('❌ Error getting categories:', error);
    return [];
  }
}

/**
 * Export all translations for backup
 * @returns {Object} All translations with metadata
 */
export async function exportTranslations() {
  try {
    const entries = await getTranslationEntries();
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      totalTranslations: entries.length,
      translations: entries
    };
    
    return exportData;
  } catch (error) {
    console.error('❌ Error exporting translations:', error);
    return null;
  }
}

/**
 * Import translations from backup
 * @param {Object} importData - Translation data to import
 * @returns {boolean} Success status
 */
export async function importTranslations(importData) {
  try {
    if (!importData.translations || !Array.isArray(importData.translations)) {
      throw new Error('Invalid import data format');
    }
    
    let successCount = 0;
    for (const translation of importData.translations) {
      if (translation.key && translation.en) {
        const success = await saveTranslationEntry(
          translation.key, 
          translation.en, 
          translation.pt || '', 
          translation.category || 'general'
        );
        if (success) successCount++;
      }
    }
    
    showNotification(`Imported ${successCount}/${importData.translations.length} translations!`, 'success');
    return true;
  } catch (error) {
    console.error('❌ Error importing translations:', error);
    showNotification('Error importing translations: ' + error.message, 'error');
    return false;
  }
}

/**
 * Cached translations for synchronous access
 * This is populated from Firestore and kept in memory
 */
let cachedTranslations = {
  en: {},
  pt: {}
};

/**
 * Initialize cached translations from Firestore
 * Call this on app startup
 */
export async function initializeCachedTranslations() {
  try {
    console.log('🔄 Initializing cached translations...');
    cachedTranslations = await loadTranslationsFromFirestore();
    
    // Subscribe to real-time updates to keep cache fresh
    subscribeToTranslations((entries) => {
      cachedTranslations = {
        en: {},
        pt: {}
      };
      
      entries.forEach(entry => {
        if (entry.en) cachedTranslations.en[entry.key] = entry.en;
        if (entry.pt) cachedTranslations.pt[entry.key] = entry.pt;
      });
      
      console.log('🔄 Cached translations updated from Firestore');
      
      // Dispatch event to notify UI components to refresh
      const currentLang = getUserLanguagePreference();
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { lang: currentLang, source: 'cache-update' } 
      }));
    });
    
    console.log('✅ Cached translations initialized');
    return cachedTranslations;
  } catch (error) {
    console.error('❌ Error initializing cached translations:', error);
    return { en: {}, pt: {} };
  }
}

/**
 * Get translation synchronously from cache
 * @param {string} key - Translation key
 * @param {string} lang - Language code ('en' or 'pt')
 * @returns {string} - Translated text or key if not found
 */
export function getTranslationSync(key, lang = null) {
  // Get user's preferred language
  if (!lang) {
    lang = getUserLanguagePreference();
  }
  
  // Check if translation exists in cache
  if (cachedTranslations[lang] && cachedTranslations[lang][key]) {
    return cachedTranslations[lang][key];
  }
  
  // Fallback to English if Portuguese not found
  if (lang === 'pt' && cachedTranslations.en[key]) {
    return cachedTranslations.en[key];
  }
  
  // Return key if no translation found
  return key;
}

/**
 * Get user's language preference
 * @returns {string} - Language code
 */
export function getUserLanguagePreference() {
  // Check localStorage (use same key as old i18n system for compatibility)
  const savedLang = localStorage.getItem('userLanguage') || localStorage.getItem('grdlhub-language');
  if (savedLang) return savedLang;
  
  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('pt')) return 'pt';
  
  // Default to English
  return 'en';
}

/**
 * Set user's language preference
 * @param {string} lang - Language code
 */
export function setUserLanguagePreference(lang) {
  // Save to both keys for compatibility with old i18n system
  localStorage.setItem('userLanguage', lang);
  localStorage.setItem('grdlhub-language', lang);
  console.log(`🌍 Language preference set to: ${lang}`);
  
  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}