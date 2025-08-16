# CLI Authentication Methods for Firebase Deployment

## Method 1: Firebase Login Token (Recommended)

### Step 1: Generate Firebase Token
1. Open your local terminal/command prompt
2. Run: `firebase login:ci`
3. Follow the browser authentication
4. Copy the generated token

### Step 2: Provide Token
Once you have the token, provide it as an environment variable:
```bash
export FIREBASE_TOKEN="your-token-here"
```

## Method 2: Service Account Key

### Step 1: Download Service Account Key
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=crednxt-ef673
2. Find service account: `firebase-adminsdk-fbsvc@crednxt-ef673.iam.gserviceaccount.com`
3. Click "Actions" → "Manage keys"
4. Click "ADD KEY" → "Create new key"
5. Choose JSON format
6. Download the key file

### Step 2: Provide Key Content
Copy the entire content of the JSON file you downloaded.

## Method 3: User Account Authentication

### Generate Access Token
1. Install Google Cloud SDK locally
2. Run: `gcloud auth login saitarun1932@gmail.com`
3. Run: `gcloud auth print-access-token`
4. Copy the access token

## What I Need From You

Choose one method and provide:

**Option A (Firebase Token):**
```
FIREBASE_TOKEN=your-firebase-cli-token
```

**Option B (Service Account Key):**
```json
{
  "type": "service_account",
  "project_id": "crednxt-ef673",
  ...entire JSON content...
}
```

**Option C (Access Token):**
```
ACCESS_TOKEN=your-google-access-token
```

## After Authentication
Once you provide the credentials, I'll:
1. Set up the authentication
2. Deploy Firebase Functions immediately
3. Test all PDF download endpoints
4. Confirm production functionality