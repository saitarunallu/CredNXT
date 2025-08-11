import { 
  users, offers, payments, notifications, otpCodes,
  type User, type InsertUser, 
  type Offer, type InsertOffer, type Payment, type InsertPayment,
  type Notification, type InsertNotification 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // No longer using contacts table

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOfferWithDetails(id: string): Promise<any>;
  getUserOffers(userId: string): Promise<any[]>;
  getReceivedOffers(userId: string): Promise<any[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer>;
  getUpcomingDueOffers(days: number): Promise<any[]>;

  // Payments
  getOfferPayments(offerId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment>;
  getPayments(): Promise<Payment[]>;
  deletePayment(paymentId: string): Promise<void>;

  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;

  // OTP
  createOtp(phone: string, code: string, expiresAt: Date): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
  deleteExpiredOtps(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Contacts functionality removed - using direct user lookups

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer || undefined;
  }

  async getOfferWithDetails(id: string): Promise<any> {
    const [result] = await db
      .select({
        offer: offers,
        fromUser: users,
        toUser: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        },
      })
      .from(offers)
      .leftJoin(users, eq(offers.fromUserId, users.id))
      .where(eq(offers.id, id));

    return result;
  }

  async getUserOffers(userId: string): Promise<any[]> {
    return await db
      .select({
        offer: offers,
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(offers)
      .leftJoin(payments, and(eq(payments.offerId, offers.id), eq(payments.status, 'paid')))
      .where(eq(offers.fromUserId, userId))
      .groupBy(offers.id)
      .orderBy(desc(offers.createdAt));
  }

  async getReceivedOffers(userId: string): Promise<any[]> {
    return await db
      .select({
        offer: offers,
        fromUser: users,
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(offers)
      .leftJoin(users, eq(offers.fromUserId, users.id))
      .leftJoin(payments, and(eq(payments.offerId, offers.id), eq(payments.status, 'paid')))
      .where(eq(offers.toUserId, userId))
      .groupBy(offers.id, users.id)
      .orderBy(desc(offers.createdAt));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }

  async updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer> {
    const [offer] = await db
      .update(offers)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(offers.id, id))
      .returning();
    return offer;
  }

  async getUpcomingDueOffers(days: number): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await db
      .select({
        offer: offers,
        fromUser: users,
      })
      .from(offers)
      .leftJoin(users, eq(offers.fromUserId, users.id))
      .where(
        and(
          eq(offers.status, 'accepted'),
          lte(offers.dueDate, futureDate),
          gte(offers.dueDate, new Date())
        )
      )
      .orderBy(asc(offers.dueDate));
  }

  // Payments
  async getOfferPayments(offerId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.offerId, offerId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment || null;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async deletePayment(paymentId: string): Promise<void> {
    await db.delete(payments).where(eq(payments.id, paymentId));
  }

  // Notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // OTP
  async createOtp(phone: string, code: string, expiresAt: Date): Promise<void> {
    await db.insert(otpCodes).values({
      phone,
      code,
      expiresAt,
    });
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          gte(otpCodes.expiresAt, new Date())
        )
      );

    if (otp) {
      await db
        .update(otpCodes)
        .set({ used: true })
        .where(eq(otpCodes.id, otp.id));
      return true;
    }

    return false;
  }

  async deleteExpiredOtps(): Promise<void> {
    await db.delete(otpCodes).where(lte(otpCodes.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();
