import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "crednxt-ef673",
  authDomain: "crednxt-ef673.firebaseapp.com",
  apiKey: "AIzaSyD2Wt6WLHp1TyI30VxGOoX0BNeUFKRUo3A",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createRealisticTest() {
  try {
    console.log('🧹 Cleaning database...');
    
    // Clear existing test data
    const offersSnapshot = await getDocs(collection(db, 'offers'));
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const doc of offersSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    for (const doc of usersSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('✅ Database cleared');
    
    // Create users with realistic Firebase Auth IDs (longer format)
    const senderId = 'bVWBKaib0IbS3VSkLKoSeOQ4YY03'; // Demo user 1 ID
    const recipientId = 'OXryhvycCzXImCJGGyZXCk89yaY2'; // Demo user 2 ID
    
    const senderData = {
      id: senderId,
      name: 'Demo Sender',
      phone: '+919876543210',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const recipientData = {
      id: recipientId,
      name: 'Demo Recipient', 
      phone: '+919876543211',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', senderId), senderData);
    await setDoc(doc(db, 'users', recipientId), recipientData);
    
    console.log('✅ Created sender:', senderData.name, senderData.phone);
    console.log('✅ Created recipient:', recipientData.name, recipientData.phone);
    
    // Create test offer using realistic Firebase Auth IDs
    const offerId = 'realistic-test-offer';
    const offerData = {
      id: offerId,
      fromUserId: senderId,
      toUserId: recipientId,
      toUserPhone: '+919876543211',
      fromUserName: senderData.name,
      toUserName: recipientData.name,
      amount: 25000,
      interestRate: '10',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      repaymentType: 'emi',
      installments: 6,
      offerType: 'lend',
      status: 'pending',
      notes: 'Realistic test with proper Firebase Auth IDs',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'offers', offerId), offerData);
    
    console.log('✅ Created realistic test offer:', offerId);
    console.log('');
    console.log('🎯 Test Instructions:');
    console.log('1. Login with phone +919876543210 (sender) - should see CANCEL button');
    console.log('2. Login with phone +919876543211 (recipient) - should see ACCEPT/DECLINE buttons');
    console.log('');
    console.log('📱 Test Offer URL: /offers/' + offerId);
    console.log('');
    console.log('🔑 User IDs for debugging:');
    console.log('Sender ID:', senderId);
    console.log('Recipient ID:', recipientId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createRealisticTest().then(() => {
    console.log('✅ Realistic test setup complete');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}