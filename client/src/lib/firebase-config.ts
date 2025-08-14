import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  // These will be set from environment variables
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: Check if Firebase config is loaded properly
console.log('Firebase config loaded:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId,
  apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...'
});

// Initialize Firebase only if not already initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth  
const auth = getAuth(app);

// Connect to emulators in development to avoid hostname mismatch issues
if (import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_USE_PRODUCTION) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Firebase emulators connection already established:', error);
  }
}

// Extend window type for recaptcha
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

// Initialize reCAPTCHA verifier for phone auth
export function initializeRecaptcha() {
  if (!window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    } catch (error) {
      console.warn('reCAPTCHA initialization failed (may be in emulator mode):', error);
      // In emulator mode, reCAPTCHA might not be needed
    }
  }
  return window.recaptchaVerifier;
}

export { db, auth };
export default app;