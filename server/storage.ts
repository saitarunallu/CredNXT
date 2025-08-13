import { 
  users, offers, payments, notifications, otpCodes,
  userNotificationPreferences, notificationDeliveries, notificationBatches,
  type User, type InsertUser, 
  type Offer, type InsertOffer, type Payment, type InsertPayment, type UpdatePayment,
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
  getOffersWithOverduePayments(): Promise<Offer[]>;

  // Payments
  getOfferPayments(offerId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: UpdatePayment): Promise<Payment>;
  getPayments(): Promise<Payment[]>;
  deletePayment(paymentId: string): Promise<void>;

  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification>;
  
  // Advanced Notification Features
  getUserNotificationPreferences(userId: string, type: string): Promise<any>;
  createUserNotificationPreferences(preferences: any): Promise<any>;
  getTodayNotificationCount(userId: string, date: Date): Promise<number>;
  getPendingBatchNotifications(userId: string, batchType: string): Promise<any[]>;
  createNotificationBatch(batch: any): Promise<any>;
  createNotificationDelivery(delivery: any): Promise<any>;
  updateNotificationDelivery(id: string, updates: any): Promise<any>;
  getScheduledNotifications(beforeDate: Date): Promise<any[]>;
  getNotificationAnalytics(userId: string, days: number): Promise<any>;
  getPayment(id: string): Promise<Payment | undefined>;

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

  async getOffersWithOverduePayments(): Promise<Offer[]> {
    const today = new Date();
    return await db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.status, 'accepted'),
          lte(offers.nextPaymentDueDate, today)
        )
      );
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

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment || undefined;
  }

  async updatePayment(id: string, updates: UpdatePayment): Promise<Payment> {
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
      .set({ isRead: true, readAt: sql`now()` })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: sql`now()` })
      .where(eq(notifications.userId, userId));
  }

  async updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async getUserNotificationPreferences(userId: string, type: string): Promise<any> {
    const [preferences] = await db
      .select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.type, type as any)
      ));
    return preferences;
  }

  async createUserNotificationPreferences(preferences: any): Promise<any> {
    const [created] = await db
      .insert(userNotificationPreferences)
      .values(preferences)
      .returning();
    return created;
  }

  async getTodayNotificationCount(userId: string, date: Date): Promise<number> {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, date),
        lte(notifications.createdAt, endDate)
      ));
    
    return result?.count || 0;
  }

  async getPendingBatchNotifications(userId: string, batchType: string): Promise<any[]> {
    return db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        sql`${notifications.batchId} IS NULL`,
        sql`${notifications.scheduledFor} <= now()`
      ));
  }

  async createNotificationBatch(batch: any): Promise<any> {
    const [created] = await db
      .insert(notificationBatches)
      .values(batch)
      .returning();
    return created;
  }

  async createNotificationDelivery(delivery: any): Promise<any> {
    const [created] = await db
      .insert(notificationDeliveries)
      .values(delivery)
      .returning();
    return created;
  }

  async updateNotificationDelivery(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(notificationDeliveries)
      .set(updates)
      .where(eq(notificationDeliveries.id, id))
      .returning();
    return updated;
  }

  async getScheduledNotifications(beforeDate: Date): Promise<any[]> {
    return db
      .select()
      .from(notifications)
      .where(and(
        lte(notifications.scheduledFor, beforeDate),
        sql`${notifications.batchId} IS NULL`,
        sql`(${notifications.expiresAt} IS NULL OR ${notifications.expiresAt} > now())`
      ));
  }

  async getNotificationAnalytics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This is a simplified version - in production you'd want more complex analytics
    const [totalSent] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, startDate)
      ));

    const [totalRead] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, startDate),
        eq(notifications.isRead, true)
      ));

    const readRate = totalSent.count > 0 ? totalRead.count / totalSent.count : 0;

    return {
      totalSent: totalSent.count,
      deliveryRate: 0.95, // Mock value - would come from delivery tracking
      readRate,
      channelPerformance: {},
      costAnalysis: {},
      batchEfficiency: 0.7 // Mock value
    };
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
