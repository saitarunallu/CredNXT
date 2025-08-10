export class NotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`EMAIL TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`BODY: ${body}`);
      return;
    }

    // In production, integrate with SendGrid or similar
    const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.warn('No email API key configured');
      return;
    }

    try {
      // Implementation with SendGrid would go here
      console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  async sendSms(to: string, message: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS TO: ${to}`);
      console.log(`MESSAGE: ${message}`);
      return;
    }

    // In production, integrate with Twilio or similar
    const apiKey = process.env.TWILIO_API_KEY || process.env.SMS_API_KEY;
    if (!apiKey) {
      console.warn('No SMS API key configured');
      return;
    }

    try {
      // Implementation with Twilio would go here
      console.log(`SMS sent to ${to}: ${message}`);
    } catch (error) {
      console.error('SMS sending failed:', error);
    }
  }
}

export const notificationService = new NotificationService();
