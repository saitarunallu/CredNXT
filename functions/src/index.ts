const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// CORS configuration for production
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Authentication middleware for Firebase Functions
const authenticate = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid authentication token', code: 'AUTH_TOKEN_INVALID' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid authentication token', code: 'AUTH_TOKEN_INVALID' });
  }
};

// Phone number normalization utility
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.substring(2);
  }
  return cleaned;
}

// Critical endpoint for contact name fetching
app.get('/api/users/check-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    const db = admin.firestore();
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // Try multiple phone number formats
    const phoneVariants = [
      phone,
      normalizedPhone,
      `+91${normalizedPhone}`,
      normalizedPhone.startsWith('+91') ? normalizedPhone.substring(3) : `+91${normalizedPhone}`
    ];
    
    let user = null;
    
    for (const phoneVariant of phoneVariants) {
      const snapshot = await db.collection('users').where('phone', '==', phoneVariant).limit(1).get();
      if (!snapshot.empty) {
        user = snapshot.docs[0].data();
        break;
      }
    }
    
    if (user) {
      return res.json({ 
        exists: true, 
        user: { 
          id: user.id, 
          name: user.name || '', 
          phone: user.phone 
        } 
      });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Check phone error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get offer by ID endpoint with proper authentication and authorization
app.get('/api/offers/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    console.log('Getting offer:', id, 'for user:', currentUserId);
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data()!;
    
    // Get current user for authorization
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    // Check authorization: user can view offer if they are creator, recipient by ID, or recipient by phone
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      console.log(`Authorization failed for user ${currentUserId}:`, {
        fromUserId: offerData.fromUserId,
        toUserId: offerData.toUserId,
        toUserPhone: offerData.toUserPhone,
        userPhone: currentUser?.phone
      });
      return res.status(403).json({ message: 'Unauthorized to view this offer' });
    }
    
    // Get the user who created the offer
    let fromUser = null;
    if (offerData?.fromUserId) {
      const fromUserDoc = await db.collection('users').doc(offerData.fromUserId).get();
      if (fromUserDoc.exists) {
        fromUser = fromUserDoc.data();
      }
    }
    
    // Get payments for this offer
    const paymentsSnapshot = await db.collection('payments')
      .where('offerId', '==', id)
      .orderBy('createdAt', 'asc')
      .get();
    
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return res.json({
      offer: { id: offerDoc.id, ...offerData },
      fromUser,
      payments
    });
    
  } catch (error) {
    console.error('Get offer error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user's offers
app.get('/api/offers', authenticate, async (req: any, res) => {
  try {
    const currentUserId = req.userId;
    const db = admin.firestore();
    
    // Get offers created by user
    const sentOffersSnapshot = await db.collection('offers')
      .where('fromUserId', '==', currentUserId)
      .orderBy('createdAt', 'desc')
      .get();
    
    // Get offers received by user
    const receivedOffersSnapshot = await db.collection('offers')
      .where('toUserId', '==', currentUserId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const sentOffers = sentOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const receivedOffers = receivedOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return res.json({
      sent: sentOffers,
      received: receivedOffers
    });
    
  } catch (error) {
    console.error('Get offers error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update offer status (accept/decline)
app.patch('/api/offers/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data()!;
    
    // Only the recipient can accept/decline
    if (offerData.toUserId !== currentUserId) {
      return res.status(403).json({ message: 'Unauthorized to update this offer' });
    }
    
    await offerDoc.ref.update({
      status,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    return res.json({ success: true, message: `Offer ${status} successfully` });
    
  } catch (error) {
    console.error('Update offer error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export as Firebase Function (v1 for compatibility)
exports.api = functions.https.onRequest(app);