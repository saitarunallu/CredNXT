import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// CORS configuration for production
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Phone number normalization utility
function normalizePhoneNumber(phone: string): string {
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
    
    const db = admin.firestore();
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
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
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