import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  projectId: "crednxt-ef673",
  authDomain: "crednxt-ef673.firebaseapp.com",
  apiKey: "AIzaSyD2Wt6WLHp1TyI30VxGOoX0BNeUFKRUo3A",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupTestUsers() {
  try {
    console.log('🧹 Clearing existing test data...');
    
    // Clear existing offers and users
    const offersSnapshot = await getDocs(collection(db, 'offers'));
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    // Delete existing test data
    for (const doc of offersSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    for (const doc of usersSnapshot.docs) {
      if (doc.id.includes('test-') || doc.data().phone?.includes('9876543')) {
        await deleteDoc(doc.ref);
      }
    }
    
    console.log('✅ Cleared test data');
    
    // Create sender user (test-sender)
    const senderId = 'test-sender-123';
    const senderData = {
      id: senderId,
      name: 'Test Sender',
      phone: '+919876543210',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', senderId), senderData);
    console.log('✅ Created sender:', senderData.name, senderData.phone);
    
    // Create recipient user (test-recipient) 
    const recipientId = 'test-recipient-123';
    const recipientData = {
      id: recipientId,
      name: 'Test Recipient',
      phone: '+919876543211',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', recipientId), recipientData);
    console.log('✅ Created recipient:', recipientData.name, recipientData.phone);
    
    // Create test offer from sender to recipient
    const offerId = 'test-offer-sender-to-recipient';
    const offerData = {
      id: offerId,
      fromUserId: senderId,
      toUserId: recipientId, // Set the actual user ID for proper authorization
      toUserPhone: '+919876543211',
      fromUserName: senderData.name,
      toUserName: recipientData.name,
      amount: 50000,
      interestRate: '12',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      repaymentType: 'emi',
      installments: 12,
      offerType: 'lend',
      status: 'pending',
      notes: 'Test loan offer for role-based authorization testing',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'offers', offerId), offerData);
    console.log('✅ Created test offer:', offerId);
    
    console.log('\n🎯 Test Scenarios:');
    console.log('1. Login as sender (Test Sender, +919876543210):');
    console.log('   - Should see CANCEL button only');
    console.log('   - URL: /offers/' + offerId);
    console.log('');
    console.log('2. Login as recipient (Test Recipient, +919876543211):');
    console.log('   - Should see ACCEPT/DECLINE buttons');
    console.log('   - URL: /offers/' + offerId);
    console.log('');
    console.log('📱 Test URLs:');
    console.log('Dev: http://localhost:5000/offers/' + offerId);
    console.log('Prod: https://crednxt-ef673.web.app/offers/' + offerId);
    
  } catch (error) {
    console.error('❌ Error setting up test users:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestUsers().then(() => {
    console.log('✅ Test user setup complete');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}