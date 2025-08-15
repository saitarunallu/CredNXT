import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, RecaptchaVerifier } from 'firebase/auth';

// Check if Firebase config is available
const hasFirebaseConfig = !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = hasFirebaseConfig ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} : {
  // Fallback config for MVP when Firebase isn't configured
  apiKey: "demo-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

console.log('Firebase config status:', {
  configured: hasFirebaseConfig,
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  usingFallback: !hasFirebaseConfig
});

// Initialize Firebase only if we have proper config or using fallback
let app;
let db: any = null;
let auth: any = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Only initialize Firestore and Auth if we have real config
  if (hasFirebaseConfig) {
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    // Create mock objects for MVP
    console.log('Using Firebase fallback mode for MVP');
    db = { collection: () => null, doc: () => null };
    auth = { currentUser: null, signOut: () => Promise.resolve() };
  }
} catch (error) {
  console.error('Firebase initialization failed, using fallback:', error);
  // Create mock objects if initialization fails
  db = { collection: () => null, doc: () => null };
  auth = { currentUser: null, signOut: () => Promise.resolve() };
}

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
  if (!hasFirebaseConfig) {
    console.log('reCAPTCHA not available in fallback mode');
    return null;
  }

  if (!window.recaptchaVerifier) {
    console.log('Initializing reCAPTCHA for domain:', window.location.hostname);
    
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log('reCAPTCHA verified successfully', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired, please try again');
          // Clear and reinitialize on expiry
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
          }
        },
        'error-callback': (error: any) => {
          console.error('reCAPTCHA error:', error);
          console.error('Domain authorization may still be pending. Please wait a few minutes after adding domain to Firebase Console.');
        }
      });
    } catch (error) {
      console.error('Failed to initialize reCAPTCHA:', error);
      throw error;
    }
  }
  return window.recaptchaVerifier;
}

export { hasFirebaseConfig };

export { db, auth };
export default app;