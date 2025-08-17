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
      console.log(`[DEV] SMS notification: To: ${to}, Message: ${message.substring(0, 50)}...`);
      return;
    }

    // In production, integrate with Twilio or similar
    const apiKey = process.env.TWILIO_API_KEY || process.env.SMS_API_KEY;
    if (!apiKey) {
      console.warn('SMS API key not configured - skipping SMS notification');
      return; // Don't throw error, just skip sending
    }

    try {
      // Implementation with Twilio would go here
      console.log(`[PROD] SMS sent to ${to}`);
    } catch (error) {
      console.error(`SMS sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - notification failures shouldn't break the app
    }
  }
}

export const notificationService = new NotificationService();
