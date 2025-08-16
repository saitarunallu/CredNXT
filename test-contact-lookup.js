// Test script to verify contact lookup functionality in Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function testContactLookup() {
  console.log('Testing contact lookup functionality...');
  
  try {
    // Check if there are any users in the database
    const usersSnapshot = await db.collection('users').limit(5).get();
    console.log(`Found ${usersSnapshot.size} users in database`);
    
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`User: ${userData.name || 'No name'} - Phone: ${userData.phone}`);
      });
    } else {
      console.log('No users found. Creating a test user...');
      
      // Create a test user for contact lookup testing
      const testUser = {
        id: 'test-user-001',
        name: 'Test User',
        phone: '9876543210',
        profileComplete: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await db.collection('users').doc(testUser.id).set(testUser);
      console.log('✅ Test user created successfully');
      console.log('Test phone number: 9876543210');
      console.log('Expected name: Test User');
    }
    
    // Test phone lookup functionality
    console.log('\nTesting phone lookup...');
    const phoneToTest = '9876543210';
    const phoneVariants = [
      phoneToTest,
      `+91${phoneToTest}`,
      phoneToTest.replace(/\D/g, '')
    ];
    
    for (const variant of phoneVariants) {
      console.log(`Trying variant: ${variant}`);
      const querySnapshot = await db.collection('users').where('phone', '==', variant).limit(1).get();
      
      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data();
        console.log(`✅ Found user: ${user.name} for phone ${variant}`);
        break;
      } else {
        console.log(`❌ No user found for phone ${variant}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing contact lookup:', error);
  }
}

testContactLookup().then(() => {
  console.log('Contact lookup test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});