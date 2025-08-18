import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "crednxt-ef673",
  authDomain: "crednxt-ef673.firebaseapp.com",
  apiKey: "AIzaSyD2Wt6WLHp1TyI30VxGOoX0BNeUFKRUo3A",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOffer() {
  try {
    console.log('🔍 Searching for offer between:');
    console.log('Sender: 9876543210');
    console.log('Recipient: 9876543211');
    console.log('');
    
    const offersSnapshot = await getDocs(collection(db, 'offers'));
    
    const normalizePhone = (phone) => phone ? phone.replace(/^\+91/, '').replace(/\D/g, '') : '';
    
    let found = false;
    offersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if this matches our search criteria  
      const senderPhone = normalizePhone(data.fromUserPhone || '');
      const recipientPhone = normalizePhone(data.toUserPhone || '');
      
      if ((senderPhone === '9876543210' && recipientPhone === '9876543211') ||
          (data.fromUserId === 'test-sender-123' && data.toUserId === 'test-recipient-123')) {
        console.log('✅ FOUND MATCHING OFFER:');
        console.log('ID:', doc.id);
        console.log('From User ID:', data.fromUserId);
        console.log('To User ID:', data.toUserId);
        console.log('To User Phone:', data.toUserPhone);
        console.log('Amount:', data.amount);
        console.log('Status:', data.status);
        console.log('Offer Type:', data.offerType);
        console.log('Created:', data.createdAt?.toDate?.() || data.createdAt);
        console.log('');
        found = true;
      }
    });
    
    if (!found) {
      console.log('❌ No offer found between these users');
      console.log('');
      console.log('📋 Recent offers in database:');
      const recentOffers = offersSnapshot.docs
        .slice(0, 10)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            toUserPhone: normalizePhone(data.toUserPhone || ''),
            status: data.status,
            amount: data.amount
          };
        });
      
      recentOffers.forEach(offer => {
        console.log(`- ${offer.id}: From ${offer.fromUserId || 'unknown'} to ${offer.toUserId || offer.toUserPhone || 'unknown'} (${offer.status}) ₹${offer.amount}`);
      });
    }
    
    // Also check users
    console.log('\n👥 Users in database:');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const phone = normalizePhone(data.phone || '');
      if (phone === '9876543210' || phone === '9876543211') {
        console.log(`✅ ${doc.id}: ${data.name} (${data.phone})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkOffer().then(() => {
    console.log('\n✅ Database check complete');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}