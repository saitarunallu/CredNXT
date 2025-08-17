export class NotificationService {
  /**
   * Email functionality removed - only used for Firebase Auth if configured
   * All app notifications are delivered via in-app notifications only
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[DISABLED] Email notifications are disabled - only in-app notifications are used`);
    console.log(`[DISABLED] Email would have been: To: ${to}, Subject: ${subject}`);
  }

  /**
   * SMS is ONLY used for OTP delivery during login/signup via Firebase Auth
   * All other notifications are delivered via in-app notifications only
   */
  async sendSms(to: string, message: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] SMS (OTP ONLY): To: ${to}, Message: ${message}`);
      return;
    }

    // In production, SMS integration is handled by Firebase Auth for OTP
    // This method should not be called for regular notifications
    console.warn('SMS service called - should only be used by Firebase Auth for OTP');
    console.log(`[OTP-ONLY] SMS: To: ${to}, Message: ${message}`);
  }
}

export const notificationService = new NotificationService();
