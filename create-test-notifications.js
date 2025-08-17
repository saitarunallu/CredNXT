// Test script to create notifications for user 9876543210
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const firebaseConfigPath = path.join(__dirname, '.env.local');
let firebaseConfig = {};

if (fs.existsSync(firebaseConfigPath)) {
  const envContent = fs.readFileSync(firebaseConfigPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=');
      process.env[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  });
}

import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function createTestNotifications() {
  const phone = '9876543210';
  const normalizedPhone = '+91' + phone;
  
  console.log(`🔍 Looking for user with phone: ${normalizedPhone}`);
  
  // Find user by phone number
  const usersRef = db.collection('users');
  const userQuery = await usersRef.where('phone', '==', normalizedPhone).get();
  
  if (userQuery.empty) {
    console.log(`❌ No user found with phone ${normalizedPhone}`);
    console.log('📝 Creating test user first...');
    
    // Create test user
    const testUser = {
      id: `user_${Date.now()}`,
      phone: normalizedPhone,
      name: 'Test User',
      email: 'testuser@example.com',
      isVerified: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    await usersRef.doc(testUser.id).set(testUser);
    console.log(`✅ Created test user: ${testUser.id}`);
    
    // Create test notifications for this user
    await createNotifications(testUser.id);
  } else {
    const userData = userQuery.docs[0];
    console.log(`✅ Found user: ${userData.id}`);
    await createNotifications(userData.id);
  }
}

async function createNotifications(userId) {
  const notifications = [
    {
      userId: userId,
      type: 'offer_received',
      title: 'New Loan Offer Received',
      message: 'You have received a new loan offer for ₹50,000 from John Doe',
      priority: 'high',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      userId: userId,
      type: 'payment_due',
      title: 'Payment Due Reminder',
      message: 'Your payment of ₹2,500 is due in 2 days. Please make the payment to avoid late fees.',
      priority: 'medium',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      userId: userId,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      message: 'Your loan offer for ₹25,000 has been accepted by the recipient',
      priority: 'high',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      userId: userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: 'Payment of ₹1,200 has been received for your loan agreement',
      priority: 'low',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      userId: userId,
      type: 'system',
      title: 'Welcome to CredNXT',
      message: 'Welcome to CredNXT! Your account has been successfully verified.',
      priority: 'low',
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    }
  ];

  console.log(`📬 Creating ${notifications.length} test notifications...`);
  
  const notificationsRef = db.collection('notifications');
  
  for (let i = 0; i < notifications.length; i++) {
    const notification = notifications[i];
    notification.id = `notif_${Date.now()}_${i}`;
    
    await notificationsRef.doc(notification.id).set(notification);
    console.log(`✅ Created notification: ${notification.title}`);
    
    // Small delay between notifications
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`🎉 Successfully created ${notifications.length} notifications for user ${userId}`);
  console.log(`📱 User ${userId} can now view these notifications in the app`);
}

// Run the script
createTestNotifications()
  .then(() => {
    console.log('✅ Test notifications creation completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error creating test notifications:', error);
    process.exit(1);
  });