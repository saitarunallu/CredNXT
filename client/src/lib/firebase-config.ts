import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
  ];
  
  const missing = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.error('❌ Firebase frontend configuration incomplete');
    console.error('📋 Missing environment variables:', missing.map(f => `VITE_FIREBASE_${f.toUpperCase()}`));
    console.error('🔧 Add these to your environment variables or .env file');
    console.error('📄 Check DEPLOYMENT_CHECKLIST.md for setup instructions');
    return false;
  }
  
  // Validate API key format
  if (!firebaseConfig.apiKey?.startsWith('AIza')) {
    console.error('❌ Firebase API key appears to be invalid');
    console.error('🔧 API keys should start with "AIza" - check VITE_FIREBASE_API_KEY');
    return false;
  }
  
  return true;
}

const configValid = validateFirebaseConfig();

if (process.env.NODE_ENV === 'development') {
  if (configValid) {
    console.log('✅ Firebase config loaded successfully:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...'
    });
  }
}

// Initialize Firebase only if not already initialized and config is valid
let app;
if (!getApps().length) {
  if (configValid) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
  } else {
    console.error('❌ Cannot initialize Firebase - configuration validation failed');
    throw new Error('Firebase configuration validation failed');
  }
} else {
  app = getApps()[0];
  console.log('✅ Using existing Firebase app');
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth  
const auth = getAuth(app);

// Connect to emulators in development (disabled for now to use production Firebase)
// if (import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_USE_PRODUCTION) {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectAuthEmulator(auth, 'http://localhost:9099');
//     console.log('Connected to Firebase emulators');
//   } catch (error) {
//     console.log('Firebase emulators connection failed (may already be connected):', error);
//   }
// }

// Extend window type for recaptcha
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

// Initialize reCAPTCHA verifier for phone auth
export function initializeRecaptcha() {
  if (!window.recaptchaVerifier) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Initializing reCAPTCHA for domain:', window.location.hostname);
    }
    
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('reCAPTCHA verified successfully', response);
          }
        },
        'expired-callback': () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('reCAPTCHA expired, please try again');
          }
          // Clear and reinitialize on expiry
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
          }
        },
        'error-callback': (error: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('reCAPTCHA error:', error);
            console.error('Domain authorization may still be pending. Please wait a few minutes after adding domain to Firebase Console.');
          }
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize reCAPTCHA:', error);
      }
      throw error;
    }
  }
  return window.recaptchaVerifier;
}

export { db, auth };
export default app;