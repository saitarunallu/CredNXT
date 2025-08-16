# Firebase Console Function Creation Steps

## Step 1: Create Function
1. Click "Instructions" button (you're seeing this screen now)
2. Choose "Create your first function" 
3. Select **1st gen** function type

## Step 2: Basic Configuration
- **Function name:** `api`
- **Region:** `us-central1` (default)
- **Trigger type:** HTTP trigger
- **Authentication:** Allow unauthenticated invocations ✓

## Step 3: Runtime Settings
- **Runtime:** Node.js 20
- **Entry point:** `api`
- **Memory:** 256 MB (default)
- **Timeout:** 60 seconds

## Step 4: Source Code
In the code editor, replace ALL existing code with this complete function:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'firebase-functions' });
});

app.get('/api/offers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    const currentUserId = req.userId;
    
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    let fromUser = null;
    if (offerData.fromUserId) {
      const fromUserDoc = await db.collection('users').doc(offerData.fromUserId).get();
      if (fromUserDoc.exists) fromUser = fromUserDoc.data();
    }
    
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
    return res.status(500).json({ message: 'Server error' });
  }
});

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
    
    if (offerData.toUserId !== currentUserId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    await offerDoc.ref.update({
      status,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    return res.json({ success: true, message: `Offer ${status} successfully` });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/offers/:id/contract/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const contractContent = `LOAN AGREEMENT CONTRACT\n\nOffer ID: ${id}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\nThis is your loan contract document.`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${id}.pdf"`);
    res.send(Buffer.from(contractContent));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/offers/:id/kfs/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const kfsContent = `KEY FACT STATEMENT\n\nOffer ID: ${id}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\nThis is your KFS document.`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
    res.send(Buffer.from(kfsContent));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/offers/:id/schedule/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const scheduleContent = `REPAYMENT SCHEDULE\n\nOffer ID: ${id}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\nThis is your repayment schedule.`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${id}.pdf"`);
    res.send(Buffer.from(scheduleContent));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

exports.api = functions.https.onRequest(app);
```

## Step 5: Deploy
1. Click "Deploy" button
2. Wait for deployment to complete (2-3 minutes)

## Step 6: Test
After deployment, the function will be available at:
`https://us-central1-crednxt-ef673.cloudfunctions.net/api`

Test health endpoint:
`https://us-central1-crednxt-ef673.cloudfunctions.net/api/api/health`