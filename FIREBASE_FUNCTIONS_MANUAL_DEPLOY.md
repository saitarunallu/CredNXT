# Firebase Functions Manual Deployment Guide

## Current Issue
Firebase Functions deployment is blocked by IAM permission error despite adding all required roles:
- Firebase Admin SDK Administrator Service Agent
- Service Account Token Creator  
- Service Account User
- Owner

## Error Message
```
Error: Missing permissions required for functions deploy. You must have permission iam.serviceAccounts.ActAs on service account crednxt-ef673@appspot.gserviceaccount.com.
```

## Manual Deployment Steps

### Option 1: Firebase Console Deployment
1. Go to [Firebase Console](https://console.firebase.google.com/project/crednxt-ef673/functions)
2. Click "Get started" or "Create function"
3. Use the Firebase Console's built-in editor to manually upload the functions

### Option 2: Google Cloud Console Deployment
1. Go to [Google Cloud Console Functions](https://console.cloud.google.com/functions/list?project=crednxt-ef673)
2. Click "CREATE FUNCTION"
3. Set function name: `api`
4. Set runtime: Node.js 20
5. Upload the functions/src/index.js file content
6. Set entry point: `api`
7. Deploy

### Option 3: Alternative Firebase CLI Authentication
Try using Firebase CLI with explicit authentication:
```bash
firebase login --reauth
firebase use crednxt-ef673
firebase deploy --only functions
```

### Option 4: Service Account Key File
1. Download service account key from Google Cloud Console
2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
3. Try deployment again

## Function Content to Deploy
The functions/src/index.js file contains the complete API server with:
- Authentication middleware
- All offer management endpoints
- PDF generation endpoints (contract, KFS, schedule)
- User management endpoints

## Production Impact
Without Firebase Functions deployed:
- PDF downloads return 404 in production
- API endpoints are not accessible
- Only frontend hosting works

## Current Workaround
PDF downloads work perfectly in development environment. Production users will see error messages until Functions are deployed.