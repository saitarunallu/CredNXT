# Required IAM Permissions for Firebase Functions Deployment

## Step-by-Step Permission Setup

### 1. Go to Google Cloud Console IAM
Navigate to: https://console.cloud.google.com/iam-admin/iam?project=crednxt-ef673

### 2. Find Your User Account
Look for: `saitanuj902@gmail.com`

### 3. Click "Edit" (pencil icon) next to your account

### 4. Add These Specific Roles:

**Required Roles to Add:**
- `Cloud Functions Admin`
- `Cloud Functions Developer` 
- `Service Account Token Creator`
- `Service Account User`
- `Firebase Admin`
- `Cloud Build Service Account`
- `Cloud Build Editor`
- `Source Repository Administrator`
- `Cloud Functions Invoker` (CRITICAL - Add this one!)

**ADDITIONAL CRITICAL PERMISSION:**
- `cloudfunctions.functions.get`
- `cloudfunctions.functions.create`
- `cloudfunctions.functions.update`

**To add these specific permissions:**
1. Go to the same IAM page
2. Find your account: `saitanuj902@gmail.com`
3. Click "Edit"
4. Add: `Cloud Functions Invoker`
5. Save changes

**Additional Service Account Permission:**
- Find service account: `crednxt-ef673@appspot.gserviceaccount.com`
- Add role: `Service Account Token Creator`
- Add role: `Cloud Functions Invoker`

### 5. Alternative: Project-Level Permissions
If the above doesn't work, you can grant broader permissions:
- `Editor` (broad project access)
- `Owner` (full project access)

### 6. Save Changes
Click "SAVE" after adding all roles

## What These Permissions Enable:
- **Cloud Functions Admin**: Deploy and manage functions
- **Service Account Token Creator**: Create tokens for service accounts
- **Firebase Admin**: Full Firebase service access
- **Cloud Build**: Build and deploy function code

## After Adding Permissions:
1. Wait 2-3 minutes for permissions to propagate
2. I'll immediately retry the Firebase Functions deployment
3. The deployment should succeed and enable PDF downloads in production

## Verification:
After deployment, we can test:
- https://us-central1-crednxt-ef673.cloudfunctions.net/api/api/health
- PDF downloads in production will work immediately