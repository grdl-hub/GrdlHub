// Auto-Translation Service
// Built-in EN → PT-PT translations with easy API integration for future

// Configuration - Set to true when you want to use an external API
const USE_TRANSLATION_API = false;

// Built-in translation dictionary (EN → PT-PT)
const translationDictionary = {
  // Common UI Elements
  'Home': 'Início',
  'Settings': 'Definições',
  'Users': 'Utilizadores',
  'Profile': 'Perfil',
  'Logout': 'Terminar Sessão',
  'Login': 'Iniciar Sessão',
  'Sign In': 'Entrar',
  'Sign Out': 'Sair',
  'Sign Up': 'Registar',
  'Register': 'Registar',
  'Save': 'Guardar',
  'Cancel': 'Cancelar',
  'Delete': 'Eliminar',
  'Edit': 'Editar',
  'Add': 'Adicionar',
  'Remove': 'Remover',
  'Update': 'Atualizar',
  'Search': 'Pesquisar',
  'Filter': 'Filtrar',
  'Export': 'Exportar',
  'Import': 'Importar',
  'Close': 'Fechar',
  'Back': 'Voltar',
  'Next': 'Seguinte',
  'Previous': 'Anterior',
  'Submit': 'Submeter',
  'Continue': 'Continuar',
  'Confirm': 'Confirmar',
  'Yes': 'Sim',
  'No': 'Não',
  'OK': 'OK',
  'Done': 'Concluído',
  'Loading': 'A carregar',
  'Please wait': 'Por favor aguarde',
  
  // User Management
  'User': 'Utilizador',
  'Admin': 'Administrador',
  'Administrator': 'Administrador',
  'Role': 'Função',
  'Permissions': 'Permissões',
  'Email': 'Email',
  'Password': 'Palavra-passe',
  'Name': 'Nome',
  'Full Name': 'Nome Completo',
  'First Name': 'Primeiro Nome',
  'Last Name': 'Apelido',
  'Phone': 'Telefone',
  'Address': 'Morada',
  'Congregation': 'Congregação',
  'Baptism Date': 'Data de Batismo',
  'Date of Baptism': 'Data de Batismo',
  
  // Messages & Notifications
  'Success': 'Sucesso',
  'Error': 'Erro',
  'Warning': 'Aviso',
  'Info': 'Informação',
  'Message': 'Mensagem',
  'Notification': 'Notificação',
  'Alert': 'Alerta',
  
  // Actions & Operations
  'Create': 'Criar',
  'Read': 'Ler',
  'Write': 'Escrever',
  'View': 'Ver',
  'Download': 'Descarregar',
  'Upload': 'Carregar',
  'Refresh': 'Atualizar',
  'Reload': 'Recarregar',
  'Reset': 'Repor',
  'Clear': 'Limpar',
  'Copy': 'Copiar',
  'Paste': 'Colar',
  'Cut': 'Cortar',
  'Print': 'Imprimir',
  
  // Time & Dates
  'Date': 'Data',
  'Time': 'Hora',
  'Today': 'Hoje',
  'Yesterday': 'Ontem',
  'Tomorrow': 'Amanhã',
  'Week': 'Semana',
  'Month': 'Mês',
  'Year': 'Ano',
  'Day': 'Dia',
  'Hour': 'Hora',
  'Minute': 'Minuto',
  'Second': 'Segundo',
  
  // Status
  'Active': 'Ativo',
  'Inactive': 'Inativo',
  'Enabled': 'Ativado',
  'Disabled': 'Desativado',
  'Online': 'Online',
  'Offline': 'Offline',
  'Available': 'Disponível',
  'Unavailable': 'Indisponível',
  'Pending': 'Pendente',
  'Approved': 'Aprovado',
  'Rejected': 'Rejeitado',
  'Completed': 'Concluído',
  'In Progress': 'Em Progresso',
  
  // Common Phrases
  'Welcome': 'Bem-vindo',
  'Welcome back': 'Bem-vindo de volta',
  'Thank you': 'Obrigado',
  'Please': 'Por favor',
  'Help': 'Ajuda',
  'About': 'Acerca',
  'Contact': 'Contacto',
  'Privacy': 'Privacidade',
  'Terms': 'Termos',
  'Version': 'Versão',
  'Language': 'Idioma',
  'Theme': 'Tema',
  'Dark Mode': 'Modo Escuro',
  'Light Mode': 'Modo Claro',
  
  // Forms
  'Required': 'Obrigatório',
  'Optional': 'Opcional',
  'Invalid': 'Inválido',
  'Valid': 'Válido',
  'Field': 'Campo',
  'Form': 'Formulário',
  'Input': 'Entrada',
  'Select': 'Selecionar',
  'Choose': 'Escolher',
  'Browse': 'Navegar',
  
  // Pages & Sections
  'Dashboard': 'Painel',
  'Overview': 'Visão Geral',
  'Reports': 'Relatórios',
  'Analytics': 'Análises',
  'Statistics': 'Estatísticas',
  'Calendar': 'Calendário',
  'Schedule': 'Agenda',
  'Appointments': 'Compromissos',
  'Events': 'Eventos',
  'Tasks': 'Tarefas',
  'Notes': 'Notas',
  'Documents': 'Documentos',
  'Files': 'Ficheiros',
  'Gallery': 'Galeria',
  'Photos': 'Fotografias',
  'Videos': 'Vídeos',
  
  // App Specific
  'Translations': 'Traduções',
  'Translation': 'Tradução',
  'Auto-translate': 'Traduzir Automaticamente',
  'Auto translate': 'Traduzir automaticamente',
  'Translate': 'Traduzir',
  'Translate All': 'Traduzir Tudo',
  'Translated': 'Traduzido',
  'Not translated': 'Não traduzido',
  'Missing translation': 'Tradução em falta',
  'Category': 'Categoria',
  'Key': 'Chave',
  'Value': 'Valor',
  'Description': 'Descrição',
  
  // Page Names
  'Home': 'Início',
  'Templates': 'Modelos',
  'Monthly View': 'Vista Mensal',
  'Appointments': 'Compromissos',
  'Reports': 'Relatórios',
  'Field Service Schedule': 'Agenda de Serviço de Campo',
  'Availability': 'Disponibilidade',
  'Availability Tracker': 'Rastreador de Disponibilidade',
  'Availability Forms': 'Formulários de Disponibilidade',
  'Users': 'Utilizadores',
  'Content': 'Conteúdo',
  'Pages': 'Páginas',
  'Settings': 'Definições',
  'Admin': 'Administrador',
  
  // Common Page Elements
  'Dashboard': 'Painel',
  'Dashboard and overview': 'Painel e visão geral',
  'Appointment templates management': 'Gestão de modelos de compromissos',
  'Simple monthly view of appointments': 'Vista mensal simples de compromissos',
  'Recurring appointments and scheduling': 'Compromissos recorrentes e agendamento',
  'Generate detailed reports and analytics': 'Gerar relatórios detalhados e análises',
  'View field service schedule': 'Ver agenda de serviço de campo',
  'Mark availability for appointments': 'Marcar disponibilidade para compromissos',
  'Monthly availability tracking view': 'Vista de rastreamento mensal de disponibilidade',
  'Submit availability forms': 'Submeter formulários de disponibilidade',
  'User management': 'Gestão de utilizadores',
  'Dynamic content management': 'Gestão de conteúdo dinâmico',
  'Static page management': 'Gestão de páginas estáticas',
  'App configuration': 'Configuração da aplicação',
  'Multi-language support': 'Suporte multi-idioma',
  'Administrative functions': 'Funções administrativas',
  
  // PWA & Updates
  'Update Available': 'Atualização Disponível',
  'New version available': 'Nova versão disponível',
  'Update Now': 'Atualizar Agora',
  'Later': 'Mais Tarde',
  'Checking for updates': 'A verificar atualizações',
  'Check for updates': 'Verificar atualizações',
  'Install': 'Instalar',
  'Installed': 'Instalado',
  'Offline': 'Offline',
  'Offline ready': 'Pronto para uso offline',
  'App ready to work offline': 'Aplicação pronta para funcionar offline',
};

/**
 * Main translation function
 * @param {string} text - English text to translate
 * @param {string} targetLang - Target language code (default: 'pt')
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang = 'pt') {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // If using API, call external service
  if (USE_TRANSLATION_API) {
    return await callTranslationAPI(text, 'en', targetLang);
  }

  // Use built-in translations
  return getBuiltInTranslation(text, targetLang);
}

/**
 * Built-in translation lookup
 */
function getBuiltInTranslation(text, targetLang) {
  const trimmedText = text.trim();
  
  // Exact match lookup
  if (translationDictionary[trimmedText]) {
    return translationDictionary[trimmedText];
  }

  // Case-insensitive lookup
  const lowerText = trimmedText.toLowerCase();
  const exactKey = Object.keys(translationDictionary).find(
    key => key.toLowerCase() === lowerText
  );
  
  if (exactKey) {
    return translationDictionary[exactKey];
  }

  // Try to translate sentence by matching patterns
  return translateSentence(trimmedText);
}

/**
 * Translate sentences using pattern matching and word-by-word translation
 */
function translateSentence(text) {
  // Common sentence patterns
  const patterns = [
    // Questions
    { pattern: /^Are you sure you want to (.+)\?$/i, template: 'Tem a certeza que quer $1?' },
    { pattern: /^Do you want to (.+)\?$/i, template: 'Quer $1?' },
    { pattern: /^Would you like to (.+)\?$/i, template: 'Gostaria de $1?' },
    { pattern: /^Can you (.+)\?$/i, template: 'Pode $1?' },
    { pattern: /^Please (.+)$/i, template: 'Por favor $1' },
    
    // Success messages
    { pattern: /^(.+) successfully (.+)$/i, template: '$1 $2 com sucesso' },
    { pattern: /^(.+) saved successfully$/i, template: '$1 guardado com sucesso' },
    { pattern: /^(.+) deleted successfully$/i, template: '$1 eliminado com sucesso' },
    { pattern: /^(.+) updated successfully$/i, template: '$1 atualizado com sucesso' },
    { pattern: /^(.+) created successfully$/i, template: '$1 criado com sucesso' },
    
    // Error messages
    { pattern: /^Failed to (.+)$/i, template: 'Falha ao $1' },
    { pattern: /^Error (.+)$/i, template: 'Erro ao $1' },
    { pattern: /^Unable to (.+)$/i, template: 'Não foi possível $1' },
    { pattern: /^Could not (.+)$/i, template: 'Não foi possível $1' },
    
    // Counts and quantities
    { pattern: /^(\d+) (.+)$/i, template: '$1 $2' },
    { pattern: /^No (.+) found$/i, template: 'Nenhum $1 encontrado' },
    { pattern: /^(.+) not found$/i, template: '$1 não encontrado' },
  ];

  // Try to match patterns
  for (const { pattern, template } of patterns) {
    const match = text.match(pattern);
    if (match) {
      let result = template;
      for (let i = 1; i < match.length; i++) {
        const translated = getBuiltInTranslation(match[i], 'pt');
        result = result.replace(`$${i}`, translated);
      }
      return result;
    }
  }

  // If no pattern matches, try word-by-word translation
  const words = text.split(/\s+/);
  const translatedWords = words.map(word => {
    // Remove punctuation for lookup
    const cleanWord = word.replace(/[.,!?;:]+$/g, '');
    const punctuation = word.slice(cleanWord.length);
    
    const translated = translationDictionary[cleanWord] || 
                      translationDictionary[cleanWord.toLowerCase()] || 
                      cleanWord;
    
    return translated + punctuation;
  });

  return translatedWords.join(' ');
}

/**
 * Placeholder for future API integration
 * Replace this with actual API calls (Google Translate, DeepL, etc.)
 */
async function callTranslationAPI(text, sourceLang, targetLang) {
  // Example for Google Translate API:
  // const apiKey = 'YOUR_API_KEY';
  // const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  // const response = await fetch(url, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ q: text, source: sourceLang, target: targetLang })
  // });
  // const data = await response.json();
  // return data.data.translations[0].translatedText;

  // For now, return placeholder
  console.warn('API translation not configured. Using built-in translations.');
  return getBuiltInTranslation(text, targetLang);
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(texts, targetLang = 'pt') {
  const translations = {};
  
  for (const text of texts) {
    translations[text] = await translateText(text, targetLang);
  }
  
  return translations;
}

/**
 * Add custom translation to dictionary (for runtime additions)
 */
export function addCustomTranslation(english, portuguese) {
  translationDictionary[english] = portuguese;
}

/**
 * Get all available translations in dictionary
 */
export function getAvailableTranslations() {
  return { ...translationDictionary };
}

/**
 * Check if translation exists
 */
export function hasTranslation(text) {
  return !!translationDictionary[text] || !!translationDictionary[text.toLowerCase()];
}

export default {
  translateText,
  translateBatch,
  addCustomTranslation,
  getAvailableTranslations,
  hasTranslation
};
