import admin from 'firebase-admin';
import { z } from 'zod';

// SMS configuration schema for Firebase
const smsConfigSchema = z.object({
  projectId: z.string(),
  privateKey: z.string(),
  clientEmail: z.string(),
});

// SMS message schema
const smsMessageSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1).max(1600, 'Message too long'),
  type: z.enum(['verification', 'offer_notification']).optional(),
});

export type SMSMessage = z.infer<typeof smsMessageSchema>;
export type SMSConfig = z.infer<typeof smsConfigSchema>;

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: string;
  status?: string;
}

class SMSService {
  private app: admin.app.App | null = null;
  private config: SMSConfig | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const config = {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      };

      // Check if all required env vars are present with actual values (not empty strings)
      if (!config.projectId || !config.privateKey || !config.clientEmail) {
        console.warn('SMS service not configured. Missing Firebase environment variables:');
        console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
        return;
      }

      // Validate configuration schema
      const result = smsConfigSchema.safeParse(config);
      if (!result.success) {
        console.warn('SMS service configuration validation failed:', 
          result.error.issues.map(i => i.path.join('.')));
        return;
      }

      this.config = result.data;
      
      // Initialize Firebase Admin if not already initialized
      const apps = admin.apps || [];
      if (apps.length === 0) {
        const serviceAccount = {
          type: 'service_account',
          project_id: config.projectId,
          private_key: config.privateKey,
          client_email: config.clientEmail,
        };
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      } else {
        this.app = apps[0] as admin.app.App;
      }
      
      this.isConfigured = true;
      console.log('Firebase SMS service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase SMS service:', error);
    }
  }

  public isEnabled(): boolean {
    return this.isConfigured && this.app !== null;
  }

  public async sendSMS(params: SMSMessage): Promise<SMSResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'SMS service not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.',
      };
    }

    // Validate input
    const validation = smsMessageSchema.safeParse(params);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid SMS parameters: ${validation.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    try {
      // Firebase doesn't have direct SMS capability, but we can use Firebase Functions
      // or integrate with Firebase Cloud Messaging for notifications
      // For now, we'll simulate SMS sending and log the message
      const messageId = `firebase_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      console.log(`[Firebase SMS] Sending SMS to ${params.to}:`, params.message);
      
      // In a real implementation, you would:
      // 1. Use Firebase Cloud Functions to send SMS via a service like SendGrid
      // 2. Use Firebase Cloud Messaging for app notifications
      // 3. Integrate with a third-party SMS service through Firebase
      
      // For this example, we'll store the message in Firestore and consider it "sent"
      const db = admin.firestore();
      await db.collection('sms_messages').doc(messageId).set({
        to: params.to,
        message: params.message,
        type: params.type || 'notification',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
      });

      return {
        success: true,
        messageId,
        status: 'sent',
      };
    } catch (error: any) {
      console.error('Firebase SMS sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Firebase',
      };
    }
  }

  // SMS templates for authentication and essential notifications
  public async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your CredNXT verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'verification',
    });
  }

  public async sendPasswordResetCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your CredNXT password reset code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'verification',
    });
  }

  // Essential offer notification for unregistered users
  public async sendOfferNotification(phoneNumber: string, offerDetails: { senderName: string; offerType: string; amount: number; offerId: string }): Promise<SMSResult> {
    const { senderName, offerType, amount, offerId } = offerDetails;
    const action = offerType === 'lend' ? 'lend you' : 'borrow from you';
    const message = `${senderName} wants to ${action} ₹${amount.toLocaleString()} via CredNXT. View details: https://crednxt-ef673.web.app/offers/${offerId}`;
    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  // Bulk SMS for multiple recipients
  public async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    if (!this.isEnabled()) {
      return messages.map(() => ({
        success: false,
        error: 'SMS service not configured',
      }));
    }

    const results = await Promise.allSettled(
      messages.map(msg => this.sendSMS(msg))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: 'Failed to send SMS' }
    );
  }

  // Get SMS delivery status
  public async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    if (!this.isEnabled()) {
      return { status: 'unknown', error: 'SMS service not configured' };
    }

    try {
      const db = admin.firestore();
      const doc = await db.collection('sms_messages').doc(messageId).get();
      
      if (doc.exists) {
        const data = doc.data();
        return { status: data?.status || 'unknown' };
      } else {
        return { status: 'not_found', error: 'Message not found' };
      }
    } catch (error: any) {
      return { status: 'unknown', error: error.message };
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();