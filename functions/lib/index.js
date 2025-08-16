"use strict";
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
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// Initialize Firebase Admin if not already done
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp();
}
const app = (0, express_1.default)();
// CORS configuration for production
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
// Phone number normalization utility
function normalizePhoneNumber(phone) {
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
        const db = firebase_admin_1.default.firestore();
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
        }
        else {
            return res.json({ exists: false });
        }
    }
    catch (error) {
        console.error('Check phone error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Export as Firebase Function
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map