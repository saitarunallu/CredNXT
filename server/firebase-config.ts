import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (admin.apps.length === 0) {
    // Prioritize service account JSON config for security
    if (process.env.FIREBASE_CONFIG_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });

        console.log('✅ Firebase Admin SDK initialized successfully');
        console.log(`📡 Connected to project: ${serviceAccount.project_id}`);
        return true;
      } catch (error: any) {
        console.error('❌ Failed to initialize Firebase Admin SDK with service account');
        console.error('🔍 Error details:', error.message);
        return false;
      }
    }

    // Fallback to individual environment variables if service account JSON not available
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      console.error('❌ Firebase Admin SDK initialization failed - missing credentials');
      console.error('📋 Required: FIREBASE_CONFIG_JSON or individual environment variables');
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Development mode: continuing without Firebase credentials');
        console.warn('   Some features (notifications, SMS) will be limited');
        return false;
      }
      
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

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`📡 Connected to project: ${projectId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize Firebase Admin SDK');
      console.error('🔍 Error details:', error.message);
      return false;
    }
  }

  console.log('✅ Firebase Admin SDK already initialized');
  return true;
}

export { initializeFirebase, admin };