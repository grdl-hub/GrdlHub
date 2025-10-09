# PWA Update System

## Overview
GrdlHub now includes an intelligent PWA update notification system that alerts users when new versions are available and allows them to update with a single click.

## Features

### 1. Automatic Update Detection
- The service worker checks for updates every hour
- When a new version is deployed, users are automatically notified
- No manual intervention required from developers

### 2. User-Friendly Update Prompt
When an update is available, users see a prominent notification with:
- 🔄 Update icon
- Clear message in Portuguese: "Nova versão disponível!"
- Description of benefits
- Two action buttons:
  - **"Atualizar Agora"** - Immediately applies the update and reloads
  - **"Mais Tarde"** - Dismisses for 30 minutes

### 3. Manual Update Check
Users can manually check for updates from Settings:
1. Go to **Settings** page
2. Find the **🔄 App Updates** section
3. Click **"🔍 Check for Updates"**
4. If an update is available, they'll be notified immediately

### 4. Version Display
The Settings page shows:
- Current app version (from `package.json`)
- Build date
- Clean, monospace display

## How It Works

### Service Worker Configuration
- **Register Type**: `prompt` (requires user confirmation)
- **Update Frequency**: Every 60 minutes
- **Cache Strategy**: Workbox with precaching

### Update Flow
1. Service worker detects new version on Firebase Hosting
2. `onNeedRefresh()` callback triggers
3. Update toast notification appears
4. User clicks "Atualizar Agora"
5. `updateSW(true)` is called
6. Page reloads with new service worker
7. New version is active

### Offline Ready Notification
When the app is first installed and ready for offline use:
- ✅ "Pronto para uso offline!" toast appears
- Auto-dismisses after 5 seconds
- Confirms PWA capabilities are active

## Technical Implementation

### Files Modified
1. **`src/pwa-update.js`** - New module handling all update logic
2. **`src/main-app.js`** - Imports and initializes PWA updates
3. **`vite.config.js`** - Changed `registerType` from `autoUpdate` to `prompt`
4. **`src/style.css`** - Added toast notification styles

### Key Functions
- `initializePWAUpdates()` - Main initialization function
- `showUpdatePrompt(updateSW)` - Displays update notification
- `showOfflineReady()` - Confirms offline capability
- `checkForAppUpdates()` - Manual update check (global function)
- `displayAppVersion()` - Shows version in Settings

### Styling
The update toast uses:
- Modern card design with shadow
- Blue accent color (#1976d2)
- Responsive layout (adapts to mobile)
- Smooth slide-in animation
- High z-index (10000) to appear above all content

## User Experience

### Visual Design
- Clean, minimalistic toast notification
- Bottom-right corner placement (desktop)
- Full-width on mobile devices
- Clear call-to-action buttons
- Portuguese language throughout

### Notification Behavior
- **Immediate**: Shows as soon as update is detected
- **Non-Intrusive**: Doesn't block app usage
- **Persistent**: Stays visible until user interacts
- **Reminder**: Re-appears after 30 minutes if dismissed

## Deployment Workflow

### For Developers
1. Make code changes
2. Update version in `package.json` (optional but recommended)
3. Run `npm run build`
4. Run `firebase deploy`
5. New version is live on Firebase Hosting

### For Users
1. Continue using the app normally
2. Within 1 hour (or immediately if manually checked):
   - Update notification appears
3. Click "Atualizar Agora"
4. App reloads with new version
5. New features/fixes are active

## Configuration Options

### Update Check Interval
Located in `src/pwa-update.js`:
```javascript
setInterval(() => {
  registration?.update()
}, 60 * 60 * 1000) // 60 minutes
```

### Reminder Delay
When user clicks "Mais Tarde":
```javascript
setTimeout(() => {
  showUpdatePrompt(updateSW)
}, 30 * 60 * 1000) // 30 minutes
```

### Offline Ready Timeout
Auto-dismiss duration:
```javascript
setTimeout(() => {
  toast.remove()
}, 5000) // 5 seconds
```

## Best Practices

### Version Management
1. Use semantic versioning (major.minor.patch)
2. Update `package.json` version before each release
3. Document changes in commit messages
4. Consider creating a CHANGELOG.md

### Testing Updates
1. Build locally: `npm run build`
2. Test in production mode: `npm run preview`
3. Deploy to Firebase: `firebase deploy`
4. Open app in incognito window to test fresh install
5. Make a minor change and deploy again to test update flow

### User Communication
- Consider adding a "What's New" modal after updates
- Document major changes in Settings
- Provide release notes on first load after update

## Troubleshooting

### Update Not Appearing
1. Check browser DevTools > Application > Service Workers
2. Verify service worker is registered
3. Click "Update" in DevTools to force check
4. Clear browser cache if needed

### Manual Update Check Not Working
1. Verify `window.checkForAppUpdates` is defined
2. Check console for errors
3. Ensure service worker is registered
4. Try clicking button in Settings

### Toast Not Styling Correctly
1. Verify `pwa-update-styles` is injected
2. Check for CSS conflicts
3. Inspect element in DevTools
4. Ensure z-index is high enough

## Future Enhancements

### Potential Additions
1. **Update History Log** - Show past updates in Settings
2. **Changelog Modal** - Display what's new after update
3. **Forced Updates** - Critical security updates that can't be postponed
4. **Update Progress Bar** - Show download/install progress
5. **Background Update** - Update silently and activate on next reload
6. **Smart Scheduling** - Update during low-usage times
7. **Network Detection** - Only download on WiFi for large updates

## Resources
- [Vite PWA Plugin Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [PWA Update Best Practices](https://web.dev/service-worker-lifecycle/#update-on-reload)
