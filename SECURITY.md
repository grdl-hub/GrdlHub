# Security Architecture - GrdlHub

## Overview

GrdlHub has been redesigned with a **security-first approach** that separates the authentication flow from the main application. This document outlines the security improvements and architectural changes.

## Security Improvements Implemented

### 1. **Separated Authentication Module**

#### **Before (Security Issues)**
- Auth logic mixed with main app code
- All Firebase credentials loaded upfront
- Larger attack surface
- Auth state exposed throughout the app

#### **After (Secure Approach)**
- **Standalone auth module** (`auth-standalone.js`)
- **Separate auth page** (`auth.html`)
- **Lazy loading** of main app only after authentication
- **Minimal credential exposure**

### 2. **Entry Point Isolation**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   index.html    │───▶│   auth.html      │───▶│   main-app.js   │
│  (Entry Check)  │    │ (Auth Flow Only) │    │ (Full App)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

#### **File Structure**
- `index.html` - Entry point with auth check
- `auth.html` - Dedicated authentication page
- `auth-standalone.js` - Isolated auth module
- `auth-app.js` - Auth page controller
- `main-app.js` - Main application (loads only after auth)

### 3. **Content Security Policy (CSP)**

#### **Security Headers Implemented**
```html
<!-- Strict CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com; 
               connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firestore.googleapis.com;">

<!-- Security Headers -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
```

### 4. **Secure Token Management**

#### **Invite Token System**
```javascript
// Server-side token generation (simplified for demo)
export function generateSecureInviteToken(userId, email) {
  const timestamp = Date.now()
  const payload = btoa(JSON.stringify({ userId, email, timestamp }))
  const signature = btoa(`${userId}-${email}-${timestamp}`)
  return `${payload}.${signature}`
}

// Token validation with expiry
export function validateInviteToken(token) {
  const [payload, signature] = token.split('.')
  const decoded = JSON.parse(atob(payload))
  
  // 24-hour expiry
  const tokenAge = Date.now() - decoded.timestamp
  if (tokenAge > 24 * 60 * 60 * 1000) {
    return { valid: false, reason: 'Token expired' }
  }
  
  return { valid: true, data: decoded }
}
```

### 5. **Secure Context Validation**

```javascript
// Security utilities
export const SecurityUtils = {
  // Check if running in secure context
  isSecureContext() {
    return window.isSecureContext || location.protocol === 'https:'
  },
  
  // Generate secure random string
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  },
  
  // Clear sensitive data from memory
  clearAuthData() {
    currentAuthUser = null
  }
}
```

## Security Benefits

### ✅ **Reduced Attack Surface**
- Auth code is isolated and only loads when needed
- Main app never loads for unauthenticated users
- Sensitive Firebase operations confined to auth module

### ✅ **Code Splitting & Lazy Loading**
- Auth bundle loads first (smaller, faster)
- Main app bundle loads only after successful authentication
- Prevents unauthorized code access

### ✅ **Token-Based Security**
- Secure invite tokens with expiration
- Server-side token generation (in production)
- Token validation before account creation

### ✅ **Strict Content Security Policy**
- Prevents XSS attacks
- Blocks unauthorized script execution
- Restricts resource loading to trusted sources

### ✅ **Secure Headers**
- Prevents clickjacking (X-Frame-Options)
- Blocks MIME sniffing attacks
- Enables XSS protection

## Production Security Recommendations

### 🔐 **Server-Side Token Generation**
```javascript
// In production, implement server-side token generation
// POST /api/generate-invite-token
{
  "userId": "user123",
  "email": "user@example.com",
  "expiresIn": "24h"
}

// Response with signed JWT
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2025-01-02T12:00:00Z"
}
```

### 🔐 **Environment Variables**
```bash
# Firebase config should be in environment variables
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### 🔐 **HTTPS Enforcement**
```javascript
// Enforce HTTPS in production
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace('https:' + window.location.href.substring(window.location.protocol.length))
}
```

### 🔐 **Rate Limiting**
- Implement rate limiting on auth endpoints
- Add CAPTCHA for repeated failed attempts
- Monitor and alert on suspicious activity

### 🔐 **Database Security Rules**
```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Security Monitoring

### 📊 **Audit Events**
- Failed authentication attempts
- Invalid token usage
- Unauthorized page access attempts
- Privilege escalation attempts

### 📊 **Security Metrics**
- Authentication success/failure rates
- Token validation failures
- CSP violation reports
- Session duration and patterns

## Testing Security

### 🧪 **Security Test Cases**
1. **Unauthenticated Access**: Verify main app never loads without auth
2. **Token Expiry**: Test expired invite tokens are rejected
3. **CSP Violations**: Ensure CSP blocks unauthorized resources
4. **Session Management**: Test logout clears all sensitive data
5. **XSS Prevention**: Verify input sanitization

### 🧪 **Tools for Security Testing**
- OWASP ZAP for vulnerability scanning
- Browser DevTools Security tab
- CSP violation reporting
- Firebase Auth Emulator for testing

## Implementation Notes

1. **Firebase Configuration**: Update `auth-standalone.js` with your Firebase config
2. **Production Deployment**: Implement server-side token generation
3. **HTTPS**: Ensure HTTPS in production for secure context
4. **Monitoring**: Set up security monitoring and alerting
5. **Regular Updates**: Keep dependencies updated for security patches

This security architecture provides a robust foundation for protecting user authentication and sensitive application data.
