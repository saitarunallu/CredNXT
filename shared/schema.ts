import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const offerTypeEnum = pgEnum('offer_type', ['lend', 'borrow']);
export const interestTypeEnum = pgEnum('interest_type', ['fixed', 'reducing']);
export const repaymentTypeEnum = pgEnum('repayment_type', ['emi', 'interest_only', 'full_payment']);
export const repaymentFrequencyEnum = pgEnum('repayment_frequency', ['weekly', 'monthly', 'yearly']);
export const tenureUnitEnum = pgEnum('tenure_unit', ['days', 'weeks', 'months', 'years']);
export const offerStatusEnum = pgEnum('offer_status', ['pending', 'accepted', 'declined', 'completed', 'overdue']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'partial_paid', 'paid', 'completed']);
export const notificationTypeEnum = pgEnum('notification_type', ['offer_received', 'offer_accepted', 'offer_declined', 'payment_reminder', 'payment_received']);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: text("name"),
  email: text("email"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  email: text("email"),
  isVerified: boolean("is_verified").default(false),
  verifiedUserId: uuid("verified_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id),
  toUserPhone: varchar("to_user_phone", { length: 15 }).notNull(),
  toUserName: text("to_user_name").notNull(),
  toUserId: uuid("to_user_id").references(() => users.id), // Will be filled if the recipient is registered
  toContactId: uuid("to_contact_id").references(() => contacts.id), // Reference to the contact
  offerType: offerTypeEnum("offer_type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interestType: interestTypeEnum("interest_type").notNull(),
  tenureValue: integer("tenure_value").notNull(),
  tenureUnit: tenureUnitEnum("tenure_unit").notNull(),
  repaymentType: repaymentTypeEnum("repayment_type").notNull(),
  repaymentFrequency: repaymentFrequencyEnum("repayment_frequency"),
  allowPartPayment: boolean("allow_part_payment").default(false),
  purpose: text("purpose"),
  dueDate: timestamp("due_date").notNull(),
  note: text("note"),
  status: offerStatusEnum("status").default('pending'),
  contractPdfKey: text("contract_pdf_key"),
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
  contacts: many(contacts),
  sentOffers: many(offers),
  receivedOffers: many(offers, {
    relationName: "toUser"
  }),
  notifications: many(notifications),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  verifiedUser: one(users, {
    fields: [contacts.verifiedUserId],
    references: [users.id],
  }),
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
  toContact: one(contacts, {
    fields: [offers.toContactId],
    references: [contacts.id],
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

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.string(),
  interestRate: z.coerce.string(),
  tenureValue: z.coerce.number(),
  dueDate: z.coerce.date(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.coerce.string(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
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
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
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
