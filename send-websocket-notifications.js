// Send WebSocket notifications to connected user
import WebSocket from 'ws';

const userId = 'bVWBKaib0IbS3VSkLKoSeOQ4YY03'; // User 9876543210

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:5000');

ws.on('open', function open() {
  console.log('📡 Connected to WebSocket server');
  
  // Authenticate with a mock Firebase token (for testing)
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'mock-firebase-token', // In real scenario, this would be a valid Firebase ID token
    userId: userId
  }));
  
  // Wait a bit, then send test notifications
  setTimeout(() => {
    const testNotifications = [
      {
        type: 'real_time_notification',
        offerId: 'offer_123',
        userId: userId,
        title: 'New Offer Alert!',
        message: 'You just received a loan offer for ₹75,000'
      },
      {
        type: 'payment_reminder',
        userId: userId,
        title: 'Payment Due Soon',
        message: 'Your payment of ₹5,000 is due tomorrow'
      },
      {
        type: 'offer_status_update',
        offerId: 'offer_456',
        userId: userId,
        title: 'Offer Status Update',
        message: 'Your offer has been reviewed and approved'
      }
    ];
    
    testNotifications.forEach((notif, index) => {
      setTimeout(() => {
        console.log(`📬 Sending notification: ${notif.title}`);
        ws.send(JSON.stringify(notif));
      }, index * 1000); // Send one notification per second
    });
    
    // Close connection after sending all notifications
    setTimeout(() => {
      console.log('✅ All notifications sent, closing connection');
      ws.close();
    }, testNotifications.length * 1000 + 1000);
    
  }, 1000);
});

ws.on('message', function message(data) {
  const response = JSON.parse(data.toString());
  console.log('📨 Received response:', response);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});