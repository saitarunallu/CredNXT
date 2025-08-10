import type { Express } from "express";
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

interface AuthenticatedRequest extends Express.Request {
  userId?: string;
}

const clients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to parse JSON and authenticate
  const authenticate = async (req: AuthenticatedRequest, res: any, next: any) => {
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
  app.post('/api/demo-request', async (req, res) => {
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

  app.get('/api/contacts/check-phone', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { phone } = req.query;
      
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      
      const contact = await storage.findContactByPhone(req.userId!, phone);
      
      if (contact) {
        res.json({ exists: true, contact });
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

  app.post('/api/offers', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const offerData = insertOfferSchema.parse({
        ...req.body,
        fromUserId: req.userId!
      });
      
      const offer = await storage.createOffer(offerData);
      
      // Generate PDF contract
      const pdfKey = await pdfService.generateContract(offer);
      await storage.updateOffer(offer.id, { contractPdfKey: pdfKey });
      
      // Send notification to recipient
      const contact = await storage.getContact(offer.toContactId);
      if (contact?.verifiedUserId) {
        await storage.createNotification({
          userId: contact.verifiedUserId,
          offerId: offer.id,
          type: 'offer_received',
          title: 'New Offer Received',
          message: `You have received a new ${offer.offerType} offer for ₹${offer.amount}`
        });

        // Send WebSocket notification
        const client = clients.get(contact.verifiedUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'offer_received',
            offerId: offer.id,
            message: `New ${offer.offerType} offer for ₹${offer.amount}`
          }));
        }
      }

      res.json({ offer });
    } catch (error) {
      console.error('Create offer error:', error);
      res.status(400).json({ message: 'Invalid offer data' });
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

        // Send WebSocket notification
        const client = clients.get(offer.fromUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: `offer_${status}`,
            offerId: offer.id,
            message: `Your offer has been ${status}`
          }));
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
      const payment = await storage.createPayment(paymentData);
      
      // Get offer details to send notification
      const offer = await storage.getOffer(payment.offerId);
      if (offer) {
        await storage.createNotification({
          userId: offer.fromUserId,
          offerId: offer.id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of ₹${payment.amount} received`
        });

        // Send WebSocket notification
        const client = clients.get(offer.fromUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'payment_received',
            offerId: offer.id,
            amount: payment.amount,
            message: `Payment of ₹${payment.amount} received`
          }));
        }
      }

      res.json({ payment });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(400).json({ message: 'Invalid payment data' });
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

      const stats = {
        totalLent: sentOffers.reduce((sum, item) => sum + parseFloat(item.totalPaid || '0'), 0),
        totalBorrowed: receivedOffers.reduce((sum, item) => sum + parseFloat(item.totalPaid || '0'), 0),
        activeOffers: sentOffers.filter(item => item.offer.status === 'accepted').length,
        pendingOffers: sentOffers.filter(item => item.offer.status === 'pending').length,
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PDF download
  app.get('/api/offers/:id/contract', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer || !offer.contractPdfKey) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      const pdfBuffer = await pdfService.downloadContract(offer.contractPdfKey);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract-${offer.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
      for (const [userId, client] of clients) {
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
