import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Enhanced validation with detailed error messages
    if (!projectId || !privateKey || !clientEmail) {
      console.error('❌ Firebase Admin SDK initialization failed - missing credentials');
      console.error('📋 Required environment variables:');
      console.error(`   FIREBASE_PROJECT_ID: ${projectId ? '✅ Set' : '❌ Missing'}`);
      console.error(`   FIREBASE_PRIVATE_KEY: ${privateKey ? '✅ Set' : '❌ Missing'}`);
      console.error(`   FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅ Set' : '❌ Missing'}`);
      console.error('');
      console.error('🔧 To fix this:');
      console.error('   1. Go to Firebase Console > Project Settings > Service Accounts');
      console.error('   2. Click "Generate new private key"');
      console.error('   3. Add the credentials to your environment variables');
      console.error('   4. Check DEPLOYMENT_CHECKLIST.md for detailed instructions');
      console.error('');
      return false;
    }

    // Validate private key format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ Firebase private key appears to be malformed');
      console.error('🔧 Ensure FIREBASE_PRIVATE_KEY includes the full key with headers:');
      console.error('   "-----BEGIN PRIVATE KEY-----\\n...key content...\\n-----END PRIVATE KEY-----\\n"');
      return false;
    }

    // Validate email format
    if (!clientEmail.includes('@') || !clientEmail.includes('.iam.gserviceaccount.com')) {
      console.error('❌ Firebase client email appears to be malformed');
      console.error(`   Expected format: firebase-adminsdk-xxxxx@${projectId}.iam.gserviceaccount.com`);
      console.error(`   Received: ${clientEmail}`);
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
      
      // Provide specific guidance based on error type
      if (error.message.includes('private_key')) {
        console.error('🔧 Private key issue - check FIREBASE_PRIVATE_KEY format');
      } else if (error.message.includes('client_email')) {
        console.error('🔧 Client email issue - check FIREBASE_CLIENT_EMAIL');
      } else if (error.message.includes('project_id')) {
        console.error('🔧 Project ID issue - check FIREBASE_PROJECT_ID');
      }
      
      return false;
    }
  }

  console.log('✅ Firebase Admin SDK already initialized');
  return true;
}

export { initializeFirebase, admin };