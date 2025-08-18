// Fix user authentication by updating existing users or creating test accounts
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

const db = admin.firestore();

async function fixUserAuth() {
  try {
    console.log('🔧 Fixing user authentication issues...');
    
    // Get all existing users from Firestore
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users in Firestore`);
    
    const firebaseUsers = [];
    
    // List all Firebase Auth users
    const listUsersResult = await admin.auth().listUsers();
    console.log(`Found ${listUsersResult.users.length} users in Firebase Auth`);
    
    listUsersResult.users.forEach(userRecord => {
      firebaseUsers.push({
        uid: userRecord.uid,
        phone: userRecord.phoneNumber,
        email: userRecord.email
      });
      console.log(`Auth user: ${userRecord.uid}, phone: ${userRecord.phoneNumber}`);
    });
    
    // Check if Firestore users match Auth users
    const firestoreUsers = [];
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      firestoreUsers.push({
        id: doc.id,
        name: userData.name,
        phone: userData.phone,
        email: userData.email
      });
      console.log(`Firestore user: ${doc.id}, name: ${userData.name}, phone: ${userData.phone}`);
    });
    
    // Create Firebase Auth users for existing Firestore users if they don't exist
    for (const firestoreUser of firestoreUsers) {
      const authUser = firebaseUsers.find(u => u.uid === firestoreUser.id);
      if (!authUser && firestoreUser.phone) {
        try {
          console.log(`Creating Auth user for: ${firestoreUser.id} (${firestoreUser.phone})`);
          await admin.auth().createUser({
            uid: firestoreUser.id,
            phoneNumber: firestoreUser.phone,
            email: firestoreUser.email || undefined,
            displayName: firestoreUser.name || undefined
          });
          console.log(`✅ Created Auth user: ${firestoreUser.id}`);
        } catch (error) {
          console.log(`⚠️ Could not create Auth user for ${firestoreUser.id}:`, error.message);
        }
      }
    }
    
    console.log('✅ User authentication fix completed');
    
  } catch (error) {
    console.error('❌ Error fixing user auth:', error);
  }
}

fixUserAuth();