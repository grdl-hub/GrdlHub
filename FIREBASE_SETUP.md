# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "grdlhub-app")
4. Enable Google Analytics (optional)
5. Wait for project creation

## 2. Enable Authentication

1. In your Firebase project, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. **🔥 CRITICAL: Enable Email link (passwordless sign-in)**
   - Click on **Email/Password** provider
   - Toggle ON **"Email link (passwordless sign-in)"**
   - Click **Save**
6. Save changes

### ⚠️ CRITICAL: Fix `auth/operation-not-allowed` Error

**You're seeing this error because Email link (passwordless sign-in) is not enabled!**

```
Error sending sign-in link: FirebaseError: Firebase: Error (auth/operation-not-allowed)
```

**🔧 IMMEDIATE FIX (2 minutes):**

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `grdlhub-9eae1` (or your project name)
3. **Go to Authentication** → **Sign-in method** tab
4. **Find "Email/Password"** provider in the list
5. **Click the Edit button** (pencil icon) next to Email/Password
6. **YOU'LL SEE TWO TOGGLES**:
   - ✅ Email/Password (probably already enabled)
   - ❌ **Email link (passwordless sign-in)** ← **ENABLE THIS ONE!**
7. **Toggle ON** "Email link (passwordless sign-in)"
8. **Click Save**

**🧪 Test the fix:**
```bash
npm run check-firebase  # Verify configuration
npm run dev              # Start the app and test sign-in links
```

That's it! This is the most common setup issue.

### 2.1 Configure Authorized Domains

1. In **Authentication > Settings**
2. Go to **Authorized domains** tab
3. Add your domain(s):
   - `localhost` (for development)
   - `your-domain.com` (for production)
   - Any other domains where you'll host the app
4. Firebase will automatically send sign-in links to these authorized domains

## 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll update rules later)
4. Select a location close to your users
5. Click **Done**

## 4. Set Up Security Rules

Go to **Firestore Database > Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data, admins can read all
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         isAdmin(request.auth.uid));
      allow write: if request.auth != null && 
        isAdmin(request.auth.uid);
    }
    
    // Helper function to check if user is admin
    function isAdmin(userId) {
      return exists(/databases/$(database)/documents/users/$(userId)) &&
             get(/databases/$(database)/documents/users/$(userId)).data.role == 'admin';
    }
    
    // Allow read access to pages and content based on user permissions
    match /pages/{pageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        isAdmin(request.auth.uid);
    }
    
    match /content/{contentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        isAdmin(request.auth.uid);
    }
    
    // Pre-approved emails management (admin only)
    match /preApprovedEmails/{emailId} {
      allow read, write: if request.auth != null && 
        isAdmin(request.auth.uid);
    }
  }
}
```

## 5. Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Add app** and choose **Web**
4. Register your app with a name
5. Copy the Firebase configuration object

## 6. Update Your App Configuration

Replace the configuration in `src/auth.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}
```

## 7. Create Your First Admin User

### Method 1: Using Firebase Console

1. Go to **Authentication > Users**
2. Click **Add user**
3. Enter email and password
4. Note the User UID

### Method 2: Using Firestore Console

1. Go to **Firestore Database**
2. Create a new collection called `users`
3. Add a document with the User UID as document ID:

```json
{
  "email": "admin@yourdomain.com",
  "name": "Admin User",
  "role": "admin",
  "permissions": ["home", "users", "pages", "content", "settings"],
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLogin": null
}
```

## 8. Set Up Pre-Approved Emails Collection

The app uses a pre-approved emails system for invite-only registration. Set up the collection manually:

### Create the Collection

1. Go to **Firestore Database > Data**
2. Click **Start collection**
3. Collection ID: `preApprovedEmails`
4. Add the first document with these fields:

```javascript
{
  email: "admin@example.com",        // string (required)
  addedBy: "System Admin",           // string (required)
  notes: "Initial admin account",    // string (optional)
  status: "pending",                 // string (pending|invited|registered)
  createdAt: [Firestore Timestamp], // timestamp (auto-generated)
  updatedAt: [Firestore Timestamp]  // timestamp (optional)
}
```

### Email Status Workflow

The system tracks email status through these states:

1. **pending** - Email added to whitelist, waiting for user registration
2. **invited** - Email invitation has been sent (future feature)
3. **registered** - User has successfully created an account

### Usage

1. **Adding Emails**: Admins can add emails through the Users > Pre-Approved Emails tab
2. **Registration**: Users can only register if their email is in this collection
3. **Status Tracking**: The system automatically updates status when users register
4. **Management**: Full CRUD operations available for admins

### Sample Data Structure

```javascript
// Collection: preApprovedEmails
{
  "doc1": {
    email: "user1@company.com",
    addedBy: "admin@company.com",
    notes: "Marketing team member",
    status: "pending",
    createdAt: Timestamp,
    updatedAt: Timestamp
  },
  "doc2": {
    email: "user2@company.com", 
    addedBy: "admin@company.com",
    notes: "Developer",
    status: "registered",
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
}
```

## 9. Enable Firebase Hosting (Optional)

1. Go to **Hosting**
2. Click **Get started**
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Login: `firebase login`
5. Initialize in your project: `firebase init hosting`
6. Select your Firebase project
7. Set public directory to `dist`
8. Configure as single-page app: Yes
9. Don't overwrite index.html: No

## 10. Deploy Your App

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

## 11. Test Your Setup

1. Run your app locally: `npm run dev`
2. Try to sign in with your admin credentials
3. Check that you can access all pages
4. Test user management features
5. Verify notifications are working

## Security Best Practices

1. **Never commit Firebase config to public repos** if it contains sensitive data
2. **Use environment variables** for sensitive configuration
3. **Regularly review Firestore security rules**
4. **Enable Firebase App Check** for production
5. **Set up proper authentication flows**
6. **Monitor usage and costs** in Firebase Console

## Troubleshooting

### Common Issues:

1. **Permission denied**: Check Firestore rules and user permissions
2. **Auth not working**: Verify Firebase config and authentication provider
3. **Build errors**: Check import paths and Firebase SDK version
4. **PWA not installing**: Verify manifest.json and service worker

### Debug Tips:

1. Check browser console for errors
2. Use Firebase Console to monitor requests
3. Test with different user roles
4. Verify network requests in DevTools

## Next Steps

1. Customize the app design and branding
2. Add more pages and content types
3. Implement email invitations
4. Set up push notifications
5. Add analytics and monitoring
6. Configure custom domain (if needed)
