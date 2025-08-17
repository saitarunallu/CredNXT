// Script to create test notifications for debugging
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function createTestNotifications() {
    console.log('🔧 Creating test notifications...');
    
    try {
        // First, let's create a test user notification directly through storage
        const testNotifications = [
            {
                title: 'Welcome to CredNXT',
                message: 'Your account has been successfully created. Start exploring our lending platform!',
                type: 'account_update',
                priority: 'medium'
            },
            {
                title: 'Payment Reminder',
                message: 'You have a payment of ₹5,000 due tomorrow. Don\'t forget to submit your payment.',
                type: 'payment_reminder',
                priority: 'high'
            },
            {
                title: 'New Offer Received',
                message: 'Rahul has sent you a loan offer of ₹25,000. Review and respond.',
                type: 'offer_received',
                priority: 'high'
            }
        ];
        
        // We'll create these notifications directly in the database for testing
        console.log('✅ Test notification data prepared');
        console.log('📋 Notifications to create:', testNotifications.length);
        
        for (const notification of testNotifications) {
            console.log(`   • ${notification.title}`);
        }
        
        console.log('\n💡 To create these notifications, run this script with admin Firebase access');
        console.log('💡 Or use the smart notification API endpoint: POST /api/notifications/smart');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestNotifications();