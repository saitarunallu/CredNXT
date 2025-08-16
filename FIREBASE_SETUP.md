# Firebase Hosting and Storage Setup Guide

Your webapp has been configured to use Firebase for hosting and Firestore for data storage. Follow these steps to complete the setup.

## 1. Firebase Project Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Firestore Database
   - Enable Authentication (optional, for user auth)

2. **Generate Firebase Admin SDK Key**:
   - Go to Project Settings → Service Accounts
   - Generate a new private key
   - Download the JSON file

3. **Get Client Configuration**:
   - Go to Project Settings → General
   - In "Your apps" section, add a web app
   - Copy the configuration values

## 2. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your Firebase configuration:

```env
# Firebase Configuration (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Firebase Configuration (Client-side)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# JWT Configuration
JWT_SECRET=your-jwt-secret-here

# Port Configuration
PORT=5000
```

## 3. Firebase Project Configuration

Update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

## 4. Firestore Rules

Your `firestore.rules` should be configured for your app's security needs:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /offers/{offerId} {
      allow read, write: if request.auth != null;
    }
    
    match /payments/{paymentId} {
      allow read, write: if request.auth != null;
    }
    
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 5. Build and Deploy

### For Development
```bash
npm run dev
```

### For Firebase Hosting
```bash
# Build for Firebase
./build-firebase.sh

# Deploy to Firebase
firebase deploy

# Or do both
./deploy-firebase.sh
```

### First Time Setup
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (already configured)
# firebase init
```

## 6. Database Migration

Your app is now configured to use Firestore instead of PostgreSQL. The storage layer (`server/storage.ts`) automatically uses the FirestoreStorage implementation.

### Key Changes Made:
- ✅ Updated storage layer to use Firestore
- ✅ Created client-side Firebase configuration 
- ✅ Updated Firebase hosting configuration
- ✅ Created build and deploy scripts
- ✅ Fixed TypeScript compatibility issues

## 7. Development with Emulators (Optional)

For local development with Firebase emulators:

```bash
# Start Firebase emulators
firebase emulators:start

# Run your app with emulators
VITE_FIREBASE_USE_PRODUCTION=false npm run dev
```

## Architecture Overview

- **Frontend**: React app built with Vite → Firebase Hosting
- **Backend**: Express.js server (for APIs) → Deploy separately or use Firebase Functions
- **Database**: Firestore (NoSQL) → Replaces PostgreSQL
- **Authentication**: Firebase Auth (if needed)
- **Storage**: Firebase Storage (if needed for files)

## Next Steps

1. Set up your Firebase project and get the configuration values
2. Update your `.env` file with actual Firebase credentials
3. Update `.firebaserc` with your project ID
4. Test locally with `npm run dev`
5. Deploy with `./deploy-firebase.sh`

Your webapp is now ready for Firebase hosting and storage!