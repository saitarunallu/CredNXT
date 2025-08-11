import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { notificationService } from "./services/notification";
import { pdfService } from "./services/pdf";
import { reminderService } from "./services/reminder";
import {
  loginSchema, verifyOtpSchema, completeProfileSchema, demoRequestSchema,
  insertOfferSchema, insertPaymentSchema
} from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const clients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to parse JSON and authenticate
  const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const payload = authService.verifyToken(token);
      req.userId = payload.userId;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Demo request endpoint
  app.post('/api/demo-request', async (req: Request, res: Response) => {
    try {
      const data = demoRequestSchema.parse(req.body);
      
      // In a real app, this would save to database and send notifications
      console.log('Demo request received:', data);
      
      // Send notification email
      await notificationService.sendEmail(
        data.email,
        'Demo Request Received',
        `Thank you ${data.name}, we've received your demo request and will contact you soon.`
      );

      res.json({ success: true, message: 'Demo request submitted successfully' });
    } catch (error) {
      console.error('Demo request error:', error);
      res.status(400).json({ message: 'Invalid request data' });
    }
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { phone } = loginSchema.parse(req.body);
      
      const code = authService.generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtp(phone, code, expiresAt);
      
      // In development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${phone}: ${code}`);
      } else {
        await notificationService.sendSms(phone, `Your CredNXT OTP is: ${code}`);
      }

      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: 'Invalid phone number' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { phone, code } = verifyOtpSchema.parse(req.body);
      
      const isValid = await storage.verifyOtp(phone, code);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      let user = await storage.getUserByPhone(phone);
      if (!user) {
        user = await storage.createUser({ phone });
      }

      const token = authService.generateToken(user.id);
      
      res.json({ 
        success: true, 
        token, 
        user,
        requiresProfile: !user.name 
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post('/api/auth/complete-profile', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email } = completeProfileSchema.parse(req.body);
      
      const user = await storage.updateUser(req.userId!, { 
        name, 
        email,
        isVerified: true 
      });

      // User profile completed

      res.json({ success: true, user });
    } catch (error) {
      console.error('Profile completion error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User lookup route
  app.get('/api/users/check-phone', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { phone } = req.query;
      
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      
      const user = await storage.getUserByPhone(phone);
      
      if (user) {
        res.json({ exists: true, user: { id: user.id, name: user.name, phone: user.phone } });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error('Check phone error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Offers routes
  app.get('/api/offers', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const [sentOffers, receivedOffers] = await Promise.all([
        storage.getUserOffers(req.userId!),
        storage.getReceivedOffers(req.userId!)
      ]);
      
      res.json({ sentOffers, receivedOffers });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/offers/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOfferWithDetails(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      const payments = await storage.getOfferPayments(id);
      
      res.json({ offer, payments });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/offers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // First, handle the contact creation/lookup
      const { toUserPhone, toUserName, ...offerData } = req.body;
      
      // Check if recipient is a registered user
      let recipientUser = null;
      try {
        recipientUser = await storage.getUserByPhone(toUserPhone);
      } catch (error) {
        // User not found, that's fine
      }

      // Prepare offer data with direct user references
      const completeOfferData = {
        ...offerData,
        fromUserId: req.userId!,
        toUserPhone,
        toUserName,
        toUserId: recipientUser?.id || null
      };

      const parsedOfferData = insertOfferSchema.parse(completeOfferData);
      const offer = await storage.createOffer(parsedOfferData);
      
      // Get the user data for PDF generation
      const fromUser = await storage.getUser(req.userId!);
      if (!fromUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Generate PDF contract
      const pdfKey = await pdfService.generateContract(offer, fromUser);
      await storage.updateOffer(offer.id, { contractPdfKey: pdfKey });
      
      // Send notification to recipient if they're registered
      if (recipientUser) {
        await storage.createNotification({
          userId: recipientUser.id,
          offerId: offer.id,
          type: 'offer_received',
          title: 'New Offer Received',
          message: `You have received a new ${offer.offerType} offer for ₹${offer.amount}`
        });

        // Send WebSocket notification to recipient
        const recipientClient = clients.get(recipientUser.id);
        if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
          recipientClient.send(JSON.stringify({
            type: 'offer_received',
            offerId: offer.id,
            message: `New ${offer.offerType} offer for ₹${offer.amount}`
          }));
        }
      }

      // Always send notification to offer creator about their new offer
      const creatorClient = clients.get(req.userId!);
      if (creatorClient && creatorClient.readyState === WebSocket.OPEN) {
        creatorClient.send(JSON.stringify({
          type: 'offer_created',
          offerId: offer.id,
          message: `Your ${offer.offerType} offer for ₹${offer.amount} has been created`
        }));
      }

      res.json({ offer });
    } catch (error) {
      console.error('Create offer error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/offers/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const offer = await storage.updateOffer(id, { status });
      
      // Send notification to offer creator
      if (status === 'accepted' || status === 'declined') {
        await storage.createNotification({
          userId: offer.fromUserId,
          offerId: offer.id,
          type: status === 'accepted' ? 'offer_accepted' : 'offer_declined',
          title: `Offer ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your offer has been ${status}`
        });

        // Send WebSocket notification to offer creator
        const client = clients.get(offer.fromUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: `offer_${status}`,
            offerId: offer.id,
            message: `Your offer has been ${status}`
          }));
        }

        // Also send notification to offer recipient if they're connected
        if (offer.toUserId) {
          const recipientClient = clients.get(offer.toUserId);
          if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
            recipientClient.send(JSON.stringify({
              type: `offer_${status}`,
              offerId: offer.id,
              message: `You have ${status} an offer`
            }));
          }
        }
      }

      res.json({ offer });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Payments routes
  app.post('/api/payments', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      
      // Get offer to validate payment amount
      const offer = await storage.getOffer(paymentData.offerId);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Import calculation functions (dynamic import for server compatibility)
      const { validatePaymentAmount, calculateRepaymentSchedule, getNextPaymentInfo } = await import('@shared/calculations');
      
      // Get existing payments to calculate total paid
      const existingPayments = await storage.getOfferPayments(paymentData.offerId);
      const totalPaid = existingPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Calculate loan start date (should be from acceptance date, not creation date)
      const loanStartDate = offer.status === 'accepted' && offer.updatedAt !== offer.createdAt 
        ? new Date(offer.updatedAt)  // Use acceptance date
        : new Date(); // If somehow not accepted yet, use today

      // Skip strict validation for direct payments - allow any reasonable amount
      const paymentAmount = parseFloat(paymentData.amount);
      const remainingBalance = parseFloat(offer.amount) - totalPaid;
      
      if (paymentAmount <= 0) {
        return res.status(400).json({ 
          message: "Payment amount must be greater than zero"
        });
      }
      
      if (paymentAmount > remainingBalance) {
        return res.status(400).json({ 
          message: `Payment amount cannot exceed remaining balance of ₹${remainingBalance.toLocaleString()}`
        });
      }

      const payment = await storage.createPayment({
        ...paymentData,
        status: 'pending'
      });
      
      // Get offer details to send notification
      const offerForNotification = await storage.getOffer(payment.offerId);
      if (offerForNotification) {
        // Notify the lender about the payment submission
        await storage.createNotification({
          userId: offerForNotification.fromUserId,
          offerId: offerForNotification.id,
          type: 'payment_submitted',
          title: 'Payment Submitted',
          message: `Payment of ₹${payment.amount} submitted for approval`
        });

        // Send WebSocket notification to lender
        const client = clients.get(offerForNotification.fromUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'payment_submitted',
            offerId: offerForNotification.id,
            paymentId: payment.id,
            amount: payment.amount,
            message: `Payment of ₹${payment.amount} submitted for approval`
          }));
        }

        // Notify borrower that payment is submitted
        if (offerForNotification.toUserId && offerForNotification.toUserId !== offerForNotification.fromUserId) {
          await storage.createNotification({
            userId: offerForNotification.toUserId,
            offerId: offerForNotification.id,
            type: 'payment_submitted',
            title: 'Payment Submitted',
            message: `Your payment of ₹${payment.amount} has been submitted and is awaiting approval`
          });

          const payerClient = clients.get(offerForNotification.toUserId);
          if (payerClient && payerClient.readyState === WebSocket.OPEN) {
            payerClient.send(JSON.stringify({
              type: 'payment_submitted',
              offerId: offerForNotification.id,
              paymentId: payment.id,
              amount: payment.amount,
              message: `Your payment of ₹${payment.amount} has been submitted and is awaiting approval`
            }));
          }
        }
      }

      res.json({ payment });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(400).json({ message: 'Invalid payment data' });
    }
  });

  // Approve payment
  app.patch('/api/payments/:id/approve', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Get offer to verify permissions
      const offer = await storage.getOffer(payment.offerId);
      if (!offer || offer.fromUserId !== req.userId) {
        return res.status(403).json({ message: 'Unauthorized to approve this payment' });
      }

      // Update payment status to paid
      const updatedPayment = await storage.updatePayment(id, {
        status: 'paid',
        // Payment approved at this time
      });

      // Notify both users
      await storage.createNotification({
        userId: offer.fromUserId,
        offerId: offer.id,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `You approved payment of ₹${payment.amount}`
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'payment_approved',
          title: 'Payment Approved',
          message: `Your payment of ₹${payment.amount} has been approved`
        });

        const payerClient = clients.get(offer.toUserId);
        if (payerClient && payerClient.readyState === WebSocket.OPEN) {
          payerClient.send(JSON.stringify({
            type: 'payment_approved',
            offerId: offer.id,
            paymentId: payment.id,
            amount: payment.amount,
            message: `Your payment of ₹${payment.amount} has been approved`
          }));
        }
      }

      res.json({ payment: updatedPayment });
    } catch (error) {
      console.error('Approve payment error:', error);
      res.status(500).json({ message: 'Failed to approve payment' });
    }
  });

  // Reject payment
  app.patch('/api/payments/:id/reject', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Get offer to verify permissions
      const offer = await storage.getOffer(payment.offerId);
      if (!offer || offer.fromUserId !== req.userId) {
        return res.status(403).json({ message: 'Unauthorized to reject this payment' });
      }

      // Update payment status to rejected
      const updatedPayment = await storage.updatePayment(id, {
        status: 'rejected'
      });

      // Notify both users
      await storage.createNotification({
        userId: offer.fromUserId,
        offerId: offer.id,
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: `You rejected payment of ₹${payment.amount}${reason ? `: ${reason}` : ''}`
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'payment_rejected',
          title: 'Payment Rejected',
          message: `Your payment of ₹${payment.amount} was rejected${reason ? `: ${reason}` : ''}`
        });

        const payerClient = clients.get(offer.toUserId);
        if (payerClient && payerClient.readyState === WebSocket.OPEN) {
          payerClient.send(JSON.stringify({
            type: 'payment_rejected',
            offerId: offer.id,
            paymentId: payment.id,
            amount: payment.amount,
            message: `Your payment of ₹${payment.amount} was rejected${reason ? `: ${reason}` : ''}`
          }));
        }
      }

      res.json({ payment: updatedPayment });
    } catch (error) {
      console.error('Reject payment error:', error);
      res.status(500).json({ message: 'Failed to reject payment' });
    }
  });

  // Get repayment schedule for an offer
  app.get('/api/offers/:id/schedule', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Import calculation functions
      const { calculateRepaymentSchedule } = await import('@shared/calculations');
      
      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType,
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit,
        repaymentType: offer.repaymentType,
        repaymentFrequency: offer.repaymentFrequency || undefined,
        startDate: offer.startDate || new Date()
      };

      const schedule = calculateRepaymentSchedule(loanTerms);
      res.json({ schedule });
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({ message: 'Failed to calculate repayment schedule' });
    }
  });

  // Notifications routes
  app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.userId!);
      res.json({ notifications });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const [sentOffers, receivedOffers] = await Promise.all([
        storage.getUserOffers(req.userId!),
        storage.getReceivedOffers(req.userId!)
      ]);

      // Calculate stats based on the perspective of the current user
      let totalLent = 0;
      let totalBorrowed = 0;
      
      // For sent offers: 
      // - If offerType is 'lend', user is lending money
      // - If offerType is 'borrow', user is borrowing money
      sentOffers.forEach(item => {
        const amount = parseFloat(item.offer.amount || '0');
        if (item.offer.status === 'accepted') {
          if (item.offer.offerType === 'lend') {
            totalLent += amount;
          } else {
            totalBorrowed += amount;
          }
        }
      });
      
      // For received offers:
      // - If offerType is 'lend', someone wants to lend to user (user borrows)
      // - If offerType is 'borrow', someone wants to borrow from user (user lends)
      receivedOffers.forEach(item => {
        const amount = parseFloat(item.offer.amount || '0');
        if (item.offer.status === 'accepted') {
          if (item.offer.offerType === 'lend') {
            totalBorrowed += amount;
          } else {
            totalLent += amount;
          }
        }
      });

      const stats = {
        totalLent,
        totalBorrowed,
        activeOffers: [...sentOffers, ...receivedOffers].filter(item => item.offer.status === 'accepted').length,
        pendingOffers: [...sentOffers, ...receivedOffers].filter(item => item.offer.status === 'pending').length,
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PDF download - generates contract if it doesn't exist
  app.get('/api/offers/:id/contract', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      let contractKey = offer.contractPdfKey;

      // If no contract exists or file is missing, generate it
      if (!contractKey || !await pdfService.contractExists(contractKey)) {
        console.log(`Generating contract for offer ${offer.id}, current contractKey: ${contractKey}`);
        
        const fromUser = await storage.getUser(offer.fromUserId);
        if (!fromUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        console.log(`Found user for contract generation: ${fromUser.name} (${fromUser.phone})`);
        
        try {
          contractKey = await pdfService.generateContract(offer, fromUser);
          console.log(`Generated contract with key: ${contractKey}`);
          
          await storage.updateOffer(offer.id, { contractPdfKey: contractKey });
          console.log(`Updated offer with contract key`);
        } catch (genError) {
          console.error('Contract generation failed:', genError);
          return res.status(500).json({ message: 'Failed to generate contract' });
        }
      }

      const pdfBuffer = await pdfService.downloadContract(contractKey);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract-${offer.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Contract download error:', error);
      res.status(500).json({ message: 'Failed to generate or download contract' });
    }
  });

  // KFS download - generates KFS document if it doesn't exist
  app.get('/api/offers/:id/kfs', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      let kfsKey = offer.kfsPdfKey;

      // If no KFS exists or file is missing, generate it
      if (!kfsKey || !await pdfService.kfsExists(kfsKey)) {
        console.log(`Generating KFS for offer ${offer.id}, current kfsKey: ${kfsKey}`);
        
        const fromUser = await storage.getUser(offer.fromUserId);
        if (!fromUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        console.log(`Found user for KFS generation: ${fromUser.name} (${fromUser.phone})`);
        
        try {
          kfsKey = await pdfService.generateKFS(offer, fromUser);
          console.log(`Generated KFS with key: ${kfsKey}`);
          
          await storage.updateOffer(offer.id, { kfsPdfKey: kfsKey });
          console.log(`Updated offer with KFS key`);
        } catch (genError) {
          console.error('KFS generation failed:', genError);
          return res.status(500).json({ message: 'Failed to generate KFS document' });
        }
      }

      const pdfBuffer = await pdfService.downloadKFS(kfsKey);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="kfs-${offer.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('KFS download error:', error);
      res.status(500).json({ message: 'Failed to generate or download KFS document' });
    }
  });

  // Lender can allow/disallow partial payments
  app.patch('/api/offers/:id/allow-partial-payment', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { allowPartPayment } = req.body;
      
      const offer = await storage.getOffer(id);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Only the lender (offer creator) can modify this setting
      if (offer.fromUserId !== req.userId) {
        return res.status(403).json({ message: 'Only the lender can modify payment settings' });
      }

      const updatedOffer = await storage.updateOffer(id, { allowPartPayment });
      res.json({ offer: updatedOffer });
    } catch (error) {
      console.error('Update partial payment error:', error);
      res.status(500).json({ message: 'Failed to update payment settings' });
    }
  });

  // Lender can close the loan early
  app.patch('/api/offers/:id/close-loan', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const offer = await storage.getOffer(id);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Only the lender (offer creator) can close the loan
      if (offer.fromUserId !== req.userId) {
        return res.status(403).json({ message: 'Only the lender can close the loan' });
      }

      if (offer.status !== 'accepted') {
        return res.status(400).json({ message: 'Only accepted loans can be closed' });
      }

      const updatedOffer = await storage.updateOffer(id, { status: 'completed' });

      // Create notifications for both parties
      await storage.createNotification({
        userId: offer.fromUserId,
        offerId: offer.id,
        type: 'loan_closed',
        title: 'Loan Closed',
        message: `You closed the loan early${reason ? `: ${reason}` : ''}`
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'loan_closed',
          title: 'Loan Closed',
          message: `The loan has been closed by the lender${reason ? `: ${reason}` : ''}`
        });

        const borrowerClient = clients.get(offer.toUserId);
        if (borrowerClient && borrowerClient.readyState === WebSocket.OPEN) {
          borrowerClient.send(JSON.stringify({
            type: 'loan_closed',
            offerId: offer.id,
            message: `The loan has been closed by the lender${reason ? `: ${reason}` : ''}`
          }));
        }
      }

      res.json({ offer: updatedOffer });
    } catch (error) {
      console.error('Close loan error:', error);
      res.status(500).json({ message: 'Failed to close loan' });
    }
  });

  // Get payment schedule status
  app.get('/api/offers/:id/payment-status', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Import calculation functions
      const { calculateRepaymentSchedule, getPaymentStatus, getNextPaymentInfo } = await import('@shared/calculations');
      
      // Get all payments for this offer
      const payments = await storage.getOfferPayments(id);
      const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Calculate loan start date (should be from acceptance date, not creation date)
      const loanStartDate = offer.status === 'accepted' && offer.updatedAt !== offer.createdAt 
        ? new Date(offer.updatedAt)  // Use acceptance date
        : new Date(offer.createdAt); // Use creation date as fallback

      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType,
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit,
        repaymentType: offer.repaymentType,
        repaymentFrequency: offer.repaymentFrequency || undefined,
        startDate: loanStartDate
      };

      const paymentStatus = getPaymentStatus(loanTerms, totalPaid);
      const nextPayment = getNextPaymentInfo(loanTerms, totalPaid);
      const schedule = calculateRepaymentSchedule(loanTerms);

      res.json({
        paymentStatus,
        nextPayment,
        totalPaid,
        totalAmount: schedule.totalAmount,
        remainingAmount: schedule.totalAmount - totalPaid
      });
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({ message: 'Failed to get payment status' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.token) {
          try {
            const payload = authService.verifyToken(data.token);
            clients.set(payload.userId, ws);
            console.log(`User ${payload.userId} connected via WebSocket`);
            
            ws.send(JSON.stringify({ type: 'authenticated', success: true }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of Array.from(clients.entries())) {
        if (client === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected from WebSocket`);
          break;
        }
      }
    });
  });

  // Start reminder service
  reminderService.start();

  // Auto-cleanup pending payments after 24 hours
  const cleanupPendingPayments = async () => {
    try {
      // Use storage interface instead of direct database access
      const allPayments = await storage.getPayments();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const expiredPayments = allPayments.filter(payment => 
        payment.status === 'pending' && 
        new Date(payment.createdAt) < oneDayAgo
      );
      
      console.log(`Found ${expiredPayments.length} expired pending payments to cleanup`);
      
      // Remove expired pending payments
      for (const payment of expiredPayments) {
        await storage.deletePayment(payment.id);
        
        console.log(`Removed expired pending payment: ${payment.id} (₹${payment.amount})`);
        
        // Notify the borrower that payment was auto-removed
        const offer = await storage.getOffer(payment.offerId);
        if (offer && offer.toUserId) {
          await storage.createNotification({
            userId: offer.toUserId,
            offerId: offer.id,
            type: 'payment_rejected',
            title: 'Payment Expired',
            message: `Your payment of ₹${payment.amount} was automatically removed after 24 hours. You can submit a new payment.`
          });
          
          // Send WebSocket notification
          const userClient = clients.get(offer.toUserId);
          if (userClient && userClient.readyState === WebSocket.OPEN) {
            userClient.send(JSON.stringify({
              type: 'payment_expired',
              offerId: offer.id,
              paymentId: payment.id,
              amount: payment.amount,
              message: `Payment of ₹${payment.amount} was automatically removed. You can submit a new payment.`
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up pending payments:', error);
    }
  };

  // Run cleanup every hour
  setInterval(cleanupPendingPayments, 60 * 60 * 1000); // 1 hour
  // Run cleanup on startup
  cleanupPendingPayments();

  return httpServer;
}
