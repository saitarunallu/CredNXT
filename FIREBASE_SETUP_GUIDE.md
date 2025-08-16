# Firebase Setup Guide for CredNXT

This guide will help you set up Firebase for the CredNXT application deployment.

## Prerequisites

- A Google account
- Access to Firebase Console (https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `crednxt-production` (or your preferred name)
4. Enable/disable Google Analytics (optional for this app)
5. Select analytics account if enabled
6. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Phone** authentication:
   - Click on **Phone**
   - Toggle **Enable**
   - Click **Save**

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (we have custom rules)
4. Select a location close to your users (e.g., `us-central1` for US)
5. Click **Done**

## Step 4: Configure Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with the content from `firestore.rules` in your project
3. Click **Publish**

## Step 5: Get Frontend Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Add app** → **Web app** (</> icon)
4. Enter app nickname: `crednxt-web`
5. Check **Also set up Firebase Hosting** if you plan to use it
6. Click **Register app**
7. Copy the `firebaseConfig` object values to your environment variables:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Step 6: Generate Service Account Key (Backend)

1. In **Project Settings**, go to **Service accounts** tab
2. Click **Generate new private key**
3. Click **Generate key** - this downloads a JSON file
4. Open the JSON file and extract these values for your environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important**: The private key must include the newline characters (`\n`) and be wrapped in quotes.

## Step 7: Configure Authorized Domains

For phone authentication to work, you need to add your deployment domain:

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add your deployment domain(s):
   - For Replit: `your-repl-name.replit.app`
   - For custom domain: `your-domain.com`
4. Wait 5-10 minutes for changes to propagate

## Step 8: Test Configuration

1. Set all environment variables in your deployment platform
2. Deploy your application
3. Check the health endpoint: `https://your-domain.com/api/health/detailed`
4. Verify that all Firebase checks show "healthy" status

## Security Best Practices

### Firestore Rules
- Never use `allow read, write: if true;` in production
- Implement proper user-based access controls
- Test rules using the Rules playground

### API Keys
- Frontend API keys can be public (they have domain restrictions)
- Backend service account keys must be kept secret
- Rotate service account keys periodically

### Domain Security
- Only add necessary domains to authorized domains
- Remove test/development domains from production project
- Enable App Check for additional security (optional)

## Troubleshooting

### Common Issues

#### "auth/invalid-api-key"
- Check that `VITE_FIREBASE_API_KEY` is set correctly
- Verify the API key starts with "AIza"
- Ensure the key is from the correct Firebase project

#### "auth/unauthorized-domain"
- Add your domain to Firebase Console → Authentication → Authorized domains
- Wait 5-10 minutes for propagation
- Check that the domain matches exactly (including protocol)

#### Firebase Admin SDK Errors
- Verify `FIREBASE_PROJECT_ID` matches your project
- Check that `FIREBASE_PRIVATE_KEY` includes proper formatting with `\n`
- Ensure `FIREBASE_CLIENT_EMAIL` is from the correct service account

#### "Permission denied" in Firestore
- Check that Firestore rules are published
- Verify user authentication is working
- Test rules in Firebase Console Rules playground

### Debugging Steps

1. **Check Environment Variables**:
   ```bash
   # In your server
   curl https://your-domain.com/api/health/detailed
   ```

2. **Test Frontend Firebase Connection**:
   - Open browser developer tools
   - Check for Firebase-related errors in console
   - Verify network requests to Firebase APIs

3. **Test Backend Firebase Connection**:
   - Check server logs for Firebase initialization messages
   - Test API endpoints that interact with Firestore

4. **Verify Authentication Flow**:
   - Try phone number authentication
   - Check for reCAPTCHA issues
   - Verify OTP delivery

## Environment Variables Checklist

Before deployment, ensure all these variables are set:

### Backend (Required)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `JWT_SECRET` (not default value)

### Frontend (Required)
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`

### Optional
- [ ] `FRONTEND_URL` (for CORS in production)
- [ ] `NODE_ENV=production`

## Next Steps

After Firebase setup is complete:

1. ✅ Configure environment variables in your deployment platform
2. ✅ Deploy the application
3. ✅ Add your domain to Firebase authorized domains
4. ✅ Test authentication and core functionality
5. ✅ Monitor application health endpoints
6. ✅ Set up backup and monitoring (optional)

For deployment-specific instructions, see `DEPLOYMENT_CHECKLIST.md`.