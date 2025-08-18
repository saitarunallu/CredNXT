// Direct fix for user authentication issue
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

const db = admin.firestore();

async function fixUserAuthentication() {
  try {
    console.log('🔧 Analyzing user authentication issue...');
    
    const targetUserId = 'xt8OK1z2PifGrAkeDA2OUVjSlLW2';
    const targetPhone = '+919676561932';
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (userDoc.exists) {
      console.log('👤 User data:', userDoc.data());
    } else {
      console.log('❌ User document not found, creating it...');
      
      await db.collection('users').doc(targetUserId).set({
        name: 'Sai Tarun Allu',
        phone: targetPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      });
      
      console.log('✅ User document created');
    }
    
    // Get all offers for this user
    const offersSnapshot = await db.collection('offers').get();
    const allOffers = offersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total offers: ${allOffers.length}`);
    
    // Find matching offers
    const userOffers = allOffers.filter(offer => {
      return offer.fromUserId === targetUserId || 
             offer.toUserId === targetUserId ||
             offer.toUserPhone === '9676561932' ||  // Phone without +91
             offer.toUserPhone === targetPhone;
    });
    
    console.log(`🎯 User's offers: ${userOffers.length}`);
    
    userOffers.forEach(offer => {
      console.log(`- ${offer.id}: from ${offer.fromUserId} to ${offer.toUserId || offer.toUserPhone} (${offer.status})`);
    });
    
    // Update offers to ensure proper toUserId mapping if needed
    for (const offer of userOffers) {
      if (offer.toUserPhone === '9676561932' && !offer.toUserId) {
        console.log(`🔧 Updating offer ${offer.id} to set toUserId`);
        
        await db.collection('offers').doc(offer.id).update({
          toUserId: targetUserId
        });
        
        console.log(`✅ Updated offer ${offer.id}`);
      }
    }
    
    console.log('🎉 Authentication fix complete');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixUserAuthentication();