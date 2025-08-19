// Script to create test data in Firebase using admin SDK
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: "dummy-key-id",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: "dummy-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function createTestData() {
  try {
    console.log('Creating test user and offer...');
    
    // Create test user
    const testUserId = 'test-user-123';
    const testUserPhone = '+919876543210';
    
    const testUser = {
      id: testUserId,
      phone: testUserPhone,
      name: 'Test User',
      email: 'test@example.com',
      isVerified: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    await db.collection('users').doc(testUserId).set(testUser);
    console.log('✅ Test user created:', testUserId);
    
    // Create test offer
    const testOfferId = 'test-offer-123';
    const testOffer = {
      id: testOfferId,
      fromUserId: testUserId,
      toUserPhone: '+919876543211',
      toUserName: 'Test Recipient',
      toUserId: null,
      offerType: 'lend',
      amount: 50000,
      interestRate: 12,
      interestType: 'fixed',
      tenureValue: 12,
      tenureUnit: 'months',
      repaymentType: 'emi',
      allowPartPayment: false,
      gracePeriodDays: 5,
      prepaymentPenalty: 2,
      latePaymentPenalty: 1,
      purpose: 'Test loan for debugging',
      startDate: admin.firestore.Timestamp.now(),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      currentInstallmentNumber: 1,
      totalInstallments: 12,
      note: 'This is a test offer for debugging production authentication',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    await db.collection('offers').doc(testOfferId).set(testOffer);
    console.log('✅ Test offer created:', testOfferId);
    
    // List all users and offers
    const usersSnapshot = await db.collection('users').get();
    const offersSnapshot = await db.collection('offers').get();
    
    console.log('\n📊 Database Summary:');
    console.log('Users count:', usersSnapshot.size);
    console.log('Offers count:', offersSnapshot.size);
    
    console.log('\n👥 Users:');
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name} (${data.phone})`);
    });
    
    console.log('\n💰 Offers:');
    offersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ₹${data.amount} from ${data.fromUserId} to ${data.toUserPhone}`);
    });
    
    console.log('\n🔗 Test URL: https://crednxt-ef673.web.app/offers/' + testOfferId);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData().then(() => {
    console.log('✅ Test data creation complete');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}