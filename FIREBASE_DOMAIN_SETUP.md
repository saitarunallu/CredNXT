# Firebase Domain Authorization Setup

## Problem
The reCAPTCHA is showing "host not registered" error when sending OTP from the `crednxt.com` domain.

## Solution
You need to add `crednxt.com` to the authorized domains list in your Firebase project console.

### Steps to Add Authorized Domain:

1. **Go to Firebase Console**
   - Visit [Firebase Console](https://console.firebase.google.com)
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Go to "Settings" tab
   - Click on "Authorized domains"

3. **Add Your Domain**
   - Click "Add domain"
   - Enter: `crednxt.com`
   - Click "Add"

4. **Optional: Add Subdomains (if needed)**
   - If you're using subdomains like `www.crednxt.com`, add them as well
   - You can also add `*.crednxt.com` to allow all subdomains

### Current Authorized Domains Should Include:
- `localhost` (for development)
- `your-project-id.firebaseapp.com` (default Firebase hosting)
- `crednxt.com` (your production domain)
- Any other domains you're using

### Testing:
After adding the domain, try sending an OTP again. The error should be resolved.

### Additional Notes:
- Changes to authorized domains take effect immediately
- Make sure you're using the correct Firebase project
- The domain must match exactly (including subdomain if applicable)

## Code Changes Made:
I've also updated the code to provide better error messages and debugging information:
- Enhanced reCAPTCHA initialization with better error handling
- Added domain-specific error detection in the OTP sending process
- Improved console logging to help identify domain-related issues

The application will now show a clear error message if the domain is not authorized, guiding you to add it to Firebase.