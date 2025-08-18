// Script to check production database data
import admin from 'firebase-admin';

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

const db = admin.firestore();

async function checkData() {
  try {
    console.log('🔍 Checking production Firestore data...');
    
    // Check offers collection
    const offersSnapshot = await db.collection('offers').limit(10).get();
    console.log(`📊 Total offers found: ${offersSnapshot.size}`);
    
    if (offersSnapshot.size > 0) {
      console.log('📄 Sample offers:');
      offersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}, fromUserId: ${data.fromUserId}, toUserId: ${data.toUserId}, status: ${data.status}`);
      });
    }
    
    // Check users collection
    const usersSnapshot = await db.collection('users').limit(5).get();
    console.log(`👥 Total users found: ${usersSnapshot.size}`);
    
    if (usersSnapshot.size > 0) {
      console.log('👤 Sample users:');
      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}, name: ${data.name}, phone: ${data.phone}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

checkData();