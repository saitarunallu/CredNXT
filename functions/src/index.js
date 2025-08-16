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
    
    console.log('Getting offer:', id, 'for user:', currentUserId);
    
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
app.get('/api/offers/:id/pdf/contract', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
    // Authorization check
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to access this contract' });
    }
    
    // Get user data for PDF generation
    let fromUser = null;
    if (offerData.fromUserId) {
      const fromUserDoc = await db.collection('users').doc(offerData.fromUserId).get();
      if (fromUserDoc.exists) {
        fromUser = fromUserDoc.data();
      }
    }
    
    // Simple PDF content generation (you can enhance this)
    const pdfContent = generateContractPDF(offerData, fromUser);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('Contract PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate contract PDF' });
  }
});

app.get('/api/offers/:id/pdf/kfs', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
    // Authorization check
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to access this KFS' });
    }
    
    // Generate KFS PDF content
    const pdfContent = generateKFSPDF(offerData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('KFS PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate KFS PDF' });
  }
});

app.get('/api/offers/:id/pdf/schedule', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    const db = admin.firestore();
    const offerDoc = await db.collection('offers').doc(id).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = offerDoc.data();
    
    // Authorization check
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUser = currentUserDoc.exists ? currentUserDoc.data() : null;
    
    const isAuthorized = 
      offerData.fromUserId === currentUserId ||
      offerData.toUserId === currentUserId ||
      (currentUser && offerData.toUserPhone === currentUser.phone);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to access this schedule' });
    }
    
    // Get payments for schedule
    const paymentsSnapshot = await db.collection('payments')
      .where('offerId', '==', id)
      .orderBy('dueDate', 'asc')
      .get();
    
    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    
    // Generate schedule PDF content
    const pdfContent = generateSchedulePDF(offerData, payments);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('Schedule PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate schedule PDF' });
  }
});

// Simple PDF generation functions (basic implementation)
function generateContractPDF(offerData, fromUser) {
  const content = `
    LOAN CONTRACT
    
    Amount: ₹${offerData.amount}
    Interest Rate: ${offerData.interestRate}%
    Duration: ${offerData.duration} ${offerData.durationUnit}
    Frequency: ${offerData.frequency}
    
    Lender: ${fromUser?.name || 'N/A'}
    Phone: ${fromUser?.phone || offerData.fromUserPhone || 'N/A'}
    
    Borrower: ${offerData.toUserName || 'N/A'}
    Phone: ${offerData.toUserPhone || 'N/A'}
    
    Created: ${new Date().toLocaleDateString()}
    
    This is a legal agreement between the parties mentioned above.
  `;
  
  return Buffer.from(content, 'utf-8');
}

function generateKFSPDF(offerData) {
  const content = `
    KEY FACT SHEET (KFS)
    
    Loan Amount: ₹${offerData.amount}
    Interest Rate: ${offerData.interestRate}% per annum
    Loan Duration: ${offerData.duration} ${offerData.durationUnit}
    Repayment Frequency: ${offerData.frequency}
    
    Total Interest: ₹${calculateTotalInterest(offerData)}
    Total Repayment: ₹${calculateTotalRepayment(offerData)}
    
    Monthly EMI: ₹${calculateEMI(offerData)}
    
    Terms and Conditions:
    - Late payment charges may apply
    - Early repayment is allowed
    - All disputes subject to local jurisdiction
    
    Generated: ${new Date().toLocaleDateString()}
  `;
  
  return Buffer.from(content, 'utf-8');
}

function generateSchedulePDF(offerData, payments) {
  let content = `
    REPAYMENT SCHEDULE
    
    Loan Amount: ₹${offerData.amount}
    Interest Rate: ${offerData.interestRate}%
    Duration: ${offerData.duration} ${offerData.durationUnit}
    
    PAYMENT SCHEDULE:
    `;
    
  payments.forEach((payment, index) => {
    const dueDate = payment.dueDate?.toDate ? payment.dueDate.toDate() : new Date(payment.dueDate);
    content += `
    ${index + 1}. Due: ${dueDate.toLocaleDateString()} - Amount: ₹${payment.amount} - Status: ${payment.status || 'Pending'}`;
  });
  
  content += `
    
    Generated: ${new Date().toLocaleDateString()}
  `;
  
  return Buffer.from(content, 'utf-8');
}

// Helper calculation functions
function calculateTotalInterest(offerData) {
  const principal = parseFloat(offerData.amount);
  const rate = parseFloat(offerData.interestRate) / 100;
  const duration = parseFloat(offerData.duration);
  
  if (offerData.durationUnit === 'months') {
    return Math.round(principal * rate * (duration / 12));
  } else {
    return Math.round(principal * rate * duration);
  }
}

function calculateTotalRepayment(offerData) {
  const principal = parseFloat(offerData.amount);
  const interest = calculateTotalInterest(offerData);
  return principal + interest;
}

function calculateEMI(offerData) {
  const totalRepayment = calculateTotalRepayment(offerData);
  const duration = parseFloat(offerData.duration);
  
  if (offerData.frequency === 'monthly') {
    const months = offerData.durationUnit === 'months' ? duration : duration * 12;
    return Math.round(totalRepayment / months);
  } else if (offerData.frequency === 'weekly') {
    const weeks = offerData.durationUnit === 'months' ? duration * 4 : duration * 52;
    return Math.round(totalRepayment / weeks);
  } else {
    return totalRepayment;
  }
}

// Export the function
exports.api = functions.https.onRequest(app);