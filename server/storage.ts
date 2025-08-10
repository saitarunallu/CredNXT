import { 
  users, contacts, offers, payments, notifications, otpCodes,
  type User, type InsertUser, type Contact, type InsertContact,
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

  // Contacts
  getUserContacts(userId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  createContacts(contacts: InsertContact[]): Promise<Contact[]>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  markContactAsVerified(phone: string, verifiedUserId: string): Promise<void>;

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

  // Contacts
  async getUserContacts(userId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(asc(contacts.name));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async createContacts(contactList: InsertContact[]): Promise<Contact[]> {
    return await db.insert(contacts).values(contactList).returning();
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [contact] = await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async markContactAsVerified(phone: string, verifiedUserId: string): Promise<void> {
    await db
      .update(contacts)
      .set({ isVerified: true, verifiedUserId })
      .where(eq(contacts.phone, phone));
  }

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
        contact: contacts,
      })
      .from(offers)
      .leftJoin(users, eq(offers.fromUserId, users.id))
      .leftJoin(contacts, eq(offers.toContactId, contacts.id))
      .where(eq(offers.id, id));

    return result;
  }

  async getUserOffers(userId: string): Promise<any[]> {
    return await db
      .select({
        offer: offers,
        contact: contacts,
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(offers)
      .leftJoin(contacts, eq(offers.toContactId, contacts.id))
      .leftJoin(payments, and(eq(payments.offerId, offers.id), eq(payments.status, 'paid')))
      .where(eq(offers.fromUserId, userId))
      .groupBy(offers.id, contacts.id)
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
      .leftJoin(contacts, eq(offers.toContactId, contacts.id))
      .leftJoin(payments, and(eq(payments.offerId, offers.id), eq(payments.status, 'paid')))
      .where(eq(contacts.verifiedUserId, userId))
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
        contact: contacts,
      })
      .from(offers)
      .leftJoin(users, eq(offers.fromUserId, users.id))
      .leftJoin(contacts, eq(offers.toContactId, contacts.id))
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

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return payment;
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
