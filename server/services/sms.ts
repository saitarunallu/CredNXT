import twilio from 'twilio';
import { z } from 'zod';

// SMS configuration schema
const smsConfigSchema = z.object({
  accountSid: z.string(),
  authToken: z.string(),
  fromNumber: z.string(),
});

// SMS message schema
const smsMessageSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1).max(1600, 'Message too long'),
  type: z.enum(['verification', 'notification', 'reminder', 'alert']).optional(),
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
  private client: twilio.Twilio | null = null;
  private config: SMSConfig | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const config = {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
      };

      // Validate configuration
      const result = smsConfigSchema.safeParse(config);
      if (!result.success) {
        console.warn('SMS service not configured. Missing environment variables:', 
          result.error.issues.map(i => i.path.join('.')));
        return;
      }

      this.config = result.data;
      this.client = twilio(config.accountSid, config.authToken);
      this.isConfigured = true;
      console.log('SMS service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
    }
  }

  public isEnabled(): boolean {
    return this.isConfigured && this.client !== null;
  }

  public async sendSMS(params: SMSMessage): Promise<SMSResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.',
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
      const message = await this.client!.messages.create({
        body: params.message,
        from: this.config!.fromNumber,
        to: params.to,
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        cost: message.price || undefined,
      };
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  // Predefined SMS templates for common use cases
  public async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your CredNXT verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'verification',
    });
  }

  public async sendLoanOfferNotification(phoneNumber: string, amount: string, fromName: string): Promise<SMSResult> {
    const message = `New loan offer from ${fromName} for ₹${amount} on CredNXT. Login to view details and respond.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'notification',
    });
  }

  public async sendPaymentReminder(phoneNumber: string, amount: string, dueDate: string): Promise<SMSResult> {
    const message = `Payment reminder: ₹${amount} due on ${dueDate}. Login to CredNXT to make payment.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'reminder',
    });
  }

  public async sendPaymentReceived(phoneNumber: string, amount: string, fromName: string): Promise<SMSResult> {
    const message = `Payment of ₹${amount} received from ${fromName}. Thank you for using CredNXT!`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'notification',
    });
  }

  public async sendLoanApproved(phoneNumber: string, amount: string): Promise<SMSResult> {
    const message = `Your loan application for ₹${amount} has been approved! Funds will be transferred as per agreement.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'notification',
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
      const message = await this.client!.messages(messageId).fetch();
      return { status: message.status };
    } catch (error: any) {
      return { status: 'unknown', error: error.message };
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();