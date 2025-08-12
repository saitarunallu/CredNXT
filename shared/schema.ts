import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const offerTypeEnum = pgEnum('offer_type', ['lend', 'borrow']);
export const interestTypeEnum = pgEnum('interest_type', ['fixed', 'reducing']);
export const repaymentTypeEnum = pgEnum('repayment_type', ['emi', 'interest_only', 'full_payment', 'step_down', 'step_up', 'balloon']);
export const repaymentFrequencyEnum = pgEnum('repayment_frequency', ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly']);
export const tenureUnitEnum = pgEnum('tenure_unit', ['days', 'weeks', 'months', 'years']);
export const offerStatusEnum = pgEnum('offer_status', ['pending', 'accepted', 'declined', 'completed', 'overdue']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'partial_paid', 'paid', 'completed', 'rejected']);
export const notificationTypeEnum = pgEnum('notification_type', ['offer_received', 'offer_accepted', 'offer_declined', 'payment_reminder', 'payment_received', 'payment_submitted', 'payment_approved', 'payment_rejected', 'loan_closed']);
export const compoundingFrequencyEnum = pgEnum('compounding_frequency', ['daily', 'monthly', 'quarterly', 'annually']);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: text("name"),
  email: text("email"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id),
  toUserPhone: varchar("to_user_phone", { length: 15 }).notNull(),
  toUserName: text("to_user_name").notNull(),
  toUserId: uuid("to_user_id").references(() => users.id), // Will be filled if the recipient is registered
  offerType: offerTypeEnum("offer_type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interestType: interestTypeEnum("interest_type").notNull(),
  tenureValue: integer("tenure_value").notNull(),
  tenureUnit: tenureUnitEnum("tenure_unit").notNull(),
  repaymentType: repaymentTypeEnum("repayment_type").notNull(),
  repaymentFrequency: repaymentFrequencyEnum("repayment_frequency"),
  allowPartPayment: boolean("allow_part_payment").default(false),
  gracePeriodDays: integer("grace_period_days").default(0),
  prepaymentPenalty: decimal("prepayment_penalty", { precision: 5, scale: 2 }).default('0'),
  latePaymentPenalty: decimal("late_payment_penalty", { precision: 5, scale: 2 }).default('0'),
  compoundingFrequency: compoundingFrequencyEnum("compounding_frequency").default('monthly'),
  purpose: text("purpose"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  note: text("note"),
  status: offerStatusEnum("status").default('pending'),
  contractPdfKey: text("contract_pdf_key"),
  kfsPdfKey: text("kfs_pdf_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: text("payment_mode"),
  refString: text("ref_string"),
  status: paymentStatusEnum("status").default('pending'),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  offerId: uuid("offer_id").references(() => offers.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 15 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentOffers: many(offers),
  receivedOffers: many(offers, {
    relationName: "toUser"
  }),
  notifications: many(notifications),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  fromUser: one(users, {
    fields: [offers.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [offers.toUserId],
    references: [users.id],
    relationName: "toUser"
  }),
  payments: many(payments),
  notifications: many(notifications),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  offer: one(offers, {
    fields: [payments.offerId],
    references: [offers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [notifications.offerId],
    references: [offers.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 10000000; // Max 1 crore
    }, "Amount must be between ₹1 and ₹1,00,00,000")
    .refine((val) => {
      const num = parseFloat(val);
      return Number.isFinite(num) && num.toString().split('.')[1]?.length <= 2;
    }, "Amount can have maximum 2 decimal places"),
  interestRate: z.coerce.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 50; // Max 50% interest rate
    }, "Interest rate must be between 0% and 50%")
    .refine((val) => {
      const num = parseFloat(val);
      return Number.isFinite(num) && num.toString().split('.')[1]?.length <= 2;
    }, "Interest rate can have maximum 2 decimal places"),
  tenureValue: z.coerce.number()
    .min(1, "Tenure must be at least 1")
    .max(360, "Tenure cannot exceed 360 units")
    .int("Tenure must be a whole number"),
  startDate: z.coerce.date()
    .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), "Start date cannot be in the past"),
  dueDate: z.coerce.date(),
  gracePeriodDays: z.coerce.number()
    .min(0, "Grace period cannot be negative")
    .max(30, "Grace period cannot exceed 30 days")
    .int("Grace period must be a whole number")
    .optional(),
  prepaymentPenalty: z.coerce.string()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 10;
    }, "Prepayment penalty must be between 0% and 10%")
    .optional(),
  latePaymentPenalty: z.coerce.string()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 5;
    }, "Late payment penalty must be between 0% and 5%")
    .optional(),
  toUserPhone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  toUserName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens"),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  paidAt: true,
}).extend({
  amount: z.coerce.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 10000000;
    }, "Payment amount must be between ₹1 and ₹1,00,00,000")
    .refine((val) => {
      const num = parseFloat(val);
      return Number.isFinite(num) && num.toString().split('.')[1]?.length <= 2;
    }, "Payment amount can have maximum 2 decimal places"),
  paymentMode: z.string()
    .min(1, "Payment mode is required")
    .max(50, "Payment mode cannot exceed 50 characters")
    .optional(),
  refString: z.string()
    .min(1, "Reference string is required")
    .max(100, "Reference string cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\-_/]+$/, "Reference string can only contain alphanumeric characters, hyphens, underscores, and forward slashes")
    .optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});

export const verifyOtpSchema = z.object({
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  code: z.string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const completeProfileSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens"),
  email: z.string()
    .email("Invalid email format")
    .max(254, "Email cannot exceed 254 characters")
    .optional(),
});

export const demoRequestSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  organization: z.string().optional(),
  interest: z.enum(['Personal Use', 'Investment Opportunity', 'Partnership Inquiry', 'Enterprise Solution']),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type DemoRequest = z.infer<typeof demoRequestSchema>;
