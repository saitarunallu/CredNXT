// Direct Firebase Admin script to create test notifications
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

async function createTestNotification() {
  try {
    // Create a test notification for the first user we can find
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    
    const user = usersSnapshot.docs[0];
    const userId = user.id;
    const userData = user.data();
    
    console.log(`👤 Creating notification for user: ${userData.name || userData.phone} (${userId})`);
    
    const notification = {
      userId: userId,
      offerId: null,
      type: 'account_update',
      priority: 'medium',
      title: 'Welcome to CredNXT! 🎉',
      message: 'Your account has been successfully set up. Start exploring our secure peer-to-peer lending platform!',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
      metadata: JSON.stringify({
        source: 'test_script',
        version: '1.0'
      })
    };
    
    // Add the notification to Firestore
    const docRef = await db.collection('notifications').add(notification);
    console.log(`✅ Test notification created with ID: ${docRef.id}`);
    
    // Verify it was created
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    console.log('📄 Created notification:', {
      id: docRef.id,
      title: createdData.title,
      message: createdData.message,
      userId: createdData.userId,
      type: createdData.type
    });
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    throw error;
  }
}

// Run the script
createTestNotification()
  .then((id) => {
    console.log(`🎯 Test notification creation completed: ${id}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export { createTestNotification };