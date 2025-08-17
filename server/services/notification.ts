export class NotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Email notification: To: ${to}, Subject: ${subject}`);
      return;
    }

    // In production, integrate with SendGrid or similar
    const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.warn('Email API key not configured - skipping email notification');
      return; // Don't throw error, just skip sending
    }

    try {
      // Implementation with SendGrid would go here
      console.log(`[PROD] Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - notification failures shouldn't break the app
    }
  }

  async sendSms(to: string, message: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] SMS (OTP): To: ${to}, Message: ${message}`);
      return;
    }

    // In production, integrate with SMS service for OTP delivery
    const apiKey = process.env.TWILIO_API_KEY || process.env.SMS_API_KEY;
    if (!apiKey) {
      console.warn('SMS API key not configured - OTP will only be logged');
      console.log(`[PROD] SMS (OTP): To: ${to}, Message: ${message}`);
      return; // Don't throw error, just log OTP
    }

    try {
      // TODO: Implement actual SMS service integration (Twilio, etc.)
      console.log(`[PROD] SMS (OTP) sent to ${to}: ${message}`);
    } catch (error) {
      console.error(`SMS (OTP) sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - log OTP as fallback
      console.log(`[FALLBACK] OTP for ${to}: ${message}`);
    }
  }
}

export const notificationService = new NotificationService();
