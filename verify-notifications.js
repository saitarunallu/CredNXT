// Verify the notifications were created for user 9876543210
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const firebaseConfigPath = path.join(__dirname, '.env.local');
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

async function verifyNotifications() {
  const userId = 'bVWBKaib0IbS3VSkLKoSeOQ4YY03';
  
  console.log(`🔍 Checking notifications for user: ${userId}`);
  
  // Get notifications for this user
  const notificationsRef = db.collection('notifications');
  const notificationsQuery = await notificationsRef
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  if (notificationsQuery.empty) {
    console.log('❌ No notifications found for this user');
    return;
  }
  
  console.log(`✅ Found ${notificationsQuery.size} notifications for user ${userId}:`);
  console.log('');
  
  notificationsQuery.docs.forEach((doc, index) => {
    const notification = doc.data();
    console.log(`📬 Notification ${index + 1}:`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   Priority: ${notification.priority}`);
    console.log(`   Read: ${notification.isRead ? 'Yes' : 'No'}`);
    console.log(`   Created: ${notification.createdAt?.toDate().toISOString()}`);
    console.log('');
  });
  
  // Summary
  const unreadCount = notificationsQuery.docs.filter(doc => !doc.data().isRead).length;
  console.log(`📊 Summary: ${notificationsQuery.size} total, ${unreadCount} unread`);
}

verifyNotifications()
  .then(() => {
    console.log('✅ Notification verification completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error verifying notifications:', error);
    process.exit(1);
  });