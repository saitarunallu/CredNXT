"use strict";
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const paymentApp = express();
paymentApp.use(express.json());
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
// Get payments for an offer
paymentApp.get('/offers/:id/payments', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Verify user has access to the offer
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Get payments for this offer
        const paymentsSnapshot = await db.collection('payments')
            .where('offerId', '==', id)
            .orderBy('createdAt', 'desc')
            .get();
        const payments = paymentsSnapshot.docs.map(doc => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: ((_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = doc.data().updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = doc.data().dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null, paidDate: ((_m = (_l = (_k = doc.data().paidDate) === null || _k === void 0 ? void 0 : _k.toDate) === null || _l === void 0 ? void 0 : _l.call(_k)) === null || _m === void 0 ? void 0 : _m.toISOString()) || null }));
        });
        res.json(payments);
    }
    catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ message: 'Failed to fetch payments' });
    }
});
// Submit a payment
paymentApp.post('/offers/:id/payments', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const { amount, paymentMethod, transactionId, notes } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required' });
        }
        // Verify user has access to the offer
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Only borrower can submit payments' });
        }
        // Create payment record
        const paymentData = {
            offerId: id,
            fromUserId: req.userId,
            toUserId: offerData.fromUserId,
            amount: parseFloat(amount),
            status: 'pending',
            paymentMethod: paymentMethod || 'upi',
            transactionId: transactionId || '',
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const paymentRef = await db.collection('payments').add(paymentData);
        const createdPayment = await paymentRef.get();
        const createdData = createdPayment.data();
        // Create notification for lender
        await db.collection('notifications').add({
            userId: offerData.fromUserId,
            type: 'payment_submitted',
            title: 'Payment Submitted',
            message: `Payment of ₹${amount} submitted for approval`,
            offerId: id,
            paymentId: paymentRef.id,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(201).json(Object.assign(Object.assign({ id: paymentRef.id }, createdData), { createdAt: ((_c = (_b = (_a = createdData === null || createdData === void 0 ? void 0 : createdData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = createdData === null || createdData === void 0 ? void 0 : createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), submittedAt: ((_j = (_h = (_g = createdData === null || createdData === void 0 ? void 0 : createdData.submittedAt) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || new Date().toISOString() }));
    }
    catch (error) {
        console.error('Submit payment error:', error);
        res.status(500).json({ message: 'Failed to submit payment' });
    }
});
// Approve/reject a payment
paymentApp.patch('/payments/:id', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const paymentRef = db.collection('payments').doc(id);
        const paymentDoc = await paymentRef.get();
        if (!paymentDoc.exists) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        const paymentData = paymentDoc.data();
        // Verify user is the lender
        if ((paymentData === null || paymentData === void 0 ? void 0 : paymentData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Only lender can approve/reject payments' });
        }
        const updateData = {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedBy: req.userId,
            reviewedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (notes) {
            updateData.reviewNotes = notes;
        }
        if (status === 'approved') {
            updateData.paidDate = admin.firestore.FieldValue.serverTimestamp();
        }
        await paymentRef.update(updateData);
        // Create notification for borrower
        await db.collection('notifications').add({
            userId: paymentData.fromUserId,
            type: `payment_${status}`,
            title: `Payment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your payment of ₹${paymentData.amount} has been ${status}`,
            offerId: paymentData.offerId,
            paymentId: id,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const updatedDoc = await paymentRef.get();
        const updatedData = updatedDoc.data();
        res.json(Object.assign(Object.assign({ id: updatedDoc.id }, updatedData), { createdAt: ((_c = (_b = (_a = updatedData === null || updatedData === void 0 ? void 0 : updatedData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = updatedData === null || updatedData === void 0 ? void 0 : updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), paidDate: ((_j = (_h = (_g = updatedData === null || updatedData === void 0 ? void 0 : updatedData.paidDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null, reviewedAt: ((_m = (_l = (_k = updatedData === null || updatedData === void 0 ? void 0 : updatedData.reviewedAt) === null || _k === void 0 ? void 0 : _k.toDate) === null || _l === void 0 ? void 0 : _l.call(_k)) === null || _m === void 0 ? void 0 : _m.toISOString()) || null }));
    }
    catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ message: 'Failed to update payment' });
    }
});
// Get payment summary for an offer
paymentApp.get('/offers/:id/payment-summary', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Verify user has access to the offer
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Get approved payments for this offer
        const paymentsSnapshot = await db.collection('payments')
            .where('offerId', '==', id)
            .where('status', '==', 'approved')
            .get();
        const totalPaid = paymentsSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);
        const pendingPaymentsSnapshot = await db.collection('payments')
            .where('offerId', '==', id)
            .where('status', '==', 'pending')
            .get();
        const pendingAmount = pendingPaymentsSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);
        const outstanding = Math.max(0, ((offerData === null || offerData === void 0 ? void 0 : offerData.amount) || 0) - totalPaid);
        res.json({
            totalAmount: (offerData === null || offerData === void 0 ? void 0 : offerData.amount) || 0,
            totalPaid,
            pendingAmount,
            outstanding,
            paymentCount: paymentsSnapshot.docs.length,
            pendingPaymentCount: pendingPaymentsSnapshot.docs.length
        });
    }
    catch (error) {
        console.error('Get payment summary error:', error);
        res.status(500).json({ message: 'Failed to fetch payment summary' });
    }
});
// Export payment service as Firebase Function
exports.paymentService = functions.https.onRequest(paymentApp);
//# sourceMappingURL=payment-service.js.map