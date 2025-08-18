"use strict";
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
// Firebase Admin SDK initialization
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Main API app
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
// PDF service app
const pdfApp = express();
pdfApp.use(cors({ origin: true, credentials: true }));
pdfApp.use(express.json());
// Payment service app
const paymentApp = express();
paymentApp.use(cors({ origin: true, credentials: true }));
paymentApp.use(express.json());
// Notification service app
const notificationApp = express();
notificationApp.use(cors({ origin: true, credentials: true }));
notificationApp.use(express.json());
// Simple rate limiting middleware
const rateLimitMiddleware = (req, res, next) => {
    next(); // Simplified for now
};
app.use(rateLimitMiddleware);
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});
// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING'
            });
        }
        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.userId = decodedToken.uid;
        req.userPhone = decodedToken.phone_number;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            message: 'Invalid authentication token',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
};
// Utility functions
function normalizePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return cleaned.substring(2);
    }
    if (cleaned.length === 10) {
        return cleaned;
    }
    if (cleaned.startsWith('+91')) {
        return cleaned.substring(3);
    }
    return cleaned;
}
function isValidIndianMobile(phone) {
    const normalized = normalizePhoneNumber(phone);
    return /^[6-9]\d{9}$/.test(normalized);
}
function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function calculateEMI(principal, rate, tenure) {
    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi * 100) / 100;
}
// MAIN API ENDPOINTS
// Health checks
app.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        await db.collection('health').doc('test').get();
        const responseTime = Date.now() - startTime;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'firebase-functions',
            responseTime: responseTime
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Firebase connection failed'
        });
    }
});
app.get('/ready', (req, res) => {
    res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'firebase-functions'
    });
});
// User endpoints
app.get('/users/check-phone', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        if (!isValidIndianMobile(phone)) {
            return res.status(400).json({
                message: 'Invalid Indian mobile number format',
                code: 'INVALID_PHONE_FORMAT'
            });
        }
        const normalizedPhone = normalizePhoneNumber(phone);
        const phoneVariants = [phone, normalizedPhone, `+91${normalizedPhone}`];
        let user = null;
        for (const phoneVariant of phoneVariants) {
            const snapshot = await db.collection('users').where('phone', '==', phoneVariant).limit(1).get();
            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                user = Object.assign({ id: snapshot.docs[0].id }, userData);
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
        }
        else {
            return res.json({ exists: false });
        }
    }
    catch (error) {
        console.error('Check phone error:', error);
        return res.status(500).json({ exists: false, message: 'Service temporarily unavailable' });
    }
});
app.get('/users/me', authenticate, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const userDoc = await db.collection('users').doc(req.userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userData = userDoc.data();
        res.json({
            id: userDoc.id,
            name: (userData === null || userData === void 0 ? void 0 : userData.name) || '',
            phone: (userData === null || userData === void 0 ? void 0 : userData.phone) || '',
            email: (userData === null || userData === void 0 ? void 0 : userData.email) || '',
            isVerified: (userData === null || userData === void 0 ? void 0 : userData.isVerified) || false,
            createdAt: ((_b = (_a = userData === null || userData === void 0 ? void 0 : userData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || null,
            updatedAt: ((_d = (_c = userData === null || userData === void 0 ? void 0 : userData.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || null
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to get user profile' });
    }
});
// Offer endpoints
app.get('/offers', authenticate, async (req, res) => {
    try {
        const sentQuery = db.collection('offers').where('fromUserId', '==', req.userId);
        const receivedQuery = db.collection('offers').where('toUserId', '==', req.userId);
        const [sentOffers, receivedOffers] = await Promise.all([
            sentQuery.get(),
            receivedQuery.get()
        ]);
        const allOffers = [
            ...sentOffers.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            ...receivedOffers.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())))
        ];
        const normalizedOffers = allOffers.map((offer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return (Object.assign(Object.assign({}, offer), { createdAt: ((_c = (_b = (_a = offer.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = offer.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = offer.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null }));
        });
        res.json(normalizedOffers);
    }
    catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({ message: 'Failed to fetch offers' });
    }
});
app.get('/offers/:id', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(Object.assign(Object.assign({ id: offerDoc.id }, offerData), { createdAt: ((_c = (_b = (_a = offerData === null || offerData === void 0 ? void 0 : offerData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = offerData === null || offerData === void 0 ? void 0 : offerData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = offerData === null || offerData === void 0 ? void 0 : offerData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null }));
    }
    catch (error) {
        console.error('Get offer error:', error);
        res.status(500).json({ message: 'Failed to fetch offer' });
    }
});
app.patch('/offers/:id', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['accepted', 'declined', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const offerRef = db.collection('offers').doc(id);
        const offerDoc = await offerRef.get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        // Check authorization
        if (status === 'accepted' || status === 'declined') {
            if ((offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
                return res.status(403).json({ message: 'Only offer recipient can accept/decline' });
            }
        }
        else if (status === 'cancelled') {
            if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId) {
                return res.status(403).json({ message: 'Only offer sender can cancel' });
            }
        }
        await offerRef.update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const updatedDoc = await offerRef.get();
        const updatedData = updatedDoc.data();
        res.json(Object.assign(Object.assign({ id: updatedDoc.id }, updatedData), { createdAt: ((_c = (_b = (_a = updatedData === null || updatedData === void 0 ? void 0 : updatedData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = updatedData === null || updatedData === void 0 ? void 0 : updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = updatedData === null || updatedData === void 0 ? void 0 : updatedData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null }));
    }
    catch (error) {
        console.error('Update offer error:', error);
        res.status(500).json({ message: 'Failed to update offer' });
    }
});
app.post('/offers', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { toUserPhone, toUserName, amount, interestRate, tenure, tenureUnit, purpose, frequency, collateral } = req.body;
        if (!toUserPhone || !amount || !interestRate || !tenure) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (amount <= 0 || interestRate < 0 || tenure <= 0) {
            return res.status(400).json({ message: 'Invalid amount, interest rate, or tenure' });
        }
        const normalizedToPhone = normalizePhoneNumber(toUserPhone);
        // Check if recipient exists
        let toUserId = null;
        const recipientSnapshot = await db.collection('users').where('phone', '==', normalizedToPhone).limit(1).get();
        if (!recipientSnapshot.empty) {
            toUserId = recipientSnapshot.docs[0].id;
        }
        // Calculate due date
        const dueDate = new Date();
        if (tenureUnit === 'days') {
            dueDate.setDate(dueDate.getDate() + tenure);
        }
        else if (tenureUnit === 'months') {
            dueDate.setMonth(dueDate.getMonth() + tenure);
        }
        else if (tenureUnit === 'years') {
            dueDate.setFullYear(dueDate.getFullYear() + tenure);
        }
        const offerData = {
            fromUserId: req.userId,
            toUserId,
            toUserPhone: normalizedToPhone,
            toUserName: toUserName || '',
            amount: parseFloat(amount),
            interestRate: parseFloat(interestRate),
            tenure: parseInt(tenure),
            tenureUnit: tenureUnit || 'months',
            purpose: purpose || '',
            frequency: frequency || 'monthly',
            collateral: collateral || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            dueDate: admin.firestore.Timestamp.fromDate(dueDate)
        };
        const offerRef = await db.collection('offers').add(offerData);
        const createdOffer = await offerRef.get();
        const createdData = createdOffer.data();
        // Generate ALL PDFs immediately when offer is created (contract, KFS, and schedule)
        try {
            console.log('🔄 Generating all PDFs for new offer:', offerRef.id);
            // Get user data for PDF generation
            const userDoc = await db.collection('users').doc(req.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('✅ User data retrieved for PDF generation');
                // Create a simplified offer object for PDF generation
                const offerForPdf = Object.assign(Object.assign({ id: offerRef.id }, offerData), { createdAt: new Date(), updatedAt: new Date(), dueDate: dueDate });
                // Note: This is a basic implementation. In production, you would implement
                // a complete PDF service similar to the server-side version
                console.log('📝 PDF generation placeholder - would generate contract, KFS, and schedule PDFs');
                console.log('✅ All PDFs would be stored in Firebase Storage for instant downloads');
                // Update offer with PDF keys (placeholder for now)
                await offerRef.update({
                    contractPdfKey: `contracts/${offerRef.id}-contract.pdf`,
                    kfsPdfKey: `kfs/${offerRef.id}-kfs.pdf`,
                    schedulePdfKey: `schedules/${offerRef.id}-schedule.pdf`
                });
            }
        }
        catch (error) {
            console.warn('⚠️ PDF generation failed, continuing without PDFs:', error);
        }
        res.status(201).json(Object.assign(Object.assign({ id: offerRef.id }, createdData), { createdAt: ((_c = (_b = (_a = createdData === null || createdData === void 0 ? void 0 : createdData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = createdData === null || createdData === void 0 ? void 0 : createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = createdData === null || createdData === void 0 ? void 0 : createdData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null }));
    }
    catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ message: 'Failed to create offer' });
    }
});
// PDF ENDPOINTS
pdfApp.get('/offers/:id/pdf/contract', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="loan-contract-${id}.pdf"`);
        doc.pipe(res);
        doc.fontSize(20).text('LOAN AGREEMENT CONTRACT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12)
            .text(`Contract ID: ${id}`)
            .text(`Date: ${new Date().toLocaleDateString('en-IN')}`)
            .moveDown();
        doc.fontSize(14).text('LOAN TERMS:', { underline: true });
        doc.fontSize(12)
            .text(`Principal Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .text(`Purpose: ${offerData.purpose || 'Not specified'}`)
            .moveDown();
        doc.fontSize(14).text('TERMS AND CONDITIONS:', { underline: true });
        doc.fontSize(10)
            .text('1. The borrower agrees to repay the loan amount along with interest.')
            .text('2. Late payment charges may apply as per RBI guidelines.')
            .text('3. This agreement is governed by Indian laws.')
            .moveDown();
        doc.fontSize(12)
            .text('Lender Signature: _________________    Date: _________')
            .moveDown()
            .text('Borrower Signature: _______________    Date: _________');
        doc.end();
    }
    catch (error) {
        console.error('Contract PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate contract PDF' });
    }
});
pdfApp.get('/offers/:id/pdf/schedule', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const totalTenureMonths = offerData.tenureUnit === 'years'
            ? offerData.tenure * 12
            : offerData.tenureUnit === 'months'
                ? offerData.tenure
                : Math.ceil(offerData.tenure / 30);
        const emi = calculateEMI(offerData.amount, offerData.interestRate, totalTenureMonths);
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="repayment-schedule-${id}.pdf"`);
        doc.pipe(res);
        doc.fontSize(16).text('LOAN REPAYMENT SCHEDULE', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12)
            .text(`Loan Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Monthly EMI: ${formatCurrency(emi)}`)
            .text(`Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .moveDown();
        // Simple schedule table
        doc.fontSize(10);
        let balance = offerData.amount;
        for (let i = 1; i <= totalTenureMonths; i++) {
            const interestAmount = balance * (offerData.interestRate / 100 / 12);
            const principalAmount = emi - interestAmount;
            balance = Math.max(0, balance - principalAmount);
            const paymentDate = new Date();
            paymentDate.setMonth(paymentDate.getMonth() + i);
            doc.text(`${i}. ${paymentDate.toLocaleDateString('en-IN')} - EMI: ${formatCurrency(emi)} (Principal: ${formatCurrency(principalAmount)}, Interest: ${formatCurrency(interestAmount)}, Balance: ${formatCurrency(balance)})`);
            if (i % 10 === 0 && i < totalTenureMonths) {
                doc.addPage();
            }
        }
        doc.end();
    }
    catch (error) {
        console.error('Schedule PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate schedule PDF' });
    }
});
pdfApp.get('/offers/:id/pdf/kfs', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
        doc.pipe(res);
        doc.fontSize(18).text('KEY FACT STATEMENT (KFS)', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text('LOAN SUMMARY:', { underline: true });
        doc.fontSize(12)
            .text(`Loan Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Loan Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .moveDown();
        doc.fontSize(14).text('IMPORTANT TERMS:', { underline: true });
        doc.fontSize(10)
            .text('• Interest is calculated on reducing balance method')
            .text('• Prepayment allowed without charges')
            .text('• Late payment charges: 2% per month on overdue amount')
            .moveDown();
        doc.fontSize(14).text('RBI GUIDELINES:', { underline: true });
        doc.fontSize(10)
            .text('• This loan is governed by RBI Fair Practices Code')
            .text('• Borrower has right to receive loan statements')
            .text('• Grievance redressal mechanism available');
        doc.end();
    }
    catch (error) {
        console.error('KFS PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate KFS PDF' });
    }
});
// Export all services as Firebase Functions (v2)
exports.api = onRequest({ region: 'us-central1' }, app);
exports.pdfService = onRequest({ region: 'us-central1' }, pdfApp);
//# sourceMappingURL=index.js.map