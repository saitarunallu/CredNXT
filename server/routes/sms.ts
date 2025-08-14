import { Router } from 'express';
import { z } from 'zod';
import { smsService } from '../services/sms';
import { requireAuth } from '../middleware/auth';

const router = Router();

// SMS sending endpoint
const sendSMSSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1).max(1600, 'Message too long'),
  type: z.enum(['verification', 'notification', 'reminder', 'alert']).optional(),
});

router.post('/send', requireAuth, async (req, res) => {
  try {
    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.issues,
      });
    }

    const result = await smsService.sendSMS(validation.data);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('SMS send endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// SMS templates endpoint
router.post('/send-verification', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        error: 'Phone number and verification code are required',
      });
    }

    const result = await smsService.sendVerificationCode(phoneNumber, code);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Verification SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification SMS',
    });
  }
});

// Loan offer notification
router.post('/loan-offer', requireAuth, async (req, res) => {
  try {
    const { phoneNumber, amount, fromName } = req.body;
    
    if (!phoneNumber || !amount || !fromName) {
      return res.status(400).json({
        error: 'Phone number, amount, and sender name are required',
      });
    }

    const result = await smsService.sendLoanOfferNotification(phoneNumber, amount, fromName);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Loan offer SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send loan offer SMS',
    });
  }
});

// Payment reminder
router.post('/payment-reminder', requireAuth, async (req, res) => {
  try {
    const { phoneNumber, amount, dueDate } = req.body;
    
    if (!phoneNumber || !amount || !dueDate) {
      return res.status(400).json({
        error: 'Phone number, amount, and due date are required',
      });
    }

    const result = await smsService.sendPaymentReminder(phoneNumber, amount, dueDate);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Payment reminder SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send payment reminder SMS',
    });
  }
});

// SMS status check
router.get('/status/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await smsService.getMessageStatus(messageId);
    
    res.json(result);
  } catch (error: any) {
    console.error('SMS status check error:', error);
    res.status(500).json({
      error: 'Failed to check SMS status',
    });
  }
});

// SMS service status
router.get('/service-status', (req, res) => {
  res.json({
    enabled: smsService.isEnabled(),
    message: smsService.isEnabled() 
      ? 'Firebase SMS service is configured and ready'
      : 'SMS service not configured. Please set Firebase environment variables.',
  });
});

export { router as smsRouter };