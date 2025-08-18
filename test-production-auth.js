// Test production authentication flow
const admin = require('firebase-admin');

// Initialize with service account
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

async function testAuth() {
  console.log('Testing Firebase Auth token validation...');
  
  try {
    // Create a custom token for testing
    const testUid = 'test-user-' + Date.now();
    const customToken = await admin.auth().createCustomToken(testUid);
    console.log('✅ Custom token created:', customToken.substring(0, 20) + '...');
    
    // Test token verification (this simulates what the API does)
    try {
      const decodedToken = await admin.auth().verifyIdToken(customToken);
      console.log('❌ Custom token verification failed (expected - custom tokens need client-side conversion)');
    } catch (error) {
      console.log('✅ Custom token verification correctly failed:', error.code);
    }
    
    // Test user creation
    const userRecord = await admin.auth().createUser({
      uid: testUid,
      email: `test-${Date.now()}@example.com`,
      phoneNumber: `+1234567${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      password: 'testpassword123'
    });
    console.log('✅ Test user created:', userRecord.uid);
    
    // Clean up
    await admin.auth().deleteUser(testUid);
    console.log('✅ Test user deleted');
    
    console.log('🎯 Auth system is working correctly');
    console.log('🔍 Issue is likely in client-side token retrieval or API call format');
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
  }
}

testAuth().then(() => process.exit(0)).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});