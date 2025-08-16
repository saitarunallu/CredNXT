# Firebase Functions Console Deployment

## Manual Console Deployment Steps

Since CLI deployment is blocked by IAM permissions, deploy directly through Firebase Console:

### 1. Go to Firebase Console
Navigate to: https://console.firebase.google.com/project/crednxt-ef673/functions

### 2. Create Function
- Click "Create function" or "Get started"
- Choose **1st gen** function
- Function name: `api`
- Region: `us-central1`
- Trigger: **HTTP trigger**
- Authentication: **Allow unauthenticated invocations**

### 3. Runtime Configuration
- Runtime: **Node.js 20**
- Entry point: `api`
- Memory: 256 MB (default)
- Timeout: 60 seconds

### 4. Copy Complete Function Code
Copy and paste the COMPLETE code from the section below into the console editor.

### 5. Dependencies (package.json)
```json
{
  "name": "functions",
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-functions": "^4.9.0",
    "firebase-admin": "^12.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}
```

## COMPLETE FUNCTION CODE TO PASTE:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Authentication middleware
const authenticate = async (req, res, next) => {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'firebase-functions' });
});

// Phone check endpoint
app.post('/api/check-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const db = admin.firestore();
    const usersQuery = db.collection('users').where('phone', '==', phone);
    const snapshot = await usersQuery.get();

    if (snapshot.empty) {
      return res.json({ exists: false, userId: null });
    }

    const userDoc = snapshot.docs[0];
    return res.json({ 
      exists: true, 
      userId: userDoc.id,
      userData: userDoc.data()
    });
  } catch (error) {
    console.error('Phone check error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get offer by ID endpoint
app.get('/api/offers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
    // Get current user for authorization
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    // Check authorization
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to view this offer' });
    }
    
    // Get the user who created the offer
    let fromUser = null;
    if (offerData.fromUserId) {
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
app.get('/api/offers', authenticate, async (req, res) => {
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
app.patch('/api/offers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
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

// PDF Download endpoints
app.get('/api/offers/:id/contract/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
    // Check authorization
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to download this contract' });
    }
    
    // Get fromUser data
    let fromUser = null;
    if (offerData.fromUserId) {
      const fromUserDoc = await db.collection('users').doc(offerData.fromUserId).get();
      if (fromUserDoc.exists) {
        fromUser = fromUserDoc.data();
      }
    }
    
    // Simple PDF content for now (can be enhanced with PDFKit later)
    const pdfContent = `
LOAN AGREEMENT CONTRACT

Offer ID: ${id}
Amount: ₹${offerData.amount}
Interest Rate: ${offerData.interestRate}%
Duration: ${offerData.duration} months
From: ${fromUser?.name || 'Unknown'}
To: ${offerData.toUserName}
Date: ${new Date().toLocaleDateString('en-IN')}

Terms and Conditions:
1. The borrower agrees to repay the loan amount with interest.
2. Monthly installments as per the schedule.
3. Late payment penalties may apply.

Signatures:
Lender: _________________
Borrower: _______________
Date: ${new Date().toLocaleDateString('en-IN')}
`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${id}.pdf"`);
    res.send(Buffer.from(pdfContent));
    
  } catch (error) {
    console.error('Contract download error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/offers/:id/kfs/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Similar logic for KFS document
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
    res.send(Buffer.from('KFS Document Content'));
    
  } catch (error) {
    console.error('KFS download error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/offers/:id/schedule/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Similar logic for Schedule document
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${id}.pdf"`);
    res.send(Buffer.from('Repayment Schedule Content'));
    
  } catch (error) {
    console.error('Schedule download error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Export the function
exports.api = functions.https.onRequest(app);
```

## After Deployment
Once deployed, the function will be available at:
`https://us-central1-crednxt-ef673.cloudfunctions.net/api`

Test with: `https://us-central1-crednxt-ef673.cloudfunctions.net/api/api/health`