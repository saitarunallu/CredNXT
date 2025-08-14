import { apiRequest } from './queryClient';

export interface SMSMessage {
  to: string;
  message: string;
  type?: 'verification' | 'notification' | 'reminder' | 'alert';
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
  cost?: string;
}

class SMSService {
  async sendSMS(params: SMSMessage): Promise<SMSResult> {
    try {
      const response = await apiRequest('POST', '/api/sms/send', params, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    try {
      const response = await apiRequest('POST', '/api/sms/send-verification', {
        phoneNumber,
        code
      });

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification SMS'
      };
    }
  }

  async sendPasswordResetCode(phoneNumber: string, code: string): Promise<SMSResult> {
    try {
      const response = await apiRequest('POST', '/api/sms/send-password-reset', {
        phoneNumber,
        code
      });

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send password reset SMS'
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const response = await apiRequest('GET', `/api/sms/status/${messageId}`, undefined, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      return await response.json();
    } catch (error: any) {
      return {
        status: 'unknown',
        error: error.message || 'Failed to check message status'
      };
    }
  }

  async getServiceStatus(): Promise<{ enabled: boolean; message: string }> {
    try {
      const response = await apiRequest('GET', '/api/sms/service-status');
      return await response.json();
    } catch (error: any) {
      return {
        enabled: false,
        message: 'Failed to check SMS service status'
      };
    }
  }
}

export const smsService = new SMSService();