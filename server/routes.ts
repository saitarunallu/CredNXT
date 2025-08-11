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
  insertContactSchema, insertOfferSchema, insertPaymentSchema
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

      // Mark any contacts with this phone as verified
      if (user.phone) {
        await storage.markContactAsVerified(user.phone, user.id);
      }

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

  // Contacts routes
  app.get('/api/contacts', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const contacts = await storage.getUserContacts(req.userId!);
      res.json({ contacts });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

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

  app.post('/api/contacts', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        userId: req.userId!
      });
      
      const contact = await storage.createContact(contactData);
      res.json({ contact });
    } catch (error) {
      console.error('Create contact error:', error);
      res.status(400).json({ message: 'Invalid contact data' });
    }
  });

  app.post('/api/contacts/bulk', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { contacts: contactsData } = req.body;
      
      if (!Array.isArray(contactsData)) {
        return res.status(400).json({ message: 'Contacts must be an array' });
      }

      const parsedContacts = contactsData.map(contact => 
        insertContactSchema.parse({
          ...contact,
          userId: req.userId!
        })
      );
      
      const contacts = await storage.createContacts(parsedContacts);
      res.json({ contacts });
    } catch (error) {
      console.error('Bulk create contacts error:', error);
      res.status(400).json({ message: 'Invalid contacts data' });
    }
  });

  app.delete('/api/contacts/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContact(id);
      res.json({ success: true });
    } catch (error) {
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

      // Create or find contact for this user
      let contact = await storage.findContactByPhone(req.userId!, toUserPhone);
      if (!contact) {
        contact = await storage.createContact({
          userId: req.userId!,
          name: toUserName,
          phone: toUserPhone,
          verifiedUserId: recipientUser?.id || null
        });
      }

      // Prepare offer data with contact reference
      const completeOfferData = {
        ...offerData,
        fromUserId: req.userId!,
        toUserPhone,
        toUserName,
        toUserId: recipientUser?.id || null,
        toContactId: contact.id
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
      const { validatePaymentAmount, calculateRepaymentSchedule } = await import('@shared/calculations');
      
      // Get existing payments to calculate total paid
      const existingPayments = await storage.getOfferPayments(paymentData.offerId);
      const totalPaid = existingPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Validate payment amount against repayment schedule
      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType,
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit,
        repaymentType: offer.repaymentType,
        repaymentFrequency: offer.repaymentFrequency
      };

      const validation = validatePaymentAmount(loanTerms, totalPaid, parseFloat(paymentData.amount));
      
      if (!validation.isValid && offer.repaymentType === 'emi' && !offer.allowPartPayment) {
        return res.status(400).json({ 
          message: validation.message,
          expectedAmount: validation.expectedAmount
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
        paidAt: new Date()
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
        repaymentFrequency: offer.repaymentFrequency
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
      for (const [userId, client] of clients.entries()) {
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

  return httpServer;
}
