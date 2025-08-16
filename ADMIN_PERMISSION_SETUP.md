# Admin Permission Setup for Firebase Functions Deployment

## Grant Admin Access to Service Account

### Method 1: Full Project Admin (Recommended)
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=crednxt-ef673
2. Find service account: `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com`
3. Click "Edit" (pencil icon)
4. Add role: **`Project Editor`** or **`Owner`**
5. Save changes

### Method 2: Specific Permissions
If you prefer specific permissions, add these roles to the service account:
- `Cloud Functions Admin`
- `Cloud Functions Developer`
- `Cloud Functions Invoker`
- `IAM Service Account User`
- `IAM Service Account Token Creator`
- `Cloud Build Editor`
- `Firebase Admin`

### Method 3: User Account Token (Alternative)
If service account approach doesn't work:
1. Run locally: `firebase login:ci`
2. Copy the generated token
3. Provide as: `FIREBASE_TOKEN=your-token-here`

## Current Service Account
Email: `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com`
This account needs deployment permissions to create the Firebase Functions.

## After Granting Permissions
I'll immediately:
1. Authenticate with the updated permissions
2. Deploy the complete Firebase Functions API
3. Enable all PDF downloads in production
4. Test all endpoints to confirm functionality

## What This Enables
- PDF contract downloads
- PDF KFS downloads  
- PDF schedule downloads
- Complete API functionality
- Production offer management