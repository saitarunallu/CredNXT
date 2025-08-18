import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, RecaptchaVerifier, type Auth } from 'firebase/auth';

// Use actual project ID from environment or fallback
const actualProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'crednxt-ef673';

// Firebase configuration using environment variables only
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${actualProjectId}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || actualProjectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${actualProjectId}.appspot.com`,
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
    console.warn('⚠️ Firebase frontend configuration incomplete - using development fallbacks');
    console.warn('📋 Missing environment variables:', missing.map(f => `VITE_FIREBASE_${f.toUpperCase()}`));
    console.warn('🔧 Add these to your environment variables or .env file for full functionality');
    console.warn('📄 Check DEPLOYMENT_CHECKLIST.md for setup instructions');
    // In development, continue with fallback config instead of failing
    return import.meta.env.DEV ? true : false;
  }
  
  // Validate API key format (skip for development fallback)
  if (!firebaseConfig.apiKey?.startsWith('AIza') && !firebaseConfig.apiKey?.startsWith('dev-fallback')) {
    console.error('❌ Firebase API key appears to be invalid');
    console.error('🔧 API keys should start with "AIza" - check VITE_FIREBASE_API_KEY');
    return import.meta.env.DEV ? true : false;
  }
  
  return true;
}

const configValid = validateFirebaseConfig();

// Always log Firebase config status for debugging
if (configValid) {
  console.log('✅ Firebase config loaded successfully:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...'
  });
} else {
  console.error('❌ Firebase config validation failed:', {
    apiKey: firebaseConfig.apiKey ? '✅' : '❌',
    authDomain: firebaseConfig.authDomain ? '✅' : '❌',
    projectId: firebaseConfig.projectId ? '✅' : '❌',
    storageBucket: firebaseConfig.storageBucket ? '✅' : '❌',
    messagingSenderId: firebaseConfig.messagingSenderId ? '✅' : '❌',
    appId: firebaseConfig.appId ? '✅' : '❌'
  });
}

// Initialize Firebase only if not already initialized
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    // Initialize Firestore and Auth
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('✅ Firebase services initialized successfully');
  } catch (initError) {
    console.error('❌ Firebase initialization failed:', initError);
    console.warn('🔧 The app will continue running with limited functionality');
    console.warn('📄 See DEPLOYMENT_CHECKLIST.md for proper Firebase setup');
    
    // Create mock services that won't break the app
    app = null;
    db = null;
    auth = null;
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('✅ Using existing Firebase app');
}

// Firebase services are now initialized above

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
  if (!window.recaptchaVerifier && auth) {
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

// Export with safe fallbacks
export { db, auth };
export default app;