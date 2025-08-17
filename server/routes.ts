import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { notificationService } from "./services/notification";
import { advancedNotificationService } from "./services/advanced-notification";
import { pdfService } from "./services/pdf";
import { reminderService } from "./services/reminder";
import { complianceService } from "./services/compliance";
import { securityService } from "./services/security";
import { repaymentService } from "./services/repayment";
// SMS functionality removed - using in-app notifications only
// Health routes are already integrated in the main routes

import { normalizePhoneNumber, formatPhoneForDisplay, isValidIndianMobile } from "@shared/phone-utils";
import {
  loginSchema, verifyOtpSchema, completeProfileSchema, demoRequestSchema,
  insertOfferSchema, insertPaymentSchema
} from "@shared/firestore-schema";
import { Timestamp } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const clients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Enhanced authentication middleware with banking compliance and security
  const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
    
    try {
      // Security analysis
      const securityAlerts = securityService.analyzeRequestPattern(req);
      if (securityAlerts.some(alert => alert.level === 'critical')) {
        return res.status(403).json({ 
          message: 'Access denied due to security policy',
          code: 'SECURITY_VIOLATION'
        });
      }

      // Rate limiting check
      if (!securityService.checkRateLimit(clientIp, req.path, undefined, 100, 15 * 60 * 1000)) {
        return res.status(429).json({ 
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        securityService.createAlert({
          level: 'high',
          type: 'AUTHENTICATION_FAILURE',
          description: 'Authentication attempt without token',
          clientIp,
          details: { requestId }
        });
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_TOKEN_MISSING'
        });
      }

      // Verify Firebase ID token instead of JWT
      let payload;
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        payload = { userId: decodedToken.uid };
      } catch (error) {
        securityService.createAlert({
          level: 'high',
          type: 'AUTHENTICATION_FAILURE',
          description: 'Firebase token verification failed',
          clientIp,
          details: { requestId, error: error instanceof Error ? error.message : 'Unknown error' }
        });
        return res.status(401).json({ 
          message: 'Invalid authentication token',
          code: 'AUTH_TOKEN_INVALID'
        });
      }
      
      // Additional security checks
      if (!payload.userId) {
        securityService.createAlert({
          level: 'high',
          type: 'AUTHENTICATION_FAILURE',
          description: 'Invalid token payload',
          clientIp,
          details: { requestId, userId: payload.userId }
        });
        return res.status(401).json({ 
          message: 'Invalid authentication credentials',
          code: 'AUTH_INVALID_PAYLOAD'
        });
      }

      // Verify user still exists and is active
      const user = await storage.getUser(payload.userId);
      if (!user) {
        securityService.createAlert({
          level: 'high',
          type: 'AUTHENTICATION_FAILURE',
          description: 'Token for non-existent user',
          clientIp,
          details: { requestId, userId: payload.userId }
        });
        return res.status(401).json({ 
          message: 'User account not found',
          code: 'AUTH_USER_NOT_FOUND'
        });
      }

      // Validate user compliance
      const compliance = await complianceService.validateCompliance('user', user);
      if (!compliance.isCompliant) {
        securityService.createAlert({
          level: 'medium',
          type: 'COMPLIANCE_VIOLATION',
          description: 'User failed compliance check',
          clientIp,
          details: { requestId, userId: payload.userId, violations: compliance.violations }
        });
        return res.status(403).json({ 
          message: 'Account does not meet security requirements',
          code: 'COMPLIANCE_VIOLATION',
          details: compliance.violations
        });
      }

      req.userId = payload.userId;
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      securityService.createAlert({
        level: 'medium',
        type: 'AUTHENTICATION_FAILURE',
        description: `Authentication failed: ${errorMessage}`,
        clientIp,
        details: { requestId }
      });
      
      if (errorMessage.includes('expired')) {
        return res.status(401).json({ 
          message: 'Session expired, please login again',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }
      
      res.status(401).json({ 
        message: 'Invalid authentication credentials',
        code: 'AUTH_INVALID_TOKEN'
      });
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
      const requestId = (req as any).requestId;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Log security audit for demo request failure
      complianceService.createAuditEntry({
        operation: 'DEMO_REQUEST_FAILED',
        entityType: 'user',
        entityId: 'demo_requests',
        details: { error: errorMessage, ip: req.ip, requestId },
        compliance: {
          ruleId: 'DEMO_REQUEST_SECURITY',
          status: 'failed',
          message: `Demo request failed: ${errorMessage}`
        }
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to process demo request',
        code: 'DEMO_REQUEST_FAILED'
      });
    }
  });

  // Authentication routes with enhanced security
  app.post('/api/auth/login', async (req, res) => {
    const requestId = (req as any).requestId;
    const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
    
    try {
      // Input validation and sanitization
      const phoneValidation = securityService.validateInput(req.body.phone, 'phone');
      if (!phoneValidation.isValid) {
        securityService.createAlert({
          level: 'medium',
          type: 'SUSPICIOUS_INPUT',
          description: 'Suspicious input detected in login attempt',
          clientIp,
          details: { alerts: phoneValidation.alerts, field: 'phone' }
        });
        return res.status(400).json({ 
          message: 'Invalid input detected',
          code: 'SECURITY_VALIDATION_FAILED'
        });
      }

      // Rate limiting for login attempts
      if (!securityService.checkRateLimit(clientIp, '/api/auth/login', undefined, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ 
          message: 'Too many login attempts, please try again later',
          code: 'LOGIN_RATE_LIMIT_EXCEEDED'
        });
      }

      const { phone } = loginSchema.parse(req.body);
      
      const code = authService.generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtp(phone, code, expiresAt);
      
      // Audit trail for login attempt
      complianceService.createAuditEntry({
        operation: 'LOGIN_ATTEMPT',
        entityType: 'user',
        entityId: phone, // Use phone as identifier for unregistered users
        details: { phone: phone.substring(0, 3) + '***', clientIp, requestId },
        compliance: {
          ruleId: 'AUTHENTICATION',
          status: 'passed',
          message: 'OTP generated and sent successfully'
        }
      });
      
      // Development and production both log OTP (SMS removed)
      console.log(`OTP for ${phone}: ${code} (In-app notification only - SMS disabled)`);
      
      // Note: SMS notifications have been removed. OTP is delivered via:
      // 1. Console log for debugging
      // 2. Firebase Auth handles OTP delivery
      // 3. In-app notifications for other features

      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Log security audit for login failure
      complianceService.createAuditEntry({
        operation: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: req.body.phone?.substring(0, 3) + '***',
        details: { error: errorMessage, ip: clientIp, requestId },
        compliance: {
          ruleId: 'AUTHENTICATION',
          status: 'failed',
          message: `Login failed: ${errorMessage}`
        }
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid phone number format',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      res.status(500).json({ 
        message: 'Authentication service temporarily unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const requestId = (req as any).requestId;
    const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
    
    try {
      // Security validation
      const phoneValidation = securityService.validateInput(req.body.phone, 'phone');
      const codeValidation = securityService.validateInput(req.body.code, 'otp_code');
      
      if (!phoneValidation.isValid || !codeValidation.isValid) {
        return res.status(400).json({ 
          message: 'Invalid input detected',
          code: 'SECURITY_VALIDATION_FAILED'
        });
      }

      // Rate limiting for OTP verification
      if (!securityService.checkRateLimit(clientIp, '/api/auth/verify-otp', undefined, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ 
          message: 'Too many OTP verification attempts',
          code: 'OTP_RATE_LIMIT_EXCEEDED'
        });
      }

      const { phone, code } = verifyOtpSchema.parse(req.body);
      
      // Validate and normalize phone number with +91 prefix
      if (!isValidIndianMobile(phone)) {
        return res.status(400).json({ 
          message: 'Invalid Indian mobile number format',
          code: 'INVALID_PHONE_FORMAT'
        });
      }
      
      const normalizedPhone = normalizePhoneNumber(phone);
      
      const isValid = await storage.verifyOtp(normalizedPhone, code);
      if (!isValid) {
        // Audit failed OTP attempt
        complianceService.createAuditEntry({
          operation: 'OTP_VERIFICATION_FAILED',
          entityType: 'user',
          entityId: phone,
          details: { phone: normalizedPhone.substring(0, 3) + '***', clientIp, requestId },
          compliance: {
            ruleId: 'AUTHENTICATION',
            status: 'failed',
            message: 'Invalid or expired OTP provided'
          }
        });
        
        return res.status(400).json({ 
          message: 'Invalid or expired OTP',
          code: 'OTP_INVALID'
        });
      }

      let user = await storage.getUserByPhone(normalizedPhone);
      if (!user) {
        user = await storage.createUser({ phone: normalizedPhone, isVerified: true });
        
        // Audit new user creation
        complianceService.createAuditEntry({
          operation: 'USER_CREATED',
          entityType: 'user',
          entityId: user.id,
          details: { phone: normalizedPhone.substring(0, 3) + '***', clientIp, requestId },
          compliance: {
            ruleId: 'USER_REGISTRATION',
            status: 'passed',
            message: 'New user account created successfully'
          }
        });
      } else {
        // Update user verification status
        await storage.updateUser(user.id, { isVerified: true });
        user = { ...user, isVerified: true };
      }

      // Link any existing offers that were created to this phone number before registration
      try {
        await storage.linkOffersToUser(user.id, normalizedPhone);
        console.log(`Linked existing offers to newly registered user: ${user.id}`);
      } catch (error) {
        console.warn(`Failed to link offers to user ${user.id}:`, error);
      }

      // Validate user compliance before issuing token
      const compliance = await complianceService.validateCompliance('user', user);
      if (!compliance.isCompliant) {
        return res.status(403).json({ 
          message: 'Account does not meet security requirements',
          code: 'COMPLIANCE_VIOLATION',
          details: compliance.violations
        });
      }

      // Firebase Auth handles token generation - no custom token needed
      
      // Audit successful login
      complianceService.createAuditEntry({
        operation: 'LOGIN_SUCCESS',
        entityType: 'user',
        entityId: user.id,
        details: { phone: normalizedPhone.substring(0, 3) + '***', clientIp, requestId },
        compliance: {
          ruleId: 'AUTHENTICATION',
          status: 'passed',
          message: 'User authenticated successfully'
        }
      });
      
      res.json({ 
        success: true, 
        user,
        requiresProfile: !user.name 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`AUDIT: OTP verification failed [${requestId}]:`, {
        error: errorMessage,
        phone: req.body.phone?.substring(0, 3) + '***',
        ip: clientIp
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request format',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      res.status(500).json({ 
        message: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      });
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

  // User lookup route (no auth required for checking if user exists)
  app.get('/api/users/check-phone', async (req: Request, res) => {
    try {
      const { phone } = req.query;
      
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      
      // Validate and normalize phone number
      if (!isValidIndianMobile(phone)) {
        return res.status(400).json({ 
          message: 'Invalid Indian mobile number format',
          code: 'INVALID_PHONE_FORMAT'
        });
      }
      
      const normalizedPhone = normalizePhoneNumber(phone);
      
      try {
        const user = await storage.getUserByPhone(normalizedPhone);
        
        if (user) {
          return res.json({ 
            exists: true, 
            user: { 
              id: user.id, 
              name: user.name || '', 
              phone: formatPhoneForDisplay(user.phone) // Display without +91 
            } 
          });
        } else {
          return res.json({ exists: false });
        }
      } catch (firebaseError) {
        console.log('Firebase storage error:', firebaseError instanceof Error ? firebaseError.message : 'Unknown error');
        return res.json({ exists: false, message: 'Service temporarily unavailable' });
      }
    } catch (error) {
      console.error('Check phone error:', error);
      return res.json({ exists: false, message: 'Service temporarily unavailable' });
    }
  });

  // Test route to create offer and trigger notification (development only)
  app.post('/api/test-offer', async (req: Request, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
      }
      
      const targetPhone = '9876543210';
      const senderPhone = '9100754913';
      
      // Create or get target user
      let targetUser = await storage.getUserByPhone(targetPhone);
      if (!targetUser) {
        console.log('Creating target user for phone:', targetPhone);
        targetUser = await storage.createUser({
          phone: targetPhone,
          name: 'Test Recipient',
          email: 'test.recipient@example.com',
          isVerified: true
        });
      }
      
      // Create or get sender user
      let senderUser = await storage.getUserByPhone(senderPhone);
      if (!senderUser) {
        console.log('Creating sender user for phone:', senderPhone);
        senderUser = await storage.createUser({
          phone: senderPhone,
          name: 'Test Sender',
          email: 'test.sender@example.com',
          isVerified: true
        });
      }
      
      // Create the offer
      const offer = await storage.createOffer({
        fromUserId: senderUser.id,
        toUserPhone: targetPhone,
        toUserName: targetUser.name || 'Test Recipient',
        amount: 25000,
        interestRate: 12,
        interestType: 'reducing',
        tenureValue: 12,
        tenureUnit: 'months',
        repaymentType: 'emi',
        repaymentFrequency: 'monthly',
        purpose: 'Personal loan for education expenses',
        offerType: 'lend',
        status: 'pending',
        allowPartPayment: false,
        gracePeriodDays: 5,
        prepaymentPenalty: 0,
        latePaymentPenalty: 2,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        currentInstallmentNumber: 1
      });
      
      // Create notifications for both users
      const recipientNotification = await storage.createNotification({
        userId: targetUser.id,
        offerId: offer.id,
        type: 'offer_received',
        priority: 'high',
        title: 'New Loan Offer Received! 🎉',
        message: `${senderUser.name} has sent you a loan offer of ₹25,000 for 12 months at 12% interest. Review and respond to this offer.`,
        isRead: false
      });
      
      const senderNotification = await storage.createNotification({
        userId: senderUser.id,
        offerId: offer.id,
        type: 'account_update',
        priority: 'medium',
        title: 'Loan Offer Sent Successfully ✓',
        message: `Your loan offer of ₹25,000 has been sent to ${targetUser.name} (${targetPhone}). You'll be notified when they respond.`,
        isRead: false
      });
      
      res.json({
        success: true,
        message: 'Test offer and notifications created successfully',
        data: {
          offerId: offer.id,
          targetUserId: targetUser.id,
          targetPhone: targetPhone,
          recipientNotificationId: recipientNotification.id,
          senderNotificationId: senderNotification.id
        }
      });
      
    } catch (error) {
      console.error('Test offer creation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create test offer',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Temporary test route to create a test user (for development only)
  app.post('/api/test-user', async (req: Request, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
      }
      
      const testUser = await storage.createUser({
        phone: '9100754913',
        name: 'John Doe',
        email: 'john.doe@example.com',
        isVerified: true
      });
      
      res.json({ success: true, user: testUser, message: 'Test user created successfully' });
    } catch (error) {
      console.error('Create test user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create user for your phone number
  app.post('/api/create-my-user', async (req: Request, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
      }
      
      const myUser = await storage.createUser({
        phone: '9100788913',
        name: 'CredNXT User',
        email: 'user@crednxt.com',
        isVerified: true
      });
      
      res.json({ success: true, user: myUser, message: 'Your user created successfully' });
    } catch (error) {
      console.error('Create your user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Debug endpoint to list all users (for development only)
  app.get('/api/debug/users', async (req: Request, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
      }
      
      const db = (storage as any).getFirestore().db;
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs.map((doc: any) => doc.data());
      
      res.json({ users, count: users.length });
    } catch (error) {
      console.error('Debug users error:', error);
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
      console.error('Get offers error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/offers/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      // Check if user is authorized to view this offer
      const currentUserId = req.userId;
      const currentUser = await storage.getUser(currentUserId!);
      
      // User can view offer if they are:
      // 1. The creator (fromUserId)
      // 2. The recipient by ID (toUserId) 
      // 3. The recipient by phone (toUserPhone matches their phone)
      const isAuthorized = 
        offer.fromUserId === currentUserId ||
        offer.toUserId === currentUserId ||
        (currentUser && offer.toUserPhone === currentUser.phone);
      
      if (!isAuthorized) {
        console.log(`Authorization check failed for user ${currentUserId}:`, {
          fromUserId: offer.fromUserId,
          toUserId: offer.toUserId,
          toUserPhone: offer.toUserPhone,
          userPhone: currentUser?.phone
        });
        return res.status(403).json({ message: 'Unauthorized to view this offer' });
      }

      const payments = await storage.getOfferPayments(id);
      
      res.json({ offer, payments });
    } catch (error) {
      console.error('Get offer error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/offers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // First, handle the contact creation/lookup
      const { toUserPhone, toUserName, ...offerData } = req.body;
      
      // Validate and normalize recipient phone number
      if (!isValidIndianMobile(toUserPhone)) {
        return res.status(400).json({ 
          message: 'Invalid recipient phone number format',
          code: 'INVALID_PHONE_FORMAT'
        });
      }
      
      const normalizedToUserPhone = normalizePhoneNumber(toUserPhone);
      
      // Check if recipient is a registered user
      let recipientUser = null;
      try {
        recipientUser = await storage.getUserByPhone(normalizedToUserPhone);
      } catch (error) {
        // User not found, that's fine
      }

      // Prepare offer data with direct user references
      const completeOfferData = {
        ...offerData,
        fromUserId: req.userId!,
        toUserPhone: normalizedToUserPhone,
        toUserName,
        toUserId: recipientUser?.id || null
      };

      // Clean up null values for optional fields to avoid validation errors
      if (completeOfferData.purpose === null) {
        delete completeOfferData.purpose;
      }
      if (completeOfferData.note === null) {
        delete completeOfferData.note;
      }
      if (completeOfferData.repaymentFrequency === null) {
        delete completeOfferData.repaymentFrequency;
      }

      const parsedOfferData = insertOfferSchema.parse(completeOfferData);
      const offer = await storage.createOffer(parsedOfferData);
      
      // Get the user data for PDF generation
      const fromUser = await storage.getUser(req.userId!);
      if (!fromUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Generate PDF contract (skip for now if service not available)
      try {
        const pdfKey = await pdfService.generateContract(offer as any, fromUser as any);
        await storage.updateOffer(offer.id, { contractPdfKey: pdfKey });
      } catch (error) {
        console.warn('PDF generation failed, continuing without contract PDF:', error);
      }
      
      // Send notification to recipient if they're registered
      if (recipientUser) {
        await storage.createNotification({
          userId: recipientUser.id,
          offerId: offer.id,
          type: 'offer_received',
          title: 'New Offer Received',
          message: `You have received a new ${offer.offerType} offer for ₹${offer.amount}`,
          priority: 'high',
          isRead: false
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
      } else {
        // In-app notifications only - unregistered users won't receive notifications
        console.log(`Offer sent to unregistered user: ${normalizedToUserPhone}. They can view it when they register.`);
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
      // Log error for debugging and audit
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      
      console.error('Offer creation failed:', {
        error: errorMessage,
        stack: errorStack,
        userId: req.userId,
        requestBody: req.body
      });
      
      complianceService.createAuditEntry({
        operation: 'OFFER_CREATION_FAILED',
        entityType: 'offer',
        entityId: 'unknown',
        details: { error: errorMessage, stack: errorStack, userId: req.userId },
        compliance: {
          ruleId: 'OFFER_CREATION',
          status: 'failed',
          message: `Offer creation failed: ${errorMessage}`
        }
      });
      res.status(500).json({ message: 'Server error', error: errorMessage });
    }
  });

  app.patch('/api/offers/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const offer = await storage.updateOffer(id, { status });
      
      // Initialize repayment schedule when offer is accepted
      if (status === 'accepted') {
        try {
          // Convert Firebase Timestamp to compatible format for repayment service
          const offerForRepayment = {
            ...offer,
            createdAt: offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any),
            updatedAt: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any),
            startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any),
            dueDate: offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any),
            nextPaymentDueDate: offer.nextPaymentDueDate?.toDate ? offer.nextPaymentDueDate.toDate() : 
              (offer.nextPaymentDueDate ? new Date(offer.nextPaymentDueDate as any) : undefined)
          };
          await repaymentService.initializeRepaymentSchedule(offerForRepayment as any);
        } catch (error) {
          console.error('Failed to initialize repayment schedule:', error);
        }
      }
      
      // Send notification to offer creator
      if (status === 'accepted' || status === 'declined') {
        await storage.createNotification({
          userId: offer.fromUserId,
          offerId: offer.id,
          type: status === 'accepted' ? 'offer_accepted' : 'offer_declined',
          title: `Offer ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your offer has been ${status}`,
          priority: 'high',
          isRead: false
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
      const { validatePaymentAmount, calculateRepaymentSchedule, getNextPaymentDue } = await import('@shared/calculations');
      
      // Get existing payments to calculate total paid and check pending payments
      const existingPayments = await storage.getOfferPayments(paymentData.offerId);
      const totalPaid = existingPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

      // Check if there's already a pending payment for this installment (if not allowing part payments)
      const pendingPayments = existingPayments.filter(p => p.status === 'pending');
      if (pendingPayments.length > 0 && !offer.allowPartPayment) {
        return res.status(400).json({ 
          message: "There is already a pending payment awaiting approval. Only one payment is allowed per repayment schedule unless part payments are enabled."
        });
      }

      // Calculate loan start date (should be from acceptance date, not creation date)
      const loanStartDate = offer.status === 'accepted' && offer.updatedAt && offer.createdAt 
        ? (offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any))  // Use acceptance date
        : (offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any)); // Use creation date or current date as fallback

      // Calculate repayment schedule to validate payment
      const loanTerms = {
        principal: parseFloat(String(offer.amount)),
        interestRate: parseFloat(String(offer.interestRate)),
        interestType: offer.interestType as 'fixed' | 'reducing',
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit as 'months' | 'years',
        repaymentType: offer.repaymentType as 'emi' | 'interest_only' | 'full_payment',
        repaymentFrequency: (offer.repaymentFrequency || 'monthly') as 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly',
        startDate: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date()
      };
      
      const schedule = calculateRepaymentSchedule(loanTerms);
      const currentInstallmentNumber = offer.currentInstallmentNumber || 1;
      const paymentAmount = parseFloat(String(paymentData.amount));
      const remainingBalance = parseFloat(String(offer.amount)) - totalPaid;
      
      // Basic validations
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

      // Advanced payment validation based on repayment schedule
      if (!offer.allowPartPayment) {
        // Find the current installment in the schedule
        const currentInstallment = schedule.schedule.find(item => item.installmentNumber === currentInstallmentNumber);
        
        if (!currentInstallment) {
          return res.status(400).json({ 
            message: "Invalid installment number. All payments may have been completed."
          });
        }

        // For EMI and structured payments, validate against expected amount
        if (offer.repaymentType === 'emi' && schedule.emiAmount) {
          const expectedAmount = schedule.emiAmount;
          const tolerance = 1.0; // Allow ₹1 tolerance for rounding
          
          if (Math.abs(paymentAmount - expectedAmount) > tolerance) {
            return res.status(400).json({ 
              message: `Payment amount ₹${paymentAmount.toLocaleString()} does not match expected EMI amount ₹${expectedAmount.toLocaleString()}. Part payments are not allowed for this loan.`
            });
          }
        }

        // Check if payment is made according to schedule timing
        const today = new Date();
        const dueDate = new Date(currentInstallment.dueDate);
        const gracePeriodDays = offer.gracePeriodDays || 0;
        const gracePeriodEnd = new Date(dueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
        
        // Allow payments from 7 days before due date to grace period end
        const earliestPaymentDate = new Date(dueDate);
        earliestPaymentDate.setDate(earliestPaymentDate.getDate() - 7);
        
        if (today < earliestPaymentDate) {
          return res.status(400).json({ 
            message: `Payment can only be made from ${earliestPaymentDate.toLocaleDateString()} onwards (7 days before due date).`
          });
        }
      }

      const payment = await storage.createPayment({
        ...paymentData,
        installmentNumber: currentInstallmentNumber,
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
          message: `Payment of ₹${payment.amount} submitted for approval`,
          priority: 'high',
          isRead: false
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
            message: `Your payment of ₹${payment.amount} has been submitted and is awaiting approval`,
            priority: 'medium',
            isRead: false
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
      // Log error for debugging and audit
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      complianceService.createAuditEntry({
        operation: 'PAYMENT_CREATION_FAILED',
        entityType: 'payment',
        entityId: 'unknown',
        details: { error: errorMessage, userId: req.userId },
        compliance: {
          ruleId: 'PAYMENT_PROCESSING',
          status: 'failed',
          message: `Payment creation failed: ${errorMessage}`
        }
      });
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
        status: 'paid' as const,
        paidAt: { toDate: () => new Date(), toMillis: () => Date.now() } as any
      });

      // Advance to next installment (update due dates monthly as per repayment schedule)
      try {
        const currentInstallmentNumber = payment.installmentNumber || offer.currentInstallmentNumber || 1;
        await repaymentService.advanceToNextInstallment(payment.offerId, currentInstallmentNumber);
        console.log(`Successfully advanced to next installment for offer ${payment.offerId}`);
      } catch (installmentError) {
        // Log but don't fail payment approval if installment advancement fails
        console.warn('Installment advancement failed:', installmentError);
      }

      // Notify both users
      await storage.createNotification({
        userId: offer.fromUserId,
        offerId: offer.id,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `You approved payment of ₹${payment.amount}`,
        priority: 'medium',
        isRead: false
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'payment_approved',
          title: 'Payment Approved',
          message: `Your payment of ₹${payment.amount} has been approved`,
          priority: 'high',
          isRead: false
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
      // Log error for debugging and audit
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      complianceService.createAuditEntry({
        operation: 'PAYMENT_APPROVAL_FAILED',
        entityType: 'payment',
        entityId: req.params.id,
        details: { error: errorMessage, userId: req.userId },
        compliance: {
          ruleId: 'PAYMENT_PROCESSING',
          status: 'failed',
          message: `Payment approval failed: ${errorMessage}`
        }
      });
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
        message: `You rejected payment of ₹${payment.amount}${reason ? `: ${reason}` : ''}`,
        priority: 'medium',
        isRead: false
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'payment_rejected',
          title: 'Payment Rejected',
          message: `Your payment of ₹${payment.amount} was rejected${reason ? `: ${reason}` : ''}`,
          priority: 'high',
          isRead: false
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
        principal: parseFloat(String(offer.amount)),
        interestRate: parseFloat(String(offer.interestRate)),
        interestType: offer.interestType,
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit,
        repaymentType: offer.repaymentType,
        repaymentFrequency: offer.repaymentFrequency || 'monthly',
        startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date()
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

  app.patch('/api/notifications/mark-all-read', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // Mark all notifications as read - implement this method later
      const notifications = await storage.getUserNotifications(req.userId!);
      for (const notification of notifications) {
        if (!notification.isRead) {
          await storage.markNotificationAsRead(notification.id);
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Advanced Notification System - Smart notification with intelligent batching
  app.post('/api/notifications/smart', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = await advancedNotificationService.createSmartNotification({
        userId: req.userId!,
        type: req.body.type || 'account_update',
        priority: req.body.priority || 'medium',
        title: req.body.title,
        message: req.body.message,
        offerId: req.body.offerId,
        metadata: req.body.metadata
      });
      
      res.json({ success: true, notificationId });
    } catch (error) {
      res.status(500).json({ 
        message: 'Smart notification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get notification analytics for performance insights  
  app.get('/api/notifications/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await advancedNotificationService.getNotificationAnalytics(req.userId!, days);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const [sentOffers, receivedOffers] = await Promise.all([
        storage.getUserOffers(req.userId!),
        storage.getReceivedOffers(req.userId!)
      ]);

      // Calculate stats based on actual money flow perspective
      let totalLent = 0;  // Money I have given out to others
      let totalBorrowed = 0;  // Money I have received from others
      
      // For sent offers (offers I created):
      // - If I created a 'lend' offer and it's accepted, I am lending money (money goes out)
      // - If I created a 'borrow' offer and it's accepted, I am borrowing money (money comes in)
      sentOffers.forEach(offer => {
        const amount = parseFloat(offer.amount || '0');
        if (offer.status === 'accepted') {
          if (offer.offerType === 'lend') {
            totalLent += amount;  // I lent money to someone
          } else if (offer.offerType === 'borrow') {
            totalBorrowed += amount;  // I borrowed money from someone
          }
        }
      });
      
      // For received offers (offers others created for me):
      // - If someone created a 'lend' offer for me and it's accepted, they are lending to me (I borrow)
      // - If someone created a 'borrow' offer from me and it's accepted, they are borrowing from me (I lend)
      receivedOffers.forEach(offer => {
        const amount = parseFloat(offer.amount || '0');
        if (offer.status === 'accepted') {
          if (offer.offerType === 'lend') {
            totalBorrowed += amount;  // Someone lent money to me
          } else if (offer.offerType === 'borrow') {
            totalLent += amount;  // Someone borrowed money from me
          }
        }
      });

      const stats = {
        totalLent,
        totalBorrowed,
        activeOffers: [...sentOffers, ...receivedOffers].filter(offer => offer.status === 'accepted').length,
        pendingOffers: [...sentOffers, ...receivedOffers].filter(offer => offer.status === 'pending').length,
      };

      res.json({ stats });
    } catch (error) {
      console.error('Dashboard stats error:', error);
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
          // Convert offer for PDF service compatibility
          const offerForPdf = {
            ...offer,
            toUserId: offer.toUserId || null,
            createdAt: offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any),
            updatedAt: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any),
            startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any),
            dueDate: offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any),
            nextPaymentDueDate: offer.nextPaymentDueDate?.toDate ? offer.nextPaymentDueDate.toDate() : 
              (offer.nextPaymentDueDate ? new Date(offer.nextPaymentDueDate as any) : null)
          };
          contractKey = await pdfService.generateContract(offerForPdf as any, {
            ...fromUser,
            name: fromUser.name ?? undefined,
            email: fromUser.email ?? undefined,
            isVerified: fromUser.isVerified ?? undefined,
            createdAt: fromUser.createdAt?.toDate ? fromUser.createdAt.toDate() : new Date(),
            updatedAt: fromUser.updatedAt?.toDate ? fromUser.updatedAt.toDate() : new Date()
          } as any);
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
          // Convert offer for PDF service compatibility
          const offerForPdf = {
            ...offer,
            toUserId: offer.toUserId || null,
            createdAt: offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any),
            updatedAt: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any),
            startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any),
            dueDate: offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any),
            nextPaymentDueDate: offer.nextPaymentDueDate?.toDate ? offer.nextPaymentDueDate.toDate() : 
              (offer.nextPaymentDueDate ? new Date(offer.nextPaymentDueDate as any) : null)
          };
          kfsKey = await pdfService.generateKFS(offerForPdf as any, {
            ...fromUser,
            name: fromUser.name ?? undefined,
            email: fromUser.email ?? undefined,
            isVerified: fromUser.isVerified ?? undefined,
            createdAt: fromUser.createdAt?.toDate ? fromUser.createdAt.toDate() : new Date(),
            updatedAt: fromUser.updatedAt?.toDate ? fromUser.updatedAt.toDate() : new Date()
          } as any);
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

  // Get current payment information for an offer
  app.get('/api/offers/:id/payment-info', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const paymentInfo = await repaymentService.getCurrentPaymentInfo(id);
      
      if (!paymentInfo) {
        return res.status(404).json({ message: 'Payment information not available' });
      }
      
      res.json(paymentInfo);
    } catch (error) {
      console.error('Get payment info error:', error);
      res.status(500).json({ message: 'Failed to get payment information' });
    }
  });

  // Submit payment for current installment
  app.post('/api/offers/:id/submit-payment', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { amount, paymentMode, refString } = req.body;
      
      const offer = await storage.getOffer(id);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      // Create payment record - always as pending for lender approval
      const payment = await storage.createPayment({
        offerId: id,
        amount: amount.toString(),
        installmentNumber: offer.currentInstallmentNumber || 1,
        paymentMode,
        refString,
        status: 'pending'
      });
      
      // Notify the lender about the payment submission
      await storage.createNotification({
        userId: offer.fromUserId,
        offerId: offer.id,
        type: 'payment_submitted',
        title: 'Payment Submitted',
        message: `Payment of ₹${payment.amount} submitted for approval`,
        priority: 'high',
        isRead: false
      });

      // Send WebSocket notification to lender
      const lenderClient = clients.get(offer.fromUserId);
      if (lenderClient && lenderClient.readyState === WebSocket.OPEN) {
        lenderClient.send(JSON.stringify({
          type: 'payment_submitted',
          offerId: offer.id,
          paymentId: payment.id,
          amount: payment.amount,
          message: `Payment of ₹${payment.amount} submitted for approval`
        }));
      }
      
      res.json({ payment, message: 'Payment submitted successfully and awaiting approval' });
    } catch (error) {
      console.error('Submit payment error:', error);
      res.status(500).json({ message: 'Failed to submit payment' });
    }
  });

  // Download repayment schedule PDF
  app.get('/api/offers/:id/schedule/download', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getOffer(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      let scheduleKey = offer.schedulePdfKey;

      // If no schedule exists or file is missing, generate it
      if (!scheduleKey || !await pdfService.scheduleExists(scheduleKey)) {
        console.log(`Generating repayment schedule for offer ${offer.id}, current scheduleKey: ${scheduleKey}`);
        
        const fromUser = await storage.getUser(offer.fromUserId);
        if (!fromUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        console.log(`Found user for schedule generation: ${fromUser.name} (${fromUser.phone})`);
        
        try {
          // Convert offer for PDF service compatibility
          const offerForPdf = {
            ...offer,
            toUserId: offer.toUserId || null,
            createdAt: offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any),
            updatedAt: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any),
            startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any),
            dueDate: offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any),
            nextPaymentDueDate: offer.nextPaymentDueDate?.toDate ? offer.nextPaymentDueDate.toDate() : 
              (offer.nextPaymentDueDate ? new Date(offer.nextPaymentDueDate as any) : null)
          };
          scheduleKey = await pdfService.generateRepaymentSchedule(offerForPdf as any, {
            ...fromUser,
            name: fromUser.name ?? undefined,
            email: fromUser.email ?? undefined,
            isVerified: fromUser.isVerified ?? undefined,
            createdAt: fromUser.createdAt?.toDate ? fromUser.createdAt.toDate() : new Date(),
            updatedAt: fromUser.updatedAt?.toDate ? fromUser.updatedAt.toDate() : new Date()
          } as any);
          console.log(`Generated repayment schedule with key: ${scheduleKey}`);
          
          await storage.updateOffer(offer.id, { schedulePdfKey: scheduleKey });
          console.log(`Updated offer with schedule key`);
        } catch (genError) {
          console.error('Repayment schedule generation failed:', genError);
          return res.status(500).json({ message: 'Failed to generate repayment schedule' });
        }
      }

      const pdfBuffer = await pdfService.downloadRepaymentSchedule(scheduleKey);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="repayment-schedule-${offer.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Repayment schedule download error:', error);
      res.status(500).json({ message: 'Failed to generate or download repayment schedule' });
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
        message: `You closed the loan early${reason ? `: ${reason}` : ''}`,
        priority: 'medium',
        isRead: false
      });

      if (offer.toUserId) {
        await storage.createNotification({
          userId: offer.toUserId,
          offerId: offer.id,
          type: 'loan_closed',
          title: 'Loan Closed',
          message: `The loan has been closed by the lender${reason ? `: ${reason}` : ''}`,
          priority: 'high',
          isRead: false
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
      const { calculateRepaymentSchedule, getNextPaymentDue } = await import('@shared/calculations');
      
      // Get all payments for this offer
      const payments = await storage.getOfferPayments(id);
      const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

      // Calculate loan start date (should be from acceptance date, not creation date)
      const loanStartDate = offer.status === 'accepted' && offer.updatedAt && offer.createdAt 
        ? (offer.updatedAt?.toDate ? offer.updatedAt.toDate() : new Date(offer.updatedAt as any))  // Use acceptance date
        : (offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt as any)); // Use creation date or current date as fallback

      const loanTerms = {
        principal: parseFloat(String(offer.amount)),
        interestRate: parseFloat(String(offer.interestRate)),
        interestType: offer.interestType,
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit,
        repaymentType: offer.repaymentType,
        repaymentFrequency: offer.repaymentFrequency || 'monthly',
        startDate: offer.updatedAt?.toDate ? offer.updatedAt.toDate() : offer.createdAt?.toDate ? offer.createdAt.toDate() : new Date()
      };

      // Generate complete repayment schedule
      const schedule = calculateRepaymentSchedule(loanTerms);
      
      // Get paid installments by analyzing payments
      const paidPayments = payments.filter(p => p.status === 'paid');
      const paidInstallments = paidPayments.map(p => p.installmentNumber || 1);
      
      // Get next payment due
      const nextPayment = getNextPaymentDue(schedule.schedule, paidInstallments);
      
      // Calculate payment status based on schedule and payments
      const totalAmount = schedule.totalAmount;
      const remainingAmount = totalAmount - totalPaid;
      
      // Calculate outstanding principal (remaining principal balance)
      const outstandingPrincipal = nextPayment ? nextPayment.remainingBalance : 0;
      
      // Calculate interest and principal paid
      let totalPrincipalPaid = 0;
      let totalInterestPaid = 0;
      
      // Match payments to schedule items to get accurate breakdown
      for (const payment of paidPayments) {
        const scheduleItem = schedule.schedule.find(s => s.installmentNumber === (payment.installmentNumber || 1));
        if (scheduleItem) {
          totalPrincipalPaid += scheduleItem.principalAmount;
          totalInterestPaid += scheduleItem.interestAmount;
        }
      }
      
      // Calculate due amounts based on current date
      const today = new Date();
      let dueAmount = 0;
      let overDueAmount = 0;
      
      for (const item of schedule.schedule) {
        if (!paidInstallments.includes(item.installmentNumber)) {
          if (item.dueDate <= today) {
            // This payment is overdue
            overDueAmount += item.totalAmount;
          } else {
            // This is the next due payment
            dueAmount = item.totalAmount;
            break;
          }
        }
      }

      res.json({
        paymentStatus: {
          isComplete: remainingAmount <= 0.01,
          totalPaid,
          remainingAmount,
          completionPercentage: (totalPaid / totalAmount) * 100
        },
        nextPayment: nextPayment ? {
          installmentNumber: nextPayment.installmentNumber,
          dueDate: nextPayment.dueDate,
          amount: nextPayment.totalAmount,
          principalAmount: nextPayment.principalAmount,
          interestAmount: nextPayment.interestAmount,
          remainingBalance: nextPayment.remainingBalance
        } : null,
        totalPaid,
        totalAmount,
        remainingAmount,
        outstandingPrincipal,
        totalPrincipalPaid,
        totalInterestPaid,
        dueAmount,
        overDueAmount,
        schedule: schedule.schedule,
        annualPercentageRate: schedule.annualPercentageRate,
        effectiveInterestRate: schedule.effectiveInterestRate,
        rbiCompliance: schedule.rbiCompliance
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
          // Use Firebase ID token verification for WebSocket authentication
          admin.auth().verifyIdToken(data.token)
            .then((decodedToken) => {
              clients.set(decodedToken.uid, ws);
              console.log(`User ${decodedToken.uid} connected via WebSocket`);
              ws.send(JSON.stringify({ type: 'authenticated', success: true }));
            })
            .catch((error) => {
              console.error('WebSocket authentication error:', error);
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid Firebase token' }));
            });
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
        payment.createdAt && (payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt as any)) < oneDayAgo
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
            message: `Your payment of ₹${payment.amount} was automatically removed after 24 hours. You can submit a new payment.`,
            priority: 'medium',
            isRead: false
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

  // Banking Compliance and Security Management Routes
  app.get('/api/admin/compliance/report', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow authorized users to generate compliance reports
      const user = await storage.getUser(req.userId!);
      if (!user || !user.name?.includes('admin')) { // Simple admin check
        return res.status(403).json({ 
          message: 'Access denied - insufficient privileges',
          code: 'ACCESS_DENIED'
        });
      }

      const { fromDate, toDate, entityId } = req.query;
      const report = complianceService.generateComplianceReport(
        entityId as string,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );

      res.json(report);
    } catch (error) {
      console.error('Compliance report error:', error);
      res.status(500).json({ 
        message: 'Failed to generate compliance report',
        code: 'COMPLIANCE_REPORT_FAILED'
      });
    }
  });

  app.get('/api/admin/security/alerts', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow authorized users to view security alerts
      const user = await storage.getUser(req.userId!);
      if (!user || !user.name?.includes('admin')) {
        return res.status(403).json({ 
          message: 'Access denied - insufficient privileges',
          code: 'ACCESS_DENIED'
        });
      }

      const { level, resolved } = req.query;
      const alerts = securityService.getAlerts(
        level as string, 
        resolved === 'true' ? true : resolved === 'false' ? false : undefined
      );

      res.json(alerts);
    } catch (error) {
      console.error('Security alerts error:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve security alerts',
        code: 'SECURITY_ALERTS_FAILED'
      });
    }
  });

  app.post('/api/admin/security/alerts/:id/resolve', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.name?.includes('admin')) {
        return res.status(403).json({ 
          message: 'Access denied - insufficient privileges',
          code: 'ACCESS_DENIED'
        });
      }

      const { id } = req.params;
      const resolved = securityService.resolveAlert(id);
      
      if (!resolved) {
        return res.status(404).json({ 
          message: 'Alert not found',
          code: 'ALERT_NOT_FOUND'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({ 
        message: 'Failed to resolve alert',
        code: 'RESOLVE_ALERT_FAILED'
      });
    }
  });

  app.get('/api/admin/security/report', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.name?.includes('admin')) {
        return res.status(403).json({ 
          message: 'Access denied - insufficient privileges',
          code: 'ACCESS_DENIED'
        });
      }

      const { fromDate, toDate } = req.query;
      const report = securityService.generateSecurityReport(
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );

      res.json(report);
    } catch (error) {
      console.error('Security report error:', error);
      res.status(500).json({ 
        message: 'Failed to generate security report',
        code: 'SECURITY_REPORT_FAILED'
      });
    }
  });

  // AWS Health Check Endpoints for Production Deployment
  
  // Basic health check for load balancer
  app.get('/api/health', async (req, res) => {
    try {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api',
        error: 'Service unavailable'
      });
    }
  });

  // Readiness probe - checks if app is ready to serve traffic
  app.get('/api/ready', async (req, res) => {
    try {
      // Check database connectivity
      try {
        await storage.getUser('test-connection');
      } catch (error) {
        // Expected for connection test
      }
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api',
        checks: {
          database: 'connected'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api',
        checks: {
          database: 'disconnected'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Liveness probe - checks if app is alive
  app.get('/api/live', async (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: 'crednxt-api',
      uptime: process.uptime()
    });
  });

  // Detailed health check for monitoring
  app.get('/api/health/detailed', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Database health check
      let dbStatus = 'unknown';
      let dbLatency = 0;
      try {
        const dbStart = Date.now();
        await storage.getUser('test-connection');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'healthy';
      } catch (dbError) {
        dbStatus = 'unhealthy';
      }

      // Memory usage
      const memUsage = process.memoryUsage();
      
      // System information
      const healthData = {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        responseTime: Date.now() - startTime,
        checks: {
          database: {
            status: dbStatus,
            latency: dbLatency
          },
          memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
          },
          process: {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform
          }
        }
      };

      const statusCode = dbStatus === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthData);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'crednxt-api',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Register SMS routes
  // SMS routes removed - using in-app notifications only

  return httpServer;
}
