import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    console.log('Firebase initialization debug:', {
      hasProjectId: !!projectId,
      hasPrivateKey: !!privateKey && privateKey.length > 0,
      hasClientEmail: !!clientEmail,
      projectId: projectId ? projectId.substring(0, 10) + '...' : 'MISSING',
      clientEmail: clientEmail ? clientEmail.substring(0, 20) + '...' : 'MISSING'
    });

    if (!projectId || !privateKey || !clientEmail) {
      console.warn('Firebase credentials not configured. Firebase services will not be available.');
      console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
      console.warn('Current values:', {
        FIREBASE_PROJECT_ID: !!projectId,
        FIREBASE_PRIVATE_KEY: !!privateKey,
        FIREBASE_CLIENT_EMAIL: !!clientEmail
      });
      return false;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
        projectId,
      });

      console.log('Firebase Admin SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      return false;
    }
  }

  return true;
}

export { initializeFirebase, admin };