import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD2WtqVFyoXIQxD4XvFf7Mwx-CvvGCM3zg",
  authDomain: "crednxt-ef673.firebaseapp.com",
  projectId: "crednxt-ef673",
  storageBucket: "crednxt-ef673.appspot.com",
  messagingSenderId: "962728894234",
  appId: "1:962728894234:web:3f7e8e5f4d5c2b1a9b8c7d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestData() {
  try {
    console.log('Creating test data via client SDK...');
    
    // Create test user
    const testUser = {
      id: 'test-user-123',
      phone: '+919876543210',
      name: 'Test User',
      email: 'test@example.com',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', 'test-user-123'), testUser);
    console.log('✅ Test user created');
    
    // Create test offer
    const testOffer = {
      id: 'test-offer-123',
      fromUserId: 'test-user-123',
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
      startDate: new Date(),
      dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      currentInstallmentNumber: 1,
      totalInstallments: 12,
      note: 'This is a test offer for debugging production authentication',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'offers', 'test-offer-123'), testOffer);
    console.log('✅ Test offer created');
    
    // Verify data
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const offersSnapshot = await getDocs(collection(db, 'offers'));
    
    console.log('Database contains:');
    console.log('- Users:', usersSnapshot.size);
    console.log('- Offers:', offersSnapshot.size);
    
    console.log('\n🔗 Test URL: https://crednxt-ef673.web.app/offers/test-offer-123');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestData();