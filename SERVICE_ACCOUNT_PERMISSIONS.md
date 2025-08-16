# Service Account Permissions Fix

## The Issue
The service account `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com` doesn't have Cloud Functions deployment permissions.

## Solution: Grant Permissions to Service Account

### Step 1: Go to IAM Console
https://console.cloud.google.com/iam-admin/iam?project=crednxt-ef673

### Step 2: Find the Service Account
Look for: `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com`

### Step 3: Add These Roles to the Service Account
If the service account exists:
- Click "Edit" (pencil icon)
- Add roles:
  - `Cloud Functions Admin`
  - `Cloud Functions Developer`
  - `Service Account Token Creator`
  - `Service Account User`

### Step 4: If Service Account Doesn't Exist
Click "GRANT ACCESS" and:
- Principal: `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com`
- Roles: All the above roles

### Alternative: User Account Token Method
If service account approach doesn't work, we can use your user account token:

1. Install Firebase CLI locally
2. Run: `firebase login:ci`
3. Copy the token
4. Provide it to me as: `FIREBASE_TOKEN=your-token-here`

## Current Status
- ✅ Service account key provided
- ⚠️ Service account lacks Cloud Functions permissions
- 🔧 Need to grant permissions to service account OR use user token