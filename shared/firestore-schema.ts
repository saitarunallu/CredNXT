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

// Firestore Offer document
export interface Offer {
  id: string;
  fromUserId: string;
  toUserPhone: string;
  toUserName: string;
  toUserId?: string | null;
  offerType: OfferType;
  amount: number;
  interestRate: number;
  interestType: InterestType;
  tenureValue: number;
  tenureUnit: TenureUnit;
  repaymentType: RepaymentType;
  repaymentFrequency?: RepaymentFrequency;
  allowPartPayment: boolean;
  gracePeriodDays: number;
  prepaymentPenalty: number;
  latePaymentPenalty: number;
  purpose?: string;
  startDate: Timestamp;
  dueDate: Timestamp;
  nextPaymentDueDate?: Timestamp;
  currentInstallmentNumber: number;
  totalInstallments?: number;
  note?: string;
  status: OfferStatus;
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

export const insertOfferSchema = z.object({
  fromUserId: z.string().min(1),
  toUserPhone: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  toUserName: z.string().min(2).max(100).regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens"),
  toUserId: z.string().nullable().optional(),
  offerType: z.enum(['lend', 'borrow']),
  amount: z.coerce.number().min(1).max(10000000),
  interestRate: z.coerce.number().min(0).max(50),
  interestType: z.enum(['fixed', 'reducing']),
  tenureValue: z.coerce.number().min(1).max(360).int(),
  tenureUnit: z.enum(['months', 'years']),
  repaymentType: z.enum(['emi', 'interest_only', 'full_payment']),
  repaymentFrequency: z.enum(['weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly']).optional(),
  allowPartPayment: z.boolean().default(false),
  gracePeriodDays: z.coerce.number().min(0).max(30).int().default(0),
  prepaymentPenalty: z.coerce.number().min(0).max(10).default(0),
  latePaymentPenalty: z.coerce.number().min(0).max(5).default(0),
  purpose: z.string().optional(),
  startDate: z.coerce.date().refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), "Start date cannot be in the past"),
  dueDate: z.coerce.date(),
  nextPaymentDueDate: z.coerce.date().optional(),
  currentInstallmentNumber: z.number().default(1),
  totalInstallments: z.number().optional(),
  note: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'completed', 'overdue']).default('pending'),
  contractPdfKey: z.string().optional(),
  kfsPdfKey: z.string().optional(),
  schedulePdfKey: z.string().optional(),
});

export const insertPaymentSchema = z.object({
  offerId: z.string().min(1),
  amount: z.coerce.number().min(1).max(10000000),
  installmentNumber: z.number().optional(),
  paymentMode: z.string().min(1).max(50).optional(),
  refString: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\-_/]+$/, "Reference string can only contain alphanumeric characters, hyphens, underscores, and forward slashes").optional(),
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
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type UpdatePayment = Partial<Omit<Payment, 'id' | 'createdAt'>>;