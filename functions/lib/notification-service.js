"use strict";
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const notificationApp = express();
notificationApp.use(express.json());
// Authentication middleware
/**
 * Middleware to authenticate requests using Firebase ID tokens.
 * @example
 * sync(req, res, next)
 * // Authenticates the request and sets the userId on the request object if token is valid.
 * @param {Object} req - Express request object which includes headers and other request information.
 * @param {Object} res - Express response object used to return HTTP responses.
 * @param {Function} next - Express next middleware function to pass control to the next middleware.
 * @returns {void} Sets req.userId if authentication is successful, otherwise sends a 401 response.
**/
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
// Get user notifications
notificationApp.get('/notifications', authenticate, async (req, res) => {
    try {
        const { limit = 50, unreadOnly = false } = req.query;
        let query = db.collection('notifications')
            .where('userId', '==', req.userId)
            .orderBy('createdAt', 'desc');
        if (unreadOnly === 'true') {
            query = query.where('isRead', '==', false);
        }
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        const snapshot = await query.get();
        const notifications = snapshot.docs.map(doc => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: ((_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString() }));
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});
// Mark notification as read
notificationApp.patch('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const notificationRef = db.collection('notifications').doc(id);
        const notificationDoc = await notificationRef.get();
        if (!notificationDoc.exists) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        const notificationData = notificationDoc.data();
        if ((notificationData === null || notificationData === void 0 ? void 0 : notificationData.userId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await notificationRef.update({
            isRead: true,
            readAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});
// Mark all notifications as read
notificationApp.patch('/notifications/read-all', authenticate, async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', req.userId)
            .where('isRead', '==', false)
            .get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                readAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        res.json({
            success: true,
            message: `${snapshot.docs.length} notifications marked as read`
        });
    }
    catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
});
// Delete notification
notificationApp.delete('/notifications/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const notificationRef = db.collection('notifications').doc(id);
        const notificationDoc = await notificationRef.get();
        if (!notificationDoc.exists) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        const notificationData = notificationDoc.data();
        if ((notificationData === null || notificationData === void 0 ? void 0 : notificationData.userId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await notificationRef.delete();
        res.json({ success: true, message: 'Notification deleted' });
    }
    catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
});
// Get notification counts
notificationApp.get('/notifications/counts', authenticate, async (req, res) => {
    try {
        const [totalSnapshot, unreadSnapshot] = await Promise.all([
            db.collection('notifications').where('userId', '==', req.userId).get(),
            db.collection('notifications')
                .where('userId', '==', req.userId)
                .where('isRead', '==', false)
                .get()
        ]);
        res.json({
            total: totalSnapshot.docs.length,
            unread: unreadSnapshot.docs.length,
            read: totalSnapshot.docs.length - unreadSnapshot.docs.length
        });
    }
    catch (error) {
        console.error('Get notification counts error:', error);
        res.status(500).json({ message: 'Failed to fetch notification counts' });
    }
});
// Create notification (internal use)
notificationApp.post('/notifications', authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        const { userId, type, title, message, offerId, paymentId, priority = 'normal' } = req.body;
        if (!userId || !type || !title || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const notificationData = {
            userId,
            type,
            title,
            message,
            priority,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.userId
        };
        if (offerId)
            notificationData.offerId = offerId;
        if (paymentId)
            notificationData.paymentId = paymentId;
        const notificationRef = await db.collection('notifications').add(notificationData);
        const createdNotification = await notificationRef.get();
        const createdData = createdNotification.data();
        res.status(201).json(Object.assign(Object.assign({ id: notificationRef.id }, createdData), { createdAt: ((_c = (_b = (_a = createdData === null || createdData === void 0 ? void 0 : createdData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString() }));
    }
    catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ message: 'Failed to create notification' });
    }
});
// Export notification service as Firebase Function
exports.notificationService = functions.https.onRequest(notificationApp);
//# sourceMappingURL=notification-service.js.map