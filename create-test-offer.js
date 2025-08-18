// Create a test offer in production
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crednxt-ef673'
});

const db = admin.firestore();

async function createTestOffer() {
  try {
    console.log('🚀 Creating test offer...');
    
    // Create a test user first
    const testUser = {
      name: 'Test User',
      phone: '+91 9876543210',
      email: 'test@example.com',
      isVerified: true,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    const userRef = await db.collection('users').add(testUser);
    console.log('✅ Test user created:', userRef.id);
    
    // Create a test offer
    const testOffer = {
      fromUserId: userRef.id,
      toUserId: userRef.id, // Self offer for testing
      toUserPhone: '+91 9876543210',
      amount: 50000,
      interestRate: 12,
      interestType: 'reducing',
      tenureMonths: 12,
      emiAmount: 4440,
      status: 'pending',
      isContactVerified: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    const offerRef = await db.collection('offers').add(testOffer);
    console.log('✅ Test offer created:', offerRef.id);
    
    // Verify it was created
    const createdOffer = await offerRef.get();
    console.log('📄 Created offer data:', createdOffer.data());
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

createTestOffer();