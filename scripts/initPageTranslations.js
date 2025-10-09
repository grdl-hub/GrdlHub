// Initialize Page Name Translations in Firestore
// This script adds all page names from PAGE_REGISTRY to the translations collection
// Run once to populate initial page name translations

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXKUb-_bMl2CJCTbwVKtbPHAYgT0L7TDA",
  authDomain: "kgdmin.firebaseapp.com",
  projectId: "kgdmin",
  storageBucket: "kgdmin.firebasestorage.app",
  messagingSenderId: "754599892620",
  appId: "1:754599892620:web:e33cbdaa6f18b0da39ad49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Page names from PAGE_REGISTRY with Portuguese translations
const pageTranslations = [
  { key: 'pages.home', en: 'Home', pt: 'Início', description: 'Main dashboard' },
  { key: 'pages.users', en: 'Users', pt: 'Utilizadores', description: 'User management' },
  { key: 'pages.pages', en: 'Pages', pt: 'Páginas', description: 'Page configuration' },
  { key: 'pages.content', en: 'Content', pt: 'Conteúdo', description: 'Content management' },
  { key: 'pages.templates', en: 'Templates', pt: 'Modelos', description: 'Document templates' },
  { key: 'pages.settings', en: 'Settings', pt: 'Definições', description: 'Application settings' },
  { key: 'pages.translations', en: 'Translations', pt: 'Traduções', description: 'Translation management' },
  { key: 'pages.appointments', en: 'Appointments', pt: 'Compromissos', description: 'Appointment scheduling' },
  { key: 'pages.availability', en: 'Availability', pt: 'Disponibilidade', description: 'Availability management' },
  { key: 'pages.availability-tracker', en: 'Availability Tracker', pt: 'Rastreador de Disponibilidade', description: 'Track availability' },
  { key: 'pages.availability-forms', en: 'Availability Forms', pt: 'Formulários de Disponibilidade', description: 'Availability forms' },
  { key: 'pages.reports', en: 'Reports', pt: 'Relatórios', description: 'Reports and analytics' },
  { key: 'pages.field-service-meetings', en: 'Field Service Schedule', pt: 'Agenda de Serviço de Campo', description: 'Field service meetings' },
  { key: 'pages.admin', en: 'Admin', pt: 'Administrador', description: 'Admin panel' },
  
  // Navigation elements
  { key: 'nav.back_to_home', en: 'Back to Home', pt: 'Voltar ao Início', description: 'Back button' },
  { key: 'nav.sign_out', en: 'Sign Out', pt: 'Sair', description: 'Sign out button' },
  { key: 'nav.user_settings', en: 'User Settings', pt: 'Definições de Utilizador', description: 'Settings menu' },
  
  // Common UI elements
  { key: 'common.language', en: 'Language', pt: 'Idioma', description: 'Language selector' },
  { key: 'common.english', en: 'English', pt: 'Inglês', description: 'English language' },
  { key: 'common.portuguese', en: 'Portuguese', pt: 'Português', description: 'Portuguese language' },
  { key: 'common.loading', en: 'Loading...', pt: 'Carregando...', description: 'Loading state' },
  { key: 'common.save', en: 'Save', pt: 'Guardar', description: 'Save button' },
  { key: 'common.cancel', en: 'Cancel', pt: 'Cancelar', description: 'Cancel button' },
  { key: 'common.delete', en: 'Delete', pt: 'Eliminar', description: 'Delete button' },
  { key: 'common.edit', en: 'Edit', pt: 'Editar', description: 'Edit button' },
  { key: 'common.add', en: 'Add', pt: 'Adicionar', description: 'Add button' },
  { key: 'common.search', en: 'Search', pt: 'Pesquisar', description: 'Search button' },
  { key: 'common.filter', en: 'Filter', pt: 'Filtrar', description: 'Filter button' },
  { key: 'common.close', en: 'Close', pt: 'Fechar', description: 'Close button' },
  { key: 'common.yes', en: 'Yes', pt: 'Sim', description: 'Yes button' },
  { key: 'common.no', en: 'No', pt: 'Não', description: 'No button' },
  { key: 'common.confirm', en: 'Confirm', pt: 'Confirmar', description: 'Confirm button' },
  
  // Categories
  { key: 'category.navigation', en: 'Navigation', pt: 'Navegação', description: 'Navigation category' },
  { key: 'category.ui', en: 'User Interface', pt: 'Interface de Utilizador', description: 'UI category' },
  { key: 'category.buttons', en: 'Buttons', pt: 'Botões', description: 'Button texts' },
  { key: 'category.messages', en: 'Messages', pt: 'Mensagens', description: 'System messages' },
  { key: 'category.errors', en: 'Errors', pt: 'Erros', description: 'Error messages' },
];

async function initializePageTranslations() {
  console.log('🔧 Initializing page translations...');
  
  try {
    const translationsRef = collection(db, 'translations');
    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const translation of pageTranslations) {
      const { key, en, pt, description } = translation;
      
      // Check if translation already exists
      const q = query(translationsRef, where('key', '==', key));
      const existingDocs = await getDocs(q);
      
      if (existingDocs.empty) {
        // Add new translation
        const docRef = doc(translationsRef);
        await setDoc(docRef, {
          key,
          en,
          pt,
          category: key.startsWith('pages.') ? 'navigation' : 
                   key.startsWith('nav.') ? 'navigation' : 
                   key.startsWith('common.') ? 'ui' : 
                   key.startsWith('category.') ? 'system' : 'other',
          notes: description,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'system-init'
        });
        
        console.log(`✅ Added: ${key}`);
        addedCount++;
      } else {
        // Translation exists - optionally update it
        const existingDoc = existingDocs.docs[0];
        const existingData = existingDoc.data();
        
        // Only update if Portuguese translation is missing
        if (!existingData.pt || existingData.pt === key) {
          await setDoc(existingDoc.ref, {
            ...existingData,
            pt,
            en: en || existingData.en,
            notes: description || existingData.notes,
            updatedAt: new Date(),
            updatedBy: 'system-init'
          }, { merge: true });
          
          console.log(`🔄 Updated: ${key}`);
          updatedCount++;
        } else {
          console.log(`⏭️  Skipped (exists): ${key}`);
          skippedCount++;
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${addedCount} translations`);
    console.log(`🔄 Updated: ${updatedCount} translations`);
    console.log(`⏭️  Skipped: ${skippedCount} translations`);
    console.log(`📝 Total: ${pageTranslations.length} translations`);
    console.log('\n✅ Page translations initialized successfully!');
    console.log('\n👉 You can now view and edit these in the Translations page');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing page translations:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the initialization
initializePageTranslations();
