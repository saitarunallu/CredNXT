// Check current authentication user details
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

async function checkCurrentAuthUser() {
  try {
    console.log('🔍 Checking Firebase Auth users...');
    
    const listUsersResult = await admin.auth().listUsers();
    
    listUsersResult.users.forEach(userRecord => {
      console.log(`Auth User: ${userRecord.uid}`);
      console.log(`  - Phone: ${userRecord.phoneNumber}`);
      console.log(`  - Display: ${userRecord.displayName || 'N/A'}`);
      console.log(`  - Email: ${userRecord.email || 'N/A'}`);
      console.log(`  - Created: ${userRecord.metadata.creationTime}`);
      console.log('---');
    });
    
    // Check if there's a specific user for Sai Tarun's phone
    const saiPhone = '+919676561932';
    const matchingUser = listUsersResult.users.find(u => u.phoneNumber === saiPhone);
    
    if (matchingUser) {
      console.log(`🎯 Found auth user for ${saiPhone}:`, matchingUser.uid);
    } else {
      console.log(`❌ No auth user found for ${saiPhone}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking auth users:', error);
  }
}

checkCurrentAuthUser();