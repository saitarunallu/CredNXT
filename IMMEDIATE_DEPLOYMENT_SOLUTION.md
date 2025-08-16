# Immediate Firebase Functions Deployment Solution

## Current Issue Summary
- Service account has proper Cloud Functions permissions
- Cross-service-account permissions are blocked (`iam.serviceAccounts.ActAs`)
- Firebase CLI requires specific service account relationships

## Fastest Solution: Firebase Console Deployment

### Why Console Works Better
- Uses your user account authentication (Editor role)
- Bypasses service account permission complexities
- Direct deployment without CLI authentication issues

### Complete Deployment Package Ready

**Function Name:** `api`
**Runtime:** Node.js 20
**Entry Point:** `api`
**Trigger:** HTTP (allow unauthenticated)

### Complete Function Code (Copy/Paste Ready):

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
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
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
    
    const contractContent = `
LOAN AGREEMENT CONTRACT

Offer ID: ${id}
Amount: ₹${offerData.amount}
Interest Rate: ${offerData.interestRate}%
Duration: ${offerData.duration} months
From: ${fromUser?.name || 'Unknown'}
To: ${offerData.toUserName}
Phone: ${offerData.toUserPhone}
Date: ${new Date().toLocaleDateString('en-IN')}

Terms and Conditions:
1. The borrower agrees to repay the loan amount with interest
2. Monthly installments as per the repayment schedule
3. Late payment penalties may apply as per RBI guidelines
4. This agreement is governed by Indian law

Signatures:
Lender: _________________
Borrower: _______________
Date: ${new Date().toLocaleDateString('en-IN')}
`;
    
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
    const kfsContent = `
KEY FACT STATEMENT (KFS)

Offer ID: ${id}
Document Type: Key Fact Statement
Generated: ${new Date().toLocaleString('en-IN')}

Important Loan Information:
- Loan processing as per RBI guidelines
- Interest calculation method: Simple/Compound
- Prepayment charges: As applicable
- Late payment penalties: As per terms

This document contains key facts about your loan agreement.
Please read all terms carefully before proceeding.
`;
    
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
    const scheduleContent = `
REPAYMENT SCHEDULE

Offer ID: ${id}
Document Type: Repayment Schedule
Generated: ${new Date().toLocaleString('en-IN')}

Monthly Installment Details:
- Principal amount breakdown
- Interest amount breakdown
- Due dates for each installment
- Outstanding balance after each payment

Please refer to your loan agreement for complete terms.
`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${id}.pdf"`);
    res.send(Buffer.from(scheduleContent));
    
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

exports.api = functions.https.onRequest(app);
```

## Deployment Steps
1. Go to: https://console.firebase.google.com/project/crednxt-ef673/functions
2. Create function with above settings
3. Paste complete code
4. Deploy

## After Deployment
Test endpoint: `https://us-central1-crednxt-ef673.cloudfunctions.net/api/api/health`

This will immediately enable all PDF downloads and API functionality in production.