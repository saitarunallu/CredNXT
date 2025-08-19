const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Authentication middleware
/**
 * Middleware to authenticate a user using a Bearer token from the request headers.
 * @example
 * sync(req, res, next)
 * // If authentication is successful, `next` is called. Otherwise, a 401 response is sent.
 * @param {Object} req - The HTTP request object containing headers.
 * @param {Object} res - The HTTP response object used to send back the response.
 * @param {Function} next - The callback to invoke the next middleware upon successful authentication.
 * @returns {void} Responds with a 401 status and an error message if authentication fails; otherwise calls next middleware.
 */
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'firebase-functions' });
});

// Phone check endpoint
app.post('/check-phone', async (req, res) => {
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
app.get('/offers/:id', authenticate, async (req, res) => {
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
app.get('/offers', authenticate, async (req, res) => {
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

// Update offer status (accept/decline/cancel)
app.patch('/offers/:id', authenticate, async (req, res) => {
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
    
    // Check current offer status to prevent race conditions
    if (offerData.status === 'cancelled') {
      return res.status(400).json({ message: 'Offer has already been cancelled and cannot be modified' });
    }
    
    if (offerData.status === 'accepted' && status !== 'cancelled') {
      return res.status(400).json({ message: 'Offer has already been accepted and cannot be modified' });
    }
    
    if (offerData.status === 'declined') {
      return res.status(400).json({ message: 'Offer has already been declined and cannot be modified' });
    }
    
    // Authorization check based on action
    if (status === 'accepted' || status === 'declined') {
      // Only the recipient can accept/decline
      if (offerData.toUserId !== currentUserId) {
        return res.status(403).json({ message: 'Only offer recipient can accept/decline' });
      }
      // Prevent accepting/declining if offer is already cancelled
      if (offerData.status === 'cancelled') {
        return res.status(400).json({ message: 'Cannot accept/decline a cancelled offer' });
      }
    } else if (status === 'cancelled') {
      // Only the sender can cancel
      if (offerData.fromUserId !== currentUserId) {
        return res.status(403).json({ message: 'Only offer sender can cancel' });
      }
      // Only allow cancelling pending offers
      if (offerData.status !== 'pending') {
        return res.status(400).json({ message: 'Can only cancel pending offers' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid status' });
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
app.get('/offers/:id/pdf/contract', authenticate, async (req, res) => {
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
    
    // Generate PDF content - add ID to offer data
    const offerWithId = { ...offerData, id };
    console.log('🔄 Generating contract PDF for offer:', id);
    console.log('📊 Offer data keys:', Object.keys(offerWithId));
    console.log('👤 FromUser data:', fromUser ? Object.keys(fromUser) : 'null');
    
    const pdfContent = await generateContractPDF(offerWithId, fromUser);
    console.log('✅ Contract PDF generated successfully, size:', pdfContent.length, 'bytes');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('Contract PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate contract PDF' });
  }
});

app.get('/offers/:id/pdf/kfs', authenticate, async (req, res) => {
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
    
    // Generate KFS PDF content - add ID to offer data
    const offerWithId = { ...offerData, id };
    const pdfContent = await generateKFSPDF(offerWithId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('KFS PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate KFS PDF' });
  }
});

app.get('/offers/:id/pdf/schedule', authenticate, async (req, res) => {
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
    
    // Generate schedule PDF content - add ID to offer data
    const offerWithId = { ...offerData, id };
    const pdfContent = await generateSchedulePDF(offerWithId, payments);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${id}.pdf"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('Schedule PDF error:', error);
    return res.status(500).json({ message: 'Failed to generate schedule PDF' });
  }
});

// PDF generation functions using PDFKit
/**
 * Generates a PDF document for a loan contract based on the provided offer data and user information.
 * @example
 * generateContractPDF(offerData, fromUser).then((pdfData) => console.log(pdfData));
 * @param {Object} offerData - An object containing offer details such as amount, interest rate, duration, etc.
 * @param {Object} fromUser - An object containing information about the lender, typically with keys like `name` and `phone`.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the PDF data of the generated contract.
 */
function generateContractPDF(offerData, fromUser) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Header
      doc.fontSize(20).text('LOAN CONTRACT', { align: 'center' });
      doc.moveDown(2);
      
      // Loan Details
      doc.fontSize(14).text('LOAN DETAILS', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Loan Amount: ₹${offerData.amount}`)
        .text(`Interest Rate: ${offerData.interestRate}% per annum`)
        .text(`Duration: ${offerData.duration || offerData.tenureValue || 'N/A'} ${offerData.durationUnit || offerData.tenureUnit || ''}`)
        .text(`Repayment Type: ${offerData.repaymentType || 'N/A'}`)
        .text(`Purpose: ${offerData.purpose || 'N/A'}`);
      
      doc.moveDown(2);
      
      // Parties
      doc.fontSize(14).text('PARTIES INVOLVED', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Lender: ${fromUser?.name || 'N/A'}`)
        .text(`Phone: ${fromUser?.phone || offerData.fromUserPhone || 'N/A'}`)
        .moveDown()
        .text(`Borrower: ${offerData.toUserName || 'N/A'}`)
        .text(`Phone: ${offerData.toUserPhone || 'N/A'}`);
      
      doc.moveDown(2);
      
      // Terms
      doc.fontSize(14).text('TERMS & CONDITIONS', { underline: true });
      doc.moveDown();
      doc.fontSize(10)
        .text('1. This is a legally binding agreement between the parties mentioned above.')
        .text('2. The borrower agrees to repay the loan amount with interest as per the agreed schedule.')
        .text('3. Late payment charges may apply as per mutual agreement.')
        .text('4. Early repayment is allowed without penalty.')
        .text('5. All disputes will be subject to local jurisdiction.');
      
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a PDF document for a Key Fact Sheet (KFS) based on provided offer data.
 * @example
 * generateKFSPDF({
 *   amount: 500000,
 *   interestRate: 8.5,
 *   duration: 12,
 *   durationUnit: 'months',
 *   repaymentType: 'EMI',
 *   purpose: 'Personal Loan'
 * }).then(pdfData => {
 *   // handle the generated PDF buffer
 * }).catch(error => {
 *   // handle error
 * });
 * @param {Object} offerData - The offer data used to generate the PDF.
 * @param {number} offerData.amount - The loan amount in Indian Rupees.
 * @param {number} offerData.interestRate - The interest rate per annum.
 * @param {number|string} [offerData.duration] - The duration of the loan.
 * @param {string} [offerData.durationUnit] - The unit of the loan duration (e.g., 'months').
 * @param {string} [offerData.repaymentType] - The type of repayment (e.g., 'EMI').
 * @param {string} [offerData.purpose] - The purpose of the loan.
 * @returns {Promise<Buffer>} Resolves with a Buffer containing the generated PDF data.
 */
function generateKFSPDF(offerData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Header
      doc.fontSize(20).text('KEY FACT SHEET (KFS)', { align: 'center' });
      doc.moveDown(2);
      
      // Loan Summary
      doc.fontSize(14).text('LOAN SUMMARY', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Loan Amount: ₹${offerData.amount}`)
        .text(`Interest Rate: ${offerData.interestRate}% per annum`)
        .text(`Loan Duration: ${offerData.duration || offerData.tenureValue || 'N/A'} ${offerData.durationUnit || offerData.tenureUnit || ''}`)
        .text(`Repayment Type: ${offerData.repaymentType || 'N/A'}`)
        .text(`Purpose: ${offerData.purpose || 'N/A'}`);
      
      doc.moveDown(2);
      
      // Financial Details
      doc.fontSize(14).text('FINANCIAL BREAKDOWN', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Total Interest: ₹${calculateTotalInterest(offerData)}`)
        .text(`Total Repayment: ₹${calculateTotalRepayment(offerData)}`)
        .text(`EMI Amount: ₹${calculateEMI(offerData)}`);
      
      doc.moveDown(2);
      
      // Important Terms
      doc.fontSize(14).text('IMPORTANT TERMS', { underline: true });
      doc.moveDown();
      doc.fontSize(10)
        .text('• Late payment charges may apply as per agreement')
        .text('• Early repayment is allowed without penalty')
        .text('• All disputes subject to local jurisdiction')
        .text('• Interest calculation is based on simple interest method')
        .text('• Repayment schedule will be provided separately');
      
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a PDF document for a repayment schedule.
 * @example
 * generateSchedulePDF(offerData, payments)
 * // Returns a Promise that resolves with the generated PDF data as a Buffer
 * @param {Object} offerData - The loan offer details including amount, interest rate, duration, and repayment type.
 * @param {Array} payments - An array of payment objects, each containing dueDate, amount, and status.
 * @returns {Promise<Buffer>} A Promise that resolves with the generated PDF data as a Buffer.
 */
function generateSchedulePDF(offerData, payments) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Header
      doc.fontSize(20).text('REPAYMENT SCHEDULE', { align: 'center' });
      doc.moveDown(2);
      
      // Loan Summary
      doc.fontSize(14).text('LOAN DETAILS', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Loan Amount: ₹${offerData.amount}`)
        .text(`Interest Rate: ${offerData.interestRate}% per annum`)
        .text(`Duration: ${offerData.duration || offerData.tenureValue || 'N/A'} ${offerData.durationUnit || offerData.tenureUnit || ''}`)
        .text(`Repayment Type: ${offerData.repaymentType || 'N/A'}`);
      
      doc.moveDown(2);
      
      // Payment Schedule Table
      doc.fontSize(14).text('PAYMENT SCHEDULE', { underline: true });
      doc.moveDown();
      
      // Table headers
      doc.fontSize(10)
        .text('S.No.', 50, doc.y, { width: 40 })
        .text('Due Date', 100, doc.y, { width: 100 })
        .text('Amount (₹)', 210, doc.y, { width: 100 })
        .text('Status', 320, doc.y, { width: 100 });
      
      doc.moveDown();
      
      // Draw line under headers
      doc.moveTo(50, doc.y)
         .lineTo(450, doc.y)
         .stroke();
      
      doc.moveDown();
      
      // Payment rows
      payments.forEach((payment, index) => {
        const dueDate = payment.dueDate?.toDate ? payment.dueDate.toDate() : new Date(payment.dueDate);
        const yPosition = doc.y;
        
        doc.fontSize(10)
          .text((index + 1).toString(), 50, yPosition, { width: 40 })
          .text(dueDate.toLocaleDateString(), 100, yPosition, { width: 100 })
          .text(payment.amount.toString(), 210, yPosition, { width: 100 })
          .text(payment.status || 'Pending', 320, yPosition, { width: 100 });
        
        doc.moveDown();
      });
      
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper calculation functions
/**
 * Calculates the total interest based on the provided offer data.
 * @example
 * calculateTotalInterest({amount: '1000', interestRate: '5', duration: '12', durationUnit: 'months'})
 * 50
 * @param {Object} offerData - An object containing offer details. 
 * @param {string} offerData.amount - The principal amount.
 * @param {string} offerData.interestRate - The annual interest rate as a percentage.
 * @param {string|undefined} [offerData.duration] - The duration of the loan or investment; defaults to 12 if not provided.
 * @param {string|undefined} [offerData.durationUnit] - The unit of duration; defaults to 'months' if not specified.
 * @param {string|undefined} [offerData.tenureValue] - Alternative property for duration if 'duration' is not provided.
 * @param {string|undefined} [offerData.tenureUnit] - Alternative property for duration unit if 'durationUnit' is not provided.
 * @returns {number} The total interest calculated, rounded to the nearest whole number.
 */
function calculateTotalInterest(offerData) {
  const principal = parseFloat(offerData.amount);
  const rate = parseFloat(offerData.interestRate) / 100;
  const duration = parseFloat(offerData.duration || offerData.tenureValue || 12);
  const durationUnit = offerData.durationUnit || offerData.tenureUnit || 'months';
  
  if (durationUnit === 'months') {
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

/**
 * Calculates the Equated Monthly Installment (EMI) based on the offer data.
 * @example
 * calculateEMI({ totalRepayment: 12000, duration: 12, durationUnit: 'months', frequency: 'monthly' })
 * // Returns 1000
 * @param {Object} offerData - Offer data containing total repayment details and time-related information.
 * @param {number} offerData.totalRepayment - The total repayment amount.
 * @param {number} [offerData.duration=12] - The duration of the loan, defaulting to 12 if not provided.
 * @param {string} [offerData.durationUnit='months'] - The unit of duration, defaulting to 'months' if not provided.
 * @param {string} [offerData.frequency='monthly'] - The frequency of repayment, defaulting to 'monthly' if not provided.
 * @returns {number} The calculated EMI value evenly divided over the specified duration and frequency.
 */
function calculateEMI(offerData) {
  const totalRepayment = calculateTotalRepayment(offerData);
  const duration = parseFloat(offerData.duration || offerData.tenureValue || 12);
  const durationUnit = offerData.durationUnit || offerData.tenureUnit || 'months';
  const frequency = offerData.frequency || offerData.repaymentFrequency || 'monthly';
  
  if (frequency === 'monthly') {
    const months = durationUnit === 'months' ? duration : duration * 12;
    return Math.round(totalRepayment / months);
  } else if (frequency === 'weekly') {
    const weeks = durationUnit === 'months' ? duration * 4 : duration * 52;
    return Math.round(totalRepayment / weeks);
  } else {
    return totalRepayment;
  }
}

// Export the function
exports.api = functions.https.onRequest(app);