"use strict";
/**
 * Firebase Functions entry point for CredNXT P2P Lending Platform
 * Provides secure API endpoints for offer management and PDF generation
 *
 * @fileoverview Main Firebase Functions module with Express server and security measures
 * @author CredNXT Development Team
 * @since 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const express = __importStar(require("express"));
const cors = __importStar(require("cors"));
// @ts-ignore
const pdfkit_1 = __importDefault(require("pdfkit"));
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * PDF Service implementation for Firebase Functions
 * Handles secure document generation and cloud storage operations
 *
 * @class PdfService
 * @since 1.0.0
 */
class PdfService {
    /**
     * Initialize PDF Service with Firebase Storage
     * @constructor
     * @memberof PdfService
     */
    constructor() {
        this.bucket = admin.storage().bucket();
        console.log('📁 PDF Service: Using Firebase Storage');
    }
    /**
     * Generate secure loan contract PDF document
     * @async
     * @param {any} offer - Loan offer details
     * @param {any} fromUser - User creating the offer
     * @returns {Promise<string>} Storage key for the generated contract
     * @throws {Error} If PDF generation fails
     * @memberof PdfService
     */
    async generateContract(offer, fromUser) {
        const fileName = `${offer.id}-${Date.now()}.pdf`;
        const contractKey = `contracts/${fileName}`;
        try {
            console.log('🔄 Generating contract PDF for offer:', offer.id);
            const pdfBuffer = await this.createPdfContract(offer, fromUser);
            // Upload to Firebase Storage
            const file = this.bucket.file(contractKey);
            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=3600'
                }
            });
            console.log('✅ Contract PDF stored:', contractKey);
            return contractKey;
        }
        catch (error) {
            console.error('❌ Failed to generate contract PDF:', error);
            throw error;
        }
    }
    async generateKFS(offer, fromUser) {
        const fileName = `${offer.id}-kfs-${Date.now()}.pdf`;
        const kfsKey = `kfs/${fileName}`;
        try {
            console.log('🔄 Generating KFS PDF for offer:', offer.id);
            const pdfBuffer = await this.createPdfKFS(offer, fromUser);
            // Upload to Firebase Storage
            const file = this.bucket.file(kfsKey);
            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=3600'
                }
            });
            console.log('✅ KFS PDF stored:', kfsKey);
            return kfsKey;
        }
        catch (error) {
            console.error('❌ Failed to generate KFS PDF:', error);
            throw error;
        }
    }
    async generateRepaymentSchedule(offer, fromUser) {
        const fileName = `${offer.id}-schedule-${Date.now()}.pdf`;
        const scheduleKey = `schedules/${fileName}`;
        try {
            console.log('🔄 Generating schedule PDF for offer:', offer.id);
            const pdfBuffer = await this.createPdfSchedule(offer, fromUser);
            // Upload to Firebase Storage
            const file = this.bucket.file(scheduleKey);
            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=3600'
                }
            });
            console.log('✅ Schedule PDF stored:', scheduleKey);
            return scheduleKey;
        }
        catch (error) {
            console.error('❌ Failed to generate schedule PDF:', error);
            throw error;
        }
    }
    async createPdfContract(offer, fromUser) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Contract content
            doc.fontSize(20).text('LOAN AGREEMENT CONTRACT', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12)
                .text(`Contract ID: ${offer.id}`)
                .text(`Date: ${new Date().toLocaleDateString('en-IN')}`)
                .moveDown();
            doc.fontSize(14).text('LOAN TERMS:', { underline: true });
            // Sanitize user inputs to prevent PDF injection
            const sanitizeText = (text) => {
                if (!text || typeof text !== 'string')
                    return 'N/A';
                return text
                    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                    .replace(/[<>]/g, '') // Remove angle brackets
                    .trim()
                    .substring(0, 1000); // Limit length
            };
            doc.fontSize(12)
                .text(`Lender: ${sanitizeText(fromUser.name || 'N/A')}`)
                .text(`Borrower: ${sanitizeText(offer.toUserName || 'N/A')}`)
                .text(`Amount: ₹${Number(offer.amount || 0).toLocaleString('en-IN')}`)
                .text(`Interest Rate: ${Number(offer.interestRate || 0)}% per annum`)
                .text(`Tenure: ${Number(offer.tenureValue || 0)} ${sanitizeText(offer.tenureUnit || 'months')}`)
                .text(`Purpose: ${sanitizeText(offer.purpose || 'General')}`)
                .moveDown();
            doc.fontSize(14).text('TERMS AND CONDITIONS:', { underline: true });
            doc.fontSize(10)
                .text('1. The borrower agrees to repay the loan amount with interest as per agreed schedule.')
                .text('2. Late payment charges may apply for overdue amounts.')
                .text('3. This agreement is legally binding under Indian law.');
            doc.end();
        });
    }
    async createPdfKFS(offer, fromUser) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // KFS content
            doc.fontSize(20).text('KEY FACT STATEMENT (KFS)', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text('LOAN SUMMARY:', { underline: true });
            doc.fontSize(12)
                .text(`Loan Amount: ₹${offer.amount.toLocaleString('en-IN')}`)
                .text(`Interest Rate: ${offer.interestRate}% per annum`)
                .text(`Loan Tenure: ${offer.tenureValue} ${offer.tenureUnit}`)
                .text(`Repayment Frequency: ${offer.repaymentFrequency}`)
                .moveDown();
            doc.fontSize(14).text('IMPORTANT DISCLOSURES:', { underline: true });
            doc.fontSize(10)
                .text('• Interest is calculated on reducing balance method')
                .text('• No prepayment penalties apply')
                .text('• Late payment charges: 2% per month on overdue amount')
                .text('• This is a peer-to-peer lending arrangement');
            doc.end();
        });
    }
    async createPdfSchedule(offer, fromUser) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Schedule content
            doc.fontSize(20).text('REPAYMENT SCHEDULE', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12)
                .text(`Loan ID: ${offer.id}`)
                .text(`Amount: ₹${offer.amount.toLocaleString('en-IN')}`)
                .text(`Interest Rate: ${offer.interestRate}% per annum`)
                .moveDown();
            // Simple schedule calculation
            const monthlyRate = offer.interestRate / 12 / 100;
            const numPayments = offer.tenureUnit === 'years' ? offer.tenureValue * 12 :
                offer.tenureUnit === 'months' ? offer.tenureValue : 1;
            const monthlyPayment = (offer.amount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                (Math.pow(1 + monthlyRate, numPayments) - 1);
            doc.fontSize(14).text('PAYMENT SCHEDULE:', { underline: true });
            doc.fontSize(10);
            for (let i = 1; i <= Math.min(numPayments, 12); i++) {
                const paymentDate = new Date();
                paymentDate.setMonth(paymentDate.getMonth() + i);
                doc.text(`${i}. ${paymentDate.toLocaleDateString('en-IN')} - ₹${monthlyPayment.toFixed(2)}`);
            }
            if (numPayments > 12) {
                doc.text(`... and ${numPayments - 12} more payments`);
            }
            doc.end();
        });
    }
    async downloadPdf(pdfKey) {
        try {
            const file = this.bucket.file(pdfKey);
            const [buffer] = await file.download();
            return buffer;
        }
        catch (error) {
            console.error('❌ Failed to download PDF:', error);
            throw error;
        }
    }
}
// Initialize PDF Service
const pdfService = new PdfService();
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
// Main API Express app
const app = express.default();
// Enhanced security middleware for Firebase Functions
app.use((req, res, next) => {
    var _a;
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // CSRF protection for state-changing operations
    // Firebase Functions uses stateless authentication, but we add extra protection
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token && !req.path.includes('/health') && !req.path.includes('/ready')) {
            return res.status(403).json({
                message: 'Authentication required for state-changing operations',
                code: 'CSRF_PROTECTION_REQUIRED'
            });
        }
    }
    next();
});
app.use(cors.default({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
// Rate limiting middleware (simplified)
const rateLimitMiddleware = (req, res, next) => {
    next(); // Simplified for Firebase Functions
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
                user = Object.assign({ id: snapshot.docs[0].id, name: (userData === null || userData === void 0 ? void 0 : userData.name) || '', phone: (userData === null || userData === void 0 ? void 0 : userData.phone) || '' }, userData);
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
        // Secure object creation - whitelist known safe properties to prevent mass assignment
        const normalizedOffers = allOffers.map((offer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return ({
                id: offer.id,
                fromUserId: offer.fromUserId,
                toUserId: offer.toUserId,
                toUserPhone: offer.toUserPhone,
                toUserName: offer.toUserName,
                amount: offer.amount,
                interestRate: offer.interestRate,
                tenureValue: offer.tenureValue,
                tenureUnit: offer.tenureUnit,
                purpose: offer.purpose,
                repaymentFrequency: offer.repaymentFrequency,
                status: offer.status,
                offerType: offer.offerType,
                contractKey: offer.contractKey,
                kfsKey: offer.kfsKey,
                scheduleKey: offer.scheduleKey,
                createdAt: ((_c = (_b = (_a = offer.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(),
                updatedAt: ((_f = (_e = (_d = offer.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(),
                dueDate: ((_j = (_h = (_g = offer.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null
            });
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
        // Secure object creation - whitelist known safe properties to prevent mass assignment
        const safeOfferData = {
            id: offerDoc.id,
            fromUserId: offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId,
            toUserId: offerData === null || offerData === void 0 ? void 0 : offerData.toUserId,
            toUserPhone: offerData === null || offerData === void 0 ? void 0 : offerData.toUserPhone,
            toUserName: offerData === null || offerData === void 0 ? void 0 : offerData.toUserName,
            amount: offerData === null || offerData === void 0 ? void 0 : offerData.amount,
            interestRate: offerData === null || offerData === void 0 ? void 0 : offerData.interestRate,
            tenureValue: offerData === null || offerData === void 0 ? void 0 : offerData.tenureValue,
            tenureUnit: offerData === null || offerData === void 0 ? void 0 : offerData.tenureUnit,
            purpose: offerData === null || offerData === void 0 ? void 0 : offerData.purpose,
            repaymentFrequency: offerData === null || offerData === void 0 ? void 0 : offerData.repaymentFrequency,
            status: offerData === null || offerData === void 0 ? void 0 : offerData.status,
            offerType: offerData === null || offerData === void 0 ? void 0 : offerData.offerType,
            contractKey: offerData === null || offerData === void 0 ? void 0 : offerData.contractKey,
            kfsKey: offerData === null || offerData === void 0 ? void 0 : offerData.kfsKey,
            scheduleKey: offerData === null || offerData === void 0 ? void 0 : offerData.scheduleKey,
            createdAt: ((_c = (_b = (_a = offerData === null || offerData === void 0 ? void 0 : offerData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(),
            updatedAt: ((_f = (_e = (_d = offerData === null || offerData === void 0 ? void 0 : offerData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(),
            dueDate: ((_j = (_h = (_g = offerData === null || offerData === void 0 ? void 0 : offerData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null
        };
        res.json(safeOfferData);
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
        // Secure object creation - whitelist known safe properties to prevent mass assignment
        const safeUpdatedData = {
            id: updatedDoc.id,
            fromUserId: updatedData === null || updatedData === void 0 ? void 0 : updatedData.fromUserId,
            toUserId: updatedData === null || updatedData === void 0 ? void 0 : updatedData.toUserId,
            toUserPhone: updatedData === null || updatedData === void 0 ? void 0 : updatedData.toUserPhone,
            toUserName: updatedData === null || updatedData === void 0 ? void 0 : updatedData.toUserName,
            amount: updatedData === null || updatedData === void 0 ? void 0 : updatedData.amount,
            interestRate: updatedData === null || updatedData === void 0 ? void 0 : updatedData.interestRate,
            tenureValue: updatedData === null || updatedData === void 0 ? void 0 : updatedData.tenureValue,
            tenureUnit: updatedData === null || updatedData === void 0 ? void 0 : updatedData.tenureUnit,
            purpose: updatedData === null || updatedData === void 0 ? void 0 : updatedData.purpose,
            repaymentFrequency: updatedData === null || updatedData === void 0 ? void 0 : updatedData.repaymentFrequency,
            status: updatedData === null || updatedData === void 0 ? void 0 : updatedData.status,
            offerType: updatedData === null || updatedData === void 0 ? void 0 : updatedData.offerType,
            contractKey: updatedData === null || updatedData === void 0 ? void 0 : updatedData.contractKey,
            kfsKey: updatedData === null || updatedData === void 0 ? void 0 : updatedData.kfsKey,
            scheduleKey: updatedData === null || updatedData === void 0 ? void 0 : updatedData.scheduleKey,
            createdAt: ((_c = (_b = (_a = updatedData === null || updatedData === void 0 ? void 0 : updatedData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(),
            updatedAt: ((_f = (_e = (_d = updatedData === null || updatedData === void 0 ? void 0 : updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(),
            dueDate: ((_j = (_h = (_g = updatedData === null || updatedData === void 0 ? void 0 : updatedData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null
        };
        res.json(safeUpdatedData);
    }
    catch (error) {
        console.error('Update offer error:', error);
        res.status(500).json({ message: 'Failed to update offer' });
    }
});
app.post('/offers', authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { toUserPhone, toUserName, amount, interestRate, tenureValue, tenureUnit, purpose, repaymentFrequency } = req.body;
        if (!toUserPhone || !amount || !interestRate || !tenureValue) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (amount <= 0 || interestRate < 0 || tenureValue <= 0) {
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
            dueDate.setDate(dueDate.getDate() + tenureValue);
        }
        else if (tenureUnit === 'months') {
            dueDate.setMonth(dueDate.getMonth() + tenureValue);
        }
        else if (tenureUnit === 'years') {
            dueDate.setFullYear(dueDate.getFullYear() + tenureValue);
        }
        const offerData = {
            fromUserId: req.userId,
            toUserId,
            toUserPhone: normalizedToPhone,
            toUserName: toUserName || '',
            amount: parseFloat(amount),
            interestRate: parseFloat(interestRate),
            tenureValue: parseInt(tenureValue),
            tenureUnit: tenureUnit || 'months',
            purpose: purpose || '',
            repaymentFrequency: repaymentFrequency || 'monthly',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            dueDate: admin.firestore.Timestamp.fromDate(dueDate)
        };
        const offerRef = await db.collection('offers').add(offerData);
        const createdOffer = await offerRef.get();
        const createdData = createdOffer.data();
        res.status(201).json(Object.assign(Object.assign({ id: offerRef.id }, createdData), { createdAt: ((_c = (_b = (_a = createdData === null || createdData === void 0 ? void 0 : createdData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(), updatedAt: ((_f = (_e = (_d = createdData === null || createdData === void 0 ? void 0 : createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || new Date().toISOString(), dueDate: ((_j = (_h = (_g = createdData === null || createdData === void 0 ? void 0 : createdData.dueDate) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || null }));
    }
    catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ message: 'Failed to create offer' });
    }
});
// PDF endpoints
app.get('/offers/:id/pdf/contract', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if (!offerData) {
            return res.status(404).json({ message: 'Offer data not found' });
        }
        if (offerData.fromUserId !== req.userId && offerData.toUserId !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const fromUser = await db.collection('users').doc(offerData.fromUserId).get();
        if (!fromUser.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        const offerWithId = Object.assign(Object.assign({}, offerData), { id });
        const pdfBuffer = await generateContractPDFBuffer(offerWithId, fromUser.data());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="loan-contract-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Contract PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate contract PDF' });
    }
});
app.get('/offers/:id/pdf/kfs', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if (!offerData) {
            return res.status(404).json({ message: 'Offer data not found' });
        }
        if (offerData.fromUserId !== req.userId && offerData.toUserId !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const fromUser = await db.collection('users').doc(offerData.fromUserId).get();
        if (!fromUser.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        const offerWithId = Object.assign(Object.assign({}, offerData), { id });
        const pdfBuffer = await generateKFSPDFBuffer(offerWithId, fromUser.data());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('KFS PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate KFS PDF' });
    }
});
app.get('/offers/:id/pdf/schedule', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        if (!offerData) {
            return res.status(404).json({ message: 'Offer data not found' });
        }
        if (offerData.fromUserId !== req.userId && offerData.toUserId !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const fromUser = await db.collection('users').doc(offerData.fromUserId).get();
        if (!fromUser.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        const offerWithId = Object.assign(Object.assign({}, offerData), { id });
        // Get payments for schedule
        const paymentsSnapshot = await db.collection('payments')
            .where('offerId', '==', id)
            .orderBy('dueDate', 'asc')
            .get();
        const payments = paymentsSnapshot.docs.map(doc => doc.data());
        const pdfBuffer = await generateSchedulePDFBuffer(offerWithId, payments);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="repayment-schedule-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Schedule PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate schedule PDF' });
    }
});
// Set global options for Firebase Functions v2
(0, v2_1.setGlobalOptions)({
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
});
// Simple PDF generation functions
function generateContractPDFBuffer(offerData, fromUser) {
    return new Promise((resolve, reject) => {
        var _a;
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Contract content
            doc.fontSize(20).text('LOAN AGREEMENT CONTRACT', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12)
                .text(`Contract ID: ${offerData.id}`)
                .text(`Date: ${new Date().toLocaleDateString('en-IN')}`)
                .moveDown();
            doc.fontSize(14).text('LOAN TERMS:', { underline: true });
            doc.fontSize(12)
                .text(`Lender: ${(fromUser === null || fromUser === void 0 ? void 0 : fromUser.name) || 'N/A'}`)
                .text(`Phone: ${(fromUser === null || fromUser === void 0 ? void 0 : fromUser.phone) || 'N/A'}`)
                .text(`Borrower: ${offerData.toUserName || 'N/A'}`)
                .text(`Amount: ₹${((_a = offerData.amount) === null || _a === void 0 ? void 0 : _a.toLocaleString('en-IN')) || 'N/A'}`)
                .text(`Interest Rate: ${offerData.interestRate || 'N/A'}% per annum`)
                .text(`Duration: ${offerData.duration || offerData.tenureValue || 'N/A'} ${offerData.durationUnit || offerData.tenureUnit || ''}`)
                .text(`Purpose: ${offerData.purpose || 'N/A'}`)
                .moveDown();
            doc.fontSize(14).text('TERMS AND CONDITIONS:', { underline: true });
            doc.fontSize(10)
                .text('1. The borrower agrees to repay the loan amount with interest as per agreed schedule.')
                .text('2. Late payment charges may apply for overdue amounts.')
                .text('3. This agreement is legally binding under Indian law.');
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
function generateKFSPDFBuffer(offerData, fromUser) {
    return new Promise((resolve, reject) => {
        var _a;
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // KFS content
            doc.fontSize(20).text('KEY FACT SHEET (KFS)', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12)
                .text(`Loan ID: ${offerData.id}`)
                .text(`Date: ${new Date().toLocaleDateString('en-IN')}`)
                .moveDown();
            doc.fontSize(14).text('LOAN SUMMARY:', { underline: true });
            doc.fontSize(12)
                .text(`Principal Amount: ₹${((_a = offerData.amount) === null || _a === void 0 ? void 0 : _a.toLocaleString('en-IN')) || 'N/A'}`)
                .text(`Interest Rate: ${offerData.interestRate || 'N/A'}% per annum`)
                .text(`Loan Duration: ${offerData.duration || offerData.tenureValue || 'N/A'} ${offerData.durationUnit || offerData.tenureUnit || ''}`)
                .text(`Repayment Frequency: ${offerData.frequency || offerData.repaymentFrequency || 'N/A'}`)
                .moveDown();
            doc.fontSize(14).text('IMPORTANT INFORMATION:', { underline: true });
            doc.fontSize(10)
                .text('• This is a peer-to-peer lending arrangement')
                .text('• Interest rates are as mutually agreed between parties')
                .text('• Early repayment options may be available');
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
function generateSchedulePDFBuffer(offerData, payments) {
    return new Promise((resolve, reject) => {
        var _a;
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', (buffer) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Schedule content
            doc.fontSize(20).text('REPAYMENT SCHEDULE', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12)
                .text(`Loan ID: ${offerData.id}`)
                .text(`Principal Amount: ₹${((_a = offerData.amount) === null || _a === void 0 ? void 0 : _a.toLocaleString('en-IN')) || 'N/A'}`)
                .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`)
                .moveDown();
            if (payments && payments.length > 0) {
                doc.fontSize(14).text('PAYMENT SCHEDULE:', { underline: true });
                doc.moveDown();
                // Table headers
                doc.fontSize(10)
                    .text('S.No.', 50, doc.y, { width: 40 })
                    .text('Due Date', 100, doc.y, { width: 100 })
                    .text('Amount (₹)', 210, doc.y, { width: 100 })
                    .text('Status', 320, doc.y, { width: 100 });
                doc.moveDown();
                // Payment rows
                payments.forEach((payment, index) => {
                    var _a, _b;
                    const dueDate = ((_a = payment.dueDate) === null || _a === void 0 ? void 0 : _a.toDate) ? payment.dueDate.toDate() : new Date(payment.dueDate);
                    const yPosition = doc.y;
                    doc.fontSize(10)
                        .text((index + 1).toString(), 50, yPosition, { width: 40 })
                        .text(dueDate.toLocaleDateString(), 100, yPosition, { width: 100 })
                        .text(((_b = payment.amount) === null || _b === void 0 ? void 0 : _b.toString()) || '0', 210, yPosition, { width: 100 })
                        .text(payment.status || 'Pending', 320, yPosition, { width: 100 });
                    doc.moveDown();
                });
            }
            else {
                doc.fontSize(12).text('No payment schedule available.');
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
// Export the main API function for Firebase Functions v2
exports.api = (0, https_1.onRequest)(app);
//# sourceMappingURL=index.js.map