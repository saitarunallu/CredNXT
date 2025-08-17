// Create a test offer to trigger notifications
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'crednxt-ef673'
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function createTestOffer() {
  try {
    console.log('🎯 Creating test offer to phone 9876543210...');
    
    // First, let's create/ensure the target user exists
    const targetPhone = '9876543210';
    let targetUser = null;
    
    // Check if user exists
    const usersSnapshot = await db.collection('users').where('phone', '==', targetPhone).get();
    
    if (usersSnapshot.empty) {
      console.log('👤 Creating target user for phone:', targetPhone);
      // Create the target user
      const targetUserData = {
        phone: targetPhone,
        name: 'Test Recipient',
        email: 'test.recipient@example.com',
        isVerified: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      const targetUserRef = await db.collection('users').add(targetUserData);
      targetUser = { id: targetUserRef.id, ...targetUserData };
      console.log('✅ Created target user:', targetUser.id);
    } else {
      targetUser = { id: usersSnapshot.docs[0].id, ...usersSnapshot.docs[0].data() };
      console.log('✅ Found existing target user:', targetUser.id);
    }
    
    // Now get or create the sender user
    const senderPhone = '9100754913';
    let senderUser = null;
    
    const senderSnapshot = await db.collection('users').where('phone', '==', senderPhone).get();
    
    if (senderSnapshot.empty) {
      console.log('👤 Creating sender user for phone:', senderPhone);
      const senderUserData = {
        phone: senderPhone,
        name: 'Test Sender',
        email: 'test.sender@example.com',
        isVerified: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      const senderUserRef = await db.collection('users').add(senderUserData);
      senderUser = { id: senderUserRef.id, ...senderUserData };
      console.log('✅ Created sender user:', senderUser.id);
    } else {
      senderUser = { id: senderSnapshot.docs[0].id, ...senderSnapshot.docs[0].data() };
      console.log('✅ Found existing sender user:', senderUser.id);
    }
    
    // Create the offer
    const offerData = {
      fromUserId: senderUser.id,
      toUserId: targetUser.id,
      toPhone: targetPhone,
      amount: '25000',
      interestRate: '12',
      tenureValue: '12',
      tenureUnit: 'months',
      repaymentType: 'emi',
      repaymentFrequency: 'monthly',
      purpose: 'Personal loan for education expenses',
      type: 'lend',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      currentInstallmentNumber: 1,
      nextDueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
    };
    
    const offerRef = await db.collection('offers').add(offerData);
    console.log('✅ Created offer:', offerRef.id);
    
    // Create notification for the recipient
    const notificationData = {
      userId: targetUser.id,
      offerId: offerRef.id,
      type: 'offer_received',
      priority: 'high',
      title: 'New Loan Offer Received! 🎉',
      message: `${senderUser.name} has sent you a loan offer of ₹25,000 for 12 months at 12% interest. Review and respond to this offer.`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
      metadata: JSON.stringify({
        amount: '25000',
        tenure: '12 months',
        purpose: 'Personal loan for education expenses',
        senderName: senderUser.name
      })
    };
    
    const notificationRef = await db.collection('notifications').add(notificationData);
    console.log('✅ Created notification:', notificationRef.id);
    
    // Also create a notification for the sender
    const senderNotificationData = {
      userId: senderUser.id,
      offerId: offerRef.id,
      type: 'offer_sent',
      priority: 'medium',
      title: 'Loan Offer Sent Successfully ✓',
      message: `Your loan offer of ₹25,000 has been sent to ${targetUser.name} (${targetPhone}). You'll be notified when they respond.`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
      metadata: JSON.stringify({
        amount: '25000',
        tenure: '12 months',
        recipientName: targetUser.name,
        recipientPhone: targetPhone
      })
    };
    
    const senderNotificationRef = await db.collection('notifications').add(senderNotificationData);
    console.log('✅ Created sender notification:', senderNotificationRef.id);
    
    console.log('\n🎯 Summary:');
    console.log(`   📱 Target phone: ${targetPhone}`);
    console.log(`   👤 Target user ID: ${targetUser.id}`);
    console.log(`   📋 Offer ID: ${offerRef.id}`);
    console.log(`   🔔 Notification ID: ${notificationRef.id}`);
    console.log(`   💰 Offer amount: ₹25,000`);
    console.log(`   ⏰ Tenure: 12 months at 12% interest`);
    
    return {
      success: true,
      offerId: offerRef.id,
      notificationId: notificationRef.id,
      targetUserId: targetUser.id,
      targetPhone: targetPhone
    };
    
  } catch (error) {
    console.error('❌ Error creating test offer:', error);
    return { success: false, error: error.message };
  }
}

// Run the script
createTestOffer()
  .then(result => {
    console.log('\n🎯 Test offer creation completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });