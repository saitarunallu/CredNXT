import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Enums as string literals for Firestore
export type OfferType = 'lend' | 'borrow';
export type InterestType = 'fixed' | 'reducing';
export type RepaymentType = 'emi' | 'interest_only' | 'full_payment';
export type RepaymentFrequency = 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
export type TenureUnit = 'months' | 'years';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'overdue';
export type PaymentStatus = 'pending' | 'partial_paid' | 'paid' | 'completed' | 'rejected';
export type NotificationType = 
  | 'offer_received' | 'offer_accepted' | 'offer_declined' | 'payment_reminder' 
  | 'payment_received' | 'payment_submitted' | 'payment_approved' | 'payment_rejected' 
  | 'loan_closed' | 'payment_overdue' | 'system_maintenance' | 'security_alert' 
  | 'account_update' | 'batch_summary';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DeliveryChannel = 'app' | 'sms' | 'email' | 'whatsapp' | 'push';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
export type BatchType = 'daily_digest' | 'payment_reminders' | 'security_alerts' | 'promotional';

// Firestore User document
export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Offer document - Enhanced schema
export interface Offer {
  id: string;
  
  // Sender details
  senderUserId: string;
  senderName: string;
  senderPhone: string;
  
  // Recipient details
  recipientPhoneNumber: string;
  recipientName: string;
  recipientUserId: string; // actual id or 'pending'
  
  // Offer details
  offerType: 'Lend' | 'Borrow';
  amount: number;
  interestType: 'Fixed' | 'Reducing';
  interestRate: number;
  
  // Tenure
  tenure: number;
  tenureUnit: 'days' | 'months' | 'years';
  
  // Repayment
  repaymentType: 'Interest Only' | 'Instalments' | 'Lump Sum';
  repaymentFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string; // ISO date string
  
  // Additional details
  purpose: string;
  collateral?: string;
  allowPartialPayments: boolean;
  
  // Status and metadata
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  
  // Legacy fields for backward compatibility
  fromUserId?: string;
  toUserPhone?: string;
  toUserName?: string;
  toUserId?: string | null;
  tenureValue?: number;
  repaymentType_legacy?: RepaymentType;
  repaymentFrequency_legacy?: RepaymentFrequency;
  allowPartPayment?: boolean;
  gracePeriodDays?: number;
  prepaymentPenalty?: number;
  latePaymentPenalty?: number;
  dueDate?: Timestamp;
  nextPaymentDueDate?: Timestamp;
  currentInstallmentNumber?: number;
  totalInstallments?: number;
  note?: string;
  contractPdfKey?: string;
  kfsPdfKey?: string;
  schedulePdfKey?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Payment document
export interface Payment {
  id: string;
  offerId: string;
  amount: number;
  installmentNumber?: number;
  paymentMode?: string;
  refString?: string;
  status: PaymentStatus;
  paidAt?: Timestamp;
  createdAt: Timestamp;
}

// Firestore Notification document
export interface Notification {
  id: string;
  userId: string;
  offerId?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Timestamp;
  scheduledFor: Timestamp;
  expiresAt?: Timestamp;
  metadata?: Record<string, any>;
  batchId?: string;
  createdAt: Timestamp;
}

// Firestore UserNotificationPreferences document
export interface UserNotificationPreferences {
  id: string;
  userId: string;
  type: NotificationType;
  channels: DeliveryChannel[];
  enabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  batchingEnabled: boolean;
  maxDailyNotifications: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore NotificationDelivery document
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt?: Timestamp;
  deliveredAt?: Timestamp;
  failureReason?: string;
  externalId?: string;
  cost: number;
  createdAt: Timestamp;
}

// Firestore NotificationBatch document
export interface NotificationBatch {
  id: string;
  userId: string;
  batchType: BatchType;
  title: string;
  summary: string;
  notificationCount: number;
  scheduledFor: Timestamp;
  sentAt?: Timestamp;
  status: DeliveryStatus;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

// Firestore OTPCode document
export interface OTPCode {
  id: string;
  phone: string;
  code: string;
  expiresAt: Timestamp;
  used: boolean;
  createdAt: Timestamp;
}

// SMS Message document (already exists)
export interface SMSMessage {
  id: string;
  to: string;
  message: string;
  type: 'verification';
  timestamp: Timestamp;
  status: string;
}

// Validation schemas
export const insertUserSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(254).optional(),
  isVerified: z.boolean().default(false),
});

// Enhanced insert offer schema matching the new structure
export const insertOfferSchema = z.object({
  // Sender details (required)
  senderUserId: z.string().min(1, "Sender user ID is required"),
  senderName: z.string().min(2, "Sender name must be at least 2 characters").max(100, "Sender name cannot exceed 100 characters"),
  senderPhone: z.string().min(10).max(15).regex(/^\+91[6-9]\d{9}$/, "Sender phone must be valid Indian number with +91"),
  
  // Recipient details (required)
  recipientPhoneNumber: z.string().min(10).max(15).regex(/^\+91[6-9]\d{9}$/, "Recipient phone must be valid Indian number with +91"),
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters").max(100, "Recipient name cannot exceed 100 characters").regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens").refine(val => val.trim().length > 0, "Name cannot be empty"),
  recipientUserId: z.string().min(1, "Recipient user ID is required"), // actual id or 'pending'
  
  // Offer details (required)
  offerType: z.enum(['Lend', 'Borrow'], { required_error: "Offer type is required" }),
  amount: z.coerce.number().min(1, "Amount must be at least ₹1").max(10000000, "Amount cannot exceed ₹1 crore").finite("Amount must be a valid number"),
  interestType: z.enum(['Fixed', 'Reducing'], { required_error: "Interest type is required" }),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").max(50, "Interest rate cannot exceed 50%").finite("Interest rate must be a valid number"),
  
  // Tenure (required)
  tenure: z.coerce.number().min(1, "Tenure must be at least 1").max(360, "Tenure cannot exceed 360").int("Tenure must be a whole number"),
  tenureUnit: z.enum(['days', 'months', 'years'], { required_error: "Tenure unit is required" }),
  
  // Repayment (required)
  repaymentType: z.enum(['Interest Only', 'Instalments', 'Lump Sum'], { required_error: "Repayment type is required" }),
  repaymentFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], { required_error: "Repayment frequency is required" }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").refine((dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Start date cannot be in the past"),
  
  // Additional details
  purpose: z.string().min(1, "Purpose is required").max(500, "Purpose cannot exceed 500 characters"),
  collateral: z.string().max(500, "Collateral description cannot exceed 500 characters").optional(),
  allowPartialPayments: z.boolean().default(false),
  
  // Status
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).default('pending'),
  
  // Legacy compatibility fields (optional)
  fromUserId: z.string().optional(),
  toUserPhone: z.string().optional(),
  toUserName: z.string().optional(),
  toUserId: z.string().nullable().optional(),
  tenureValue: z.coerce.number().optional(),
  repaymentType_legacy: z.string().optional(),
  repaymentFrequency_legacy: z.string().optional(),
  allowPartPayment: z.boolean().optional(),
  gracePeriodDays: z.coerce.number().optional(),
  prepaymentPenalty: z.coerce.number().optional(),
  latePaymentPenalty: z.coerce.number().optional(),
  dueDate: z.coerce.date().optional(),
  nextPaymentDueDate: z.coerce.date().optional(),
  currentInstallmentNumber: z.number().optional(),
  totalInstallments: z.number().optional(),
  note: z.string().optional(),
  contractPdfKey: z.string().optional(),
  kfsPdfKey: z.string().optional(),
  schedulePdfKey: z.string().optional(),
}).refine((data) => {
  // Validate repayment type and frequency compatibility
  if (data.repaymentType === 'Instalments' && !data.repaymentFrequency) {
    return false;
  }
  return true;
}, {
  message: "Instalments repayment type requires a repayment frequency",
  path: ["repaymentFrequency"]
});

export const insertPaymentSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  amount: z.coerce.number().min(1, "Payment amount must be at least ₹1").max(10000000, "Payment amount cannot exceed ₹1 crore").finite("Amount must be a valid number"),
  installmentNumber: z.number().int("Installment number must be a whole number").min(1, "Installment number must be at least 1").optional(),
  paymentMode: z.string().min(1, "Payment mode is required").max(50, "Payment mode cannot exceed 50 characters").optional(),
  refString: z.string().min(1, "Reference string is required").max(100, "Reference string cannot exceed 100 characters").regex(/^[a-zA-Z0-9\-_/\s]+$/, "Reference string can only contain alphanumeric characters, hyphens, underscores, forward slashes, and spaces").optional(),
  status: z.enum(['pending', 'partial_paid', 'paid', 'completed', 'rejected']).default('pending'),
});

export const insertNotificationSchema = z.object({
  userId: z.string().min(1),
  offerId: z.string().optional(),
  type: z.enum([
    'offer_received', 'offer_accepted', 'offer_declined', 'payment_reminder',
    'payment_received', 'payment_submitted', 'payment_approved', 'payment_rejected',
    'loan_closed', 'payment_overdue', 'system_maintenance', 'security_alert',
    'account_update', 'batch_summary'
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  title: z.string().min(1),
  message: z.string().min(1),
  isRead: z.boolean().default(false),
  scheduledFor: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  metadata: z.record(z.any()).optional(),
  batchId: z.string().optional(),
});

export const loginSchema = z.object({
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long")
    .refine((val) => {
      // Remove all non-digit characters
      const digits = val.replace(/\D/g, '');
      // Check if it's exactly 10 digits and starts with 6-9
      return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
    }, "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  code: z.string().length(6).regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2).max(100).regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens"),
  email: z.string().email().max(254).optional(),
});

export const demoRequestSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  organization: z.string().optional(),
  interest: z.enum(['Personal Use', 'Investment Opportunity', 'Partnership Inquiry', 'Enterprise Solution']),
});

// Type inference
// Add input sanitization utilities
export const sanitizationUtils = {
  sanitizeString: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 10000); // Limit length
  },
  
  sanitizePhoneNumber: (phone: string): string => {
    if (!phone || typeof phone !== 'string') return '';
    return phone.replace(/[^\d+\-\s()]/g, '').trim().substring(0, 20);
  },
  
  sanitizeEmail: (email: string): string => {
    if (!email || typeof email !== 'string') return '';
    return email.toLowerCase().replace(/[<>]/g, '').trim().substring(0, 254);
  },
  
  sanitizeAmount: (amount: any): number => {
    const num = Number(amount);
    return isNaN(num) || !isFinite(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
  },
  
  sanitizeUrl: (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    // Only allow http/https protocols
    if (!url.match(/^https?:\/\//)) {
      return '';
    }
    return url.replace(/[<>]/g, '').trim().substring(0, 2048);
  }
};

// Type inference
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type UpdatePayment = Partial<Omit<Payment, 'id' | 'createdAt'>>;