# Magic Link Authentication - Simple Solution

## The Problem
Firebase's `sendSignInLinkToEmail` with `handleCodeInApp: true` opens links in new windows/tabs because:
1. It's designed primarily for mobile apps
2. Email clients (Gmail, Outlook, etc.) open external links in new windows for security
3. Firebase uses a special action handler URL that redirects

## The Solution: Custom Magic Link

Instead of using Firebase's built-in email link auth, implement a simple custom solution:

### How It Works:
1. User enters email
2. Generate a secure token and store it in Firestore with expiry
3. Send email with link: `https://kgdmin.web.app/auth.html?token=SECURE_TOKEN`
4. When user clicks link, verify token and sign them in
5. Link opens in SAME TAB because it's a simple link to your domain

### Implementation:

```javascript
// 1. Generate and send magic link
async function sendCustomMagicLink(email) {
  // Create a secure token
  const token = crypto.randomUUID()
  
  // Store token in Firestore with 15 min expiry
  await setDoc(doc(db, 'magicLinks', token), {
    email: email,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    used: false
  })
  
  // Send email with link
  const magicLink = `${window.location.origin}/auth.html?token=${token}`
  
  // Use Cloud Functions to send email via SendGrid/Mailgun
  await fetch('/api/sendMagicLink', {
    method: 'POST',
    body: JSON.stringify({ email, magicLink })
  })
}

// 2. Verify magic link when clicked
async function verifyMagicLink(token) {
  const tokenDoc = await getDoc(doc(db, 'magicLinks', token))
  
  if (!tokenDoc.exists()) {
    throw new Error('Invalid magic link')
  }
  
  const data = tokenDoc.data()
  
  // Check if expired or used
  if (data.used || data.expiresAt < new Date()) {
    throw new Error('Magic link expired or already used')
  }
  
  // Mark as used
  await updateDoc(doc(db, 'magicLinks', token), { used: true })
  
  // Sign in the user with custom token
  const customToken = await createCustomToken(data.email) // Cloud Function
  await signInWithCustomToken(auth, customToken)
  
  return data.email
}
```

### Advantages:
- ✅ Opens in SAME TAB (just a regular link)
- ✅ Complete control over email content
- ✅ Can customize expiry time
- ✅ Simple and predictable
- ✅ No Firebase email template issues

### Disadvantages:
- Requires Cloud Functions for email sending
- Requires custom token generation (Cloud Functions)

## Alternative: Accept New Window Behavior

If custom implementation is too complex, the standard approach is:
1. Accept that email links open in new windows (industry standard)
2. Make the authentication work properly in the new window
3. After auth, redirect or close the window

This is how Gmail, Slack, Discord, etc. all work!
