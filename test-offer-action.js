// Direct test of offer accept/reject functionality
const testOfferAction = async () => {
  console.log('🔬 Starting comprehensive offer action test...');
  
  // 1. Check if user is authenticated
  const token = localStorage.getItem('firebase_auth_token') || localStorage.getItem('auth_token');
  console.log('🔑 Token exists:', !!token);
  if (token) {
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
  }
  
  // 2. Test API endpoint directly
  const offerId = 'test-offer-123'; // Use a real offer ID
  
  try {
    console.log('📡 Testing API call...');
    const response = await fetch(`/api/offers/${offerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'accepted' }),
      credentials: 'include'
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API success:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ API error:', errorText);
    }
  } catch (error) {
    console.log('❌ API request failed:', error.message);
  }
  
  // 3. Test Firestore direct access
  try {
    console.log('🔥 Testing direct Firestore access...');
    
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const { getFirestore, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    
    const firebaseConfig = {
      apiKey: "AIzaSyD2WtqZHxH0M0bk26Z5s4L-9OXaKqEpFJw",
      authDomain: "crednxt-ef673.firebaseapp.com",
      projectId: "crednxt-ef673",
      storageBucket: "crednxt-ef673.firebasestorage.app",
      messagingSenderId: "462092924096",
      appId: "1:462092924096:web:d18e9b2c8b9e8b0a35b8e5"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const offerRef = doc(db, 'offers', offerId);
    await updateDoc(offerRef, {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Firestore update successful');
  } catch (error) {
    console.log('❌ Firestore error:', error.message);
  }
};

// Run the test
testOfferAction();