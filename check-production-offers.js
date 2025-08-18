import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkProductionOffers() {
  try {
    console.log('🔍 Checking production offers...');
    
    // Get a few offers to test with
    const offersSnapshot = await db.collection('offers').limit(5).get();
    
    if (offersSnapshot.empty) {
      console.log('❌ No offers found in production database');
      return;
    }
    
    console.log(`✅ Found ${offersSnapshot.size} offers in production:`);
    
    offersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Offer ID: ${doc.id}`);
      console.log(`   Amount: ₹${data.amount || 'N/A'}`);
      console.log(`   From: ${data.fromUserPhone || data.fromUserId || 'N/A'}`);
      console.log(`   To: ${data.toUserPhone || data.toUserId || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}`);
      console.log('---');
    });
    
    // Get the first offer ID for testing
    const firstOffer = offersSnapshot.docs[0];
    console.log(`\n🎯 Use this offer ID for testing: ${firstOffer.id}`);
    
  } catch (error) {
    console.error('❌ Error checking production offers:', error);
  }
}

checkProductionOffers();