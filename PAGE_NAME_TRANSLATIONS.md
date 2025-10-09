# Page Name Translation System

## Overview
The page name translation system allows GrdlHub to display navigation items, settings dropdowns, and other page references in the user's preferred language (English or Portuguese).

## How It Works

### Architecture
```
┌─────────────────────────────────────┐
│   PAGE_REGISTRY (pageRegistry.js)  │
│   - English names (source of truth) │
│   - Translation keys                │
│   - Icons, categories, metadata     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Translation System (Firestore)     │
│  - pages.home → "Início"            │
│  - pages.users → "Utilizadores"     │
│  - pages.settings → "Definições"    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Cached Translations (Memory)       │
│  - Fast synchronous access          │
│  - Real-time updates                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  UI Components                      │
│  - Navigation menus                 │
│  - Settings dropdowns               │
│  - Page titles                      │
│  - Breadcrumbs                      │
└─────────────────────────────────────┘
```

### Translation Keys
Each page in `PAGE_REGISTRY` has a `translationKey` that follows the pattern:
```
pages.{pageId}
```

Examples:
- `pages.home` → "Home" (EN) / "Início" (PT)
- `pages.users` → "Users" (EN) / "Utilizadores" (PT)
- `pages.settings` → "Settings" (EN) / "Definições" (PT)
- `pages.appointments` → "Appointments" (EN) / "Compromissos" (PT)

## Implementation

### 1. Page Registry Enhancement

**File:** `src/utils/pageRegistry.js`

```javascript
const PAGE_REGISTRY = {
  home: { 
    name: 'Home',  // English (fallback)
    icon: '🏠', 
    description: 'Dashboard and overview',
    category: 'main',
    translationKey: 'pages.home'  // ← Translation key
  },
  users: { 
    name: 'Users', 
    icon: '👥', 
    description: 'User management', 
    category: 'people',
    translationKey: 'pages.users'
  },
  // ...more pages
}
```

### 2. Translation Functions

**File:** `src/utils/pageRegistry.js`

```javascript
/**
 * Get translated page name
 * @param {string} pageId - Page identifier (e.g., 'home')
 * @param {string} lang - Language code ('en' or 'pt')
 * @returns {string} - Translated name or English fallback
 */
export function getTranslatedPageName(pageId, lang = null) {
  const page = PAGE_REGISTRY[pageId];
  if (!page) return pageId;
  
  // Get translation from cache
  if (page.translationKey) {
    const translated = getTranslationSync(page.translationKey, lang);
    if (translated && translated !== page.translationKey) {
      return translated;
    }
  }
  
  // Fallback to English
  return page.name;
}
```

### 3. Cached Translations

**File:** `src/utils/translationManagement.js`

```javascript
// In-memory cache for fast synchronous access
let cachedTranslations = {
  en: {},
  pt: {}
};

/**
 * Initialize cache from Firestore on app startup
 */
export async function initializeCachedTranslations() {
  cachedTranslations = await loadTranslationsFromFirestore();
  
  // Subscribe to real-time updates
  subscribeToTranslations((entries) => {
    // Update cache when translations change
    cachedTranslations = buildCacheFromEntries(entries);
  });
}

/**
 * Get translation synchronously from cache
 */
export function getTranslationSync(key, lang = null) {
  if (!lang) {
    lang = getUserLanguagePreference();
  }
  
  if (cachedTranslations[lang] && cachedTranslations[lang][key]) {
    return cachedTranslations[lang][key];
  }
  
  // Fallback to English if Portuguese not found
  if (lang === 'pt' && cachedTranslations.en[key]) {
    return cachedTranslations.en[key];
  }
  
  return key;
}
```

### 4. App Initialization

**File:** `src/main-app.js`

```javascript
async initialize() {
  // ... authentication checks ...
  
  await initializeAccessControl();
  
  // Initialize translations cache BEFORE rendering UI
  await initializeCachedTranslations();
  
  await filterNavigation();
  // ... rest of initialization ...
}
```

## Usage Examples

### Example 1: Navigation Menu
```javascript
// Before (hardcoded English)
<a href="#home">🏠 Home</a>
<a href="#users">👥 Users</a>

// After (translated)
import { getTranslatedPageName } from './utils/pageRegistry.js';

<a href="#home">🏠 ${getTranslatedPageName('home')}</a>
<a href="#users">👥 ${getTranslatedPageName('users')}</a>

// Renders in Portuguese:
// 🏠 Início
// 👥 Utilizadores
```

### Example 2: Settings Dropdown
```javascript
import { getTranslatedPageMetadata } from './utils/pageRegistry.js';

const pages = ['home', 'users', 'appointments'];

pages.forEach(pageId => {
  const page = getTranslatedPageMetadata(pageId, 'pt');
  console.log(`${page.icon} ${page.name}`);
  // 🏠 Início
  // 👥 Utilizadores  
  // 📅 Compromissos
});
```

### Example 3: Breadcrumb Trail
```javascript
function renderBreadcrumb(pageId) {
  const pageName = getTranslatedPageName(pageId);
  return `<span class="breadcrumb">${pageName}</span>`;
}

renderBreadcrumb('users');  
// English: "Users"
// Portuguese: "Utilizadores"
```

## Adding Page Name Translations

### Method 1: Via Translations UI (Recommended)

1. Go to **Translations** page
2. Click **"➕ Add Translation"**
3. Fill in:
   - Key: `pages.home`
   - English: `Home`
   - Category: `navigation`
4. Click **"🔄 Auto-translate"**
5. Review Portuguese: `Início`
6. Click **"➕ Add Translation"**

### Method 2: Bulk Auto-Translation

1. Add all English page names first:
   ```javascript
   pages.home = "Home"
   pages.users = "Users"
   pages.settings = "Settings"
   pages.appointments = "Appointments"
   pages.availability = "Availability"
   pages.reports = "Reports"
   pages.content = "Content"
   pages.translations = "Translations"
   ```

2. Click **"🔄 Auto-Translate All"** button
3. System auto-generates Portuguese translations
4. Review and edit as needed

### Method 3: Direct Entry
```javascript
// In Firestore console or via API
{
  key: "pages.home",
  en: "Home",
  pt: "Início",
  category: "navigation",
  updatedAt: timestamp,
  updatedBy: "admin@example.com"
}
```

## Current Page Name Translations

| Page ID | English | Portuguese |
|---------|---------|------------|
| `home` | Home | Início |
| `templates` | Templates | Modelos |
| `monthly` | Monthly View | Vista Mensal |
| `appointments` | Appointments | Compromissos |
| `reports` | Reports | Relatórios |
| `field-service-meetings` | Field Service Schedule | Agenda de Serviço de Campo |
| `availability` | Availability | Disponibilidade |
| `availability-tracker` | Availability Tracker | Rastreador de Disponibilidade |
| `availability-forms` | Availability Forms | Formulários de Disponibilidade |
| `users` | Users | Utilizadores |
| `content` | Content | Conteúdo |
| `pages` | Pages | Páginas |
| `settings` | Settings | Definições |
| `translations` | Translations | Traduções |
| `admin` | Admin | Administrador |

## Language Switching

### User Language Preference
The system respects user language preferences:

1. **Explicit selection** - User selects language in settings
2. **Browser language** - Detects from `navigator.language`
3. **Default** - Falls back to English

```javascript
// Get user's language
const lang = getUserLanguagePreference();
// Returns: 'en' or 'pt'

// Set user's language
setUserLanguagePreference('pt');
// Saves to localStorage
// Triggers UI refresh
```

### Language Change Event
```javascript
// Listen for language changes
window.addEventListener('languageChanged', (event) => {
  const newLang = event.detail.lang;
  console.log(`Language changed to: ${newLang}`);
  
  // Refresh page names in UI
  updateNavigationLanguage();
  updateDropdownsLanguage();
});
```

## Integration Points

### Where Page Names Are Used

1. **Navigation Menu** - Top header navigation links
2. **Settings Page** - Page selection dropdowns
3. **Home Sections** - Section configuration
4. **Access Control** - Permission management
5. **Breadcrumbs** - Page trail navigation
6. **Modal Titles** - Edit/create dialogs
7. **Reports** - Page-specific reports
8. **Search Results** - Page filtering

## Performance Considerations

### Caching Strategy
- **Firestore Load**: Once on app startup (~100-200ms)
- **Cache Access**: Synchronous, < 1ms
- **Real-time Updates**: WebSocket (Firestore listeners)
- **Memory Usage**: ~5KB for all page translations

### Optimization Tips
1. **Preload translations early** - Before rendering UI
2. **Use synchronous cache** - Avoid async lookups in render
3. **Subscribe to updates** - Keep cache fresh automatically
4. **Batch updates** - Use bulk translation feature

## Troubleshooting

### Page Name Not Translating

**Problem:** Page shows English name instead of Portuguese

**Solutions:**
1. Check if translation exists in Firestore:
   ```javascript
   // In browser console
   import { getTranslationSync } from './utils/translationManagement.js';
   console.log(getTranslationSync('pages.home', 'pt'));
   ```

2. Verify translation key matches:
   ```javascript
   // In pageRegistry.js
   home: {
     translationKey: 'pages.home'  // Must match Firestore key
   }
   ```

3. Check user language preference:
   ```javascript
   console.log(localStorage.getItem('userLanguage'));
   // Should be 'pt'
   ```

4. Reinitialize cache:
   ```javascript
   import { initializeCachedTranslations } from './utils/translationManagement.js';
   await initializeCachedTranslations();
   ```

### Translation Not Updating

**Problem:** Changed translation in Firestore but UI still shows old value

**Solutions:**
1. Check real-time listener is active
2. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Clear service worker cache
4. Verify Firestore connection

### Missing Translations

**Problem:** Some pages missing Portuguese translations

**Solutions:**
1. Use **Auto-Translate All** button in Translations page
2. Manually add missing translations
3. Check auto-translate dictionary for page names

## Best Practices

### 1. Always Add Translation Keys
When adding new pages to `PAGE_REGISTRY`:
```javascript
newPage: {
  name: 'New Page',
  icon: '📄',
  description: 'Description',
  category: 'system',
  translationKey: 'pages.newPage'  // ← Don't forget this!
}
```

### 2. Use Consistent Naming
- Page IDs: camelCase or kebab-case
- Translation keys: `pages.{pageId}`
- Keep it simple and predictable

### 3. Test Both Languages
- Switch to Portuguese and verify all page names
- Check navigation, dropdowns, breadcrumbs
- Test on mobile devices

### 4. Document Custom Pages
- If adding custom pages, document translation keys
- Add to this document's table
- Update auto-translate dictionary if needed

## Future Enhancements

### Potential Additions:
1. **More Languages** - Spanish, French, German
2. **Page Descriptions** - Translate full descriptions
3. **Dynamic Loading** - Lazy-load translations
4. **Fallback Chain** - PT → EN → Key
5. **Translation Memory** - Remember user edits
6. **Context-Aware** - Different translations per context
7. **Pluralization** - Handle singular/plural forms
8. **Gender Support** - Portuguese gender variations

## Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| `src/utils/pageRegistry.js` | ✨ NEW FUNCTIONS | Added `getTranslatedPageName()`, `getTranslatedPageMetadata()`, translation keys to all pages |
| `src/utils/translationManagement.js` | ✨ NEW FUNCTIONS | Added `initializeCachedTranslations()`, `getTranslationSync()`, `setUserLanguagePreference()` |
| `src/utils/autoTranslate.js` | 🔄 UPDATED | Added all page names to translation dictionary |
| `src/main-app.js` | 🔄 UPDATED | Initialize cached translations on app startup |

## Resources

- [Translation Management Page] - Admin UI for translations
- [Page Registry Documentation] - Centralized page system
- [Auto-Translation System] - Bulk translation features
- [Firestore Translations Collection] - Database structure

---

**Version:** 1.0.0  
**Last Updated:** October 9, 2025  
**Author:** GrdlHub Development Team
