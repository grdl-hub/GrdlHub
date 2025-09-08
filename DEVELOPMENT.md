# Development Guide

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase** (Required):
   - Follow instructions in `FIREBASE_SETUP.md`
   - Update `src/auth.js` with your Firebase configuration

3. **Start development server**:
   ```bash
   npm run dev
   ```
   or use VS Code task: `Ctrl/Cmd + Shift + P` → "Tasks: Run Task" → "dev"

4. **Open in browser**: http://localhost:5173

## Building and Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase Hosting (after setup)
npm run deploy
```

## Project Status

✅ **Completed Features:**
- Vite + PWA setup with service worker
- Firebase authentication integration (invite-only)
- Firestore database integration
- Role-based access control system
- User management with invite link system
- Minimalistic UI design (jwevent.org inspired)
- Responsive design for all devices
- Notification system
- Loading states and error handling
- PWA installation prompt
- Offline support structure
- Invite-only authentication (no password field in auth form)

🚧 **To Be Implemented:**
- Firebase configuration (requires your setup)
- Pages management functionality
- Content management functionality  
- Settings functionality
- Email invite system
- Actual offline data caching
- Push notifications
- Real-time updates

## Next Steps

1. **Firebase Setup**: Follow `FIREBASE_SETUP.md` to configure your Firebase project
2. **First Admin User**: Create your first admin user in Firestore
3. **Test Authentication**: Sign in and test user management
4. **Customize Design**: Modify colors and branding in `src/style.css`
5. **Add Content**: Implement pages and content management features

## File Structure

```
src/
├── main.js              # App initialization
├── auth.js              # Firebase auth (needs config)
├── accessControl.js     # Role-based permissions
├── ui.js                # UI components
├── style.css           # Minimalistic styles
├── utils/
│   └── notifications.js # Toast notifications
└── pages/
    ├── users.js        # User management ✅
    ├── pages.js        # Pages (placeholder)
    ├── content.js      # Content (placeholder)
    └── settings.js     # Settings (placeholder)
```

## Available Commands

- `npm run dev` - Development server
- `npm run build` - Production build  
- `npm run preview` - Preview production build
- VS Code Tasks available via Command Palette

The foundation is solid and ready for Firebase configuration and feature implementation!
