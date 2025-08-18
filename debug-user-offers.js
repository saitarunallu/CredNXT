// Debug specific user offers
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

const db = admin.firestore();

async function debugUserOffers() {
  try {
    console.log('🔍 Debugging Sai Tarun Allu offers...');
    
    const targetUserId = 'xt8OK1z2PifGrAkeDA2OUVjSlLW2';
    const targetPhone = '+919676561932';
    
    // Get all offers
    const offersSnapshot = await db.collection('offers').get();
    const allOffers = offersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📊 Total offers in database:', allOffers.length);
    
    // Find offers related to this user
    const userOffers = allOffers.filter(offer => 
      offer.fromUserId === targetUserId || 
      offer.toUserId === targetUserId ||
      offer.toUserPhone === targetPhone
    );
    
    console.log(`🎯 Offers for user ${targetUserId}:`, userOffers.length);
    
    userOffers.forEach((offer, index) => {
      console.log(`${index + 1}. Offer ${offer.id}:`);
      console.log(`   - fromUserId: ${offer.fromUserId}`);
      console.log(`   - toUserId: ${offer.toUserId}`);
      console.log(`   - toUserPhone: ${offer.toUserPhone}`);
      console.log(`   - status: ${offer.status}`);
      console.log(`   - amount: ${offer.amount}`);
    });
    
    // Show all offers with their user relationships
    console.log('\n📄 All offers breakdown:');
    allOffers.forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.id} - from: ${offer.fromUserId} to: ${offer.toUserId || offer.toUserPhone} (${offer.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging:', error);
  }
}

debugUserOffers();