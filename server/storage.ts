import { 
  type User, type InsertUser, 
  type Offer, type InsertOffer, type Payment, type InsertPayment, type UpdatePayment,
  type Notification, type InsertNotification 
} from "@shared/firestore-schema";
import { FirestoreStorage } from "./firestore-storage";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOfferWithDetails(id: string): Promise<any>;
  getUserOffers(userId: string): Promise<any[]>;
  getReceivedOffers(userId: string): Promise<any[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  linkOffersToUser(userId: string, phone: string): Promise<void>;
  updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer>;
  getUpcomingDueOffers(days: number): Promise<any[]>;
  getOffersWithOverduePayments(): Promise<Offer[]>;

  // Payments
  getOfferPayments(offerId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: UpdatePayment): Promise<Payment>;
  getPayments(): Promise<Payment[]>;
  deletePayment(paymentId: string): Promise<void>;
  getPayment(id: string): Promise<Payment | undefined>;

  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification>;
  
  // Advanced Notification Features (simplified for Firestore)
  getUserNotificationPreferences(userId: string, type: string): Promise<any>;
  createUserNotificationPreferences(preferences: any): Promise<any>;
  getTodayNotificationCount(userId: string, date: Date): Promise<number>;
  getPendingBatchNotifications(userId: string, batchType: string): Promise<any[]>;
  createNotificationBatch(batch: any): Promise<any>;
  createNotificationDelivery(delivery: any): Promise<any>;
  updateNotificationDelivery(id: string, updates: any): Promise<any>;
  getScheduledNotifications(beforeDate: Date): Promise<any[]>;
  getNotificationAnalytics(userId: string, days: number): Promise<any>;

  // Pending offer notifications
  createPendingOfferNotification(data: any): Promise<any>;
  getPendingOfferNotificationsByPhone(phone: string): Promise<any[]>;
  markPendingOfferNotificationAsDelivered(id: string): Promise<void>;

  // OTP
  // OTP methods removed - Firebase Auth handles OTP generation and verification
  deleteExpiredOtps(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private firestore: FirestoreStorage | null = null;

  private getFirestore(): FirestoreStorage {
    if (!this.firestore) {
      this.firestore = new FirestoreStorage();
    }
    return this.firestore;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.getFirestore().getUserById(id);
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const user = await this.getFirestore().getUserByPhone(phone);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await this.getFirestore().createUser(insertUser);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const updated = await this.getFirestore().updateUser(id, updates);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const offer = await this.getFirestore().getOfferById(id);
    return offer || undefined;
  }

  async getOfferWithDetails(id: string): Promise<any> {
    const offer = await this.getFirestore().getOfferById(id);
    if (!offer) return null;

    // Get related data
    const payments = await this.getFirestore().getPaymentsByOfferId(id);
    const fromUser = await this.getFirestore().getUserById(offer.fromUserId);
    const toUser = offer.toUserId ? await this.getFirestore().getUserById(offer.toUserId) : null;

    return {
      ...offer,
      payments,
      fromUser,
      toUser,
      totalPaid: payments
        .filter(p => p.status === 'paid' || p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
    };
  }

  async getUserOffers(userId: string): Promise<any[]> {
    const offers = await this.getFirestore().getOffersByUserId(userId);
    
    // Enrich with user data and payment summaries - using Promise.all for concurrent processing
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        // Process all data fetching concurrently for each offer
        const [fromUser, toUser, payments] = await Promise.all([
          this.getFirestore().getUserById(offer.fromUserId),
          offer.toUserId ? this.getFirestore().getUserById(offer.toUserId) : Promise.resolve(null),
          this.getFirestore().getPaymentsByOfferId(offer.id)
        ]);

        return {
          ...offer,
          fromUser,
          toUser,
          totalPaid: payments
            .filter(p => p.status === 'paid' || p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0),
          pendingPayments: payments.filter(p => p.status === 'pending').length
        };
      })
    );

    return enrichedOffers;
  }

  async getReceivedOffers(userId: string): Promise<any[]> {
    // Get offers where user is the recipient (toUserId)
    const offers = await this.getFirestore().getReceivedOffersByUserId(userId);
    
    // Enrich with user data and payment summaries - using Promise.all for concurrent processing
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        // Process all data fetching concurrently for each offer
        const [fromUser, toUser, payments] = await Promise.all([
          this.getFirestore().getUserById(offer.fromUserId),
          offer.toUserId ? this.getFirestore().getUserById(offer.toUserId) : Promise.resolve(null),
          this.getFirestore().getPaymentsByOfferId(offer.id)
        ]);

        return {
          ...offer,
          fromUser,
          toUser,
          totalPaid: payments
            .filter(p => p.status === 'paid' || p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0),
          pendingPayments: payments.filter(p => p.status === 'pending').length
        };
      })
    );

    return enrichedOffers;
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    return await this.getFirestore().createOffer(offer);
  }

  async linkOffersToUser(userId: string, phone: string): Promise<void> {
    return await this.getFirestore().linkOffersToUser(userId, phone);
  }

  async updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer> {
    // Convert Date fields to Firestore Timestamps if present
    const firestoreUpdates: any = { ...updates };
    if (firestoreUpdates.startDate && firestoreUpdates.startDate instanceof Date) {
      const { Timestamp } = await import('firebase-admin/firestore');
      firestoreUpdates.startDate = Timestamp.fromDate(firestoreUpdates.startDate);
    }
    if (firestoreUpdates.dueDate && firestoreUpdates.dueDate instanceof Date) {
      const { Timestamp } = await import('firebase-admin/firestore');
      firestoreUpdates.dueDate = Timestamp.fromDate(firestoreUpdates.dueDate);
    }
    if (firestoreUpdates.nextPaymentDueDate && firestoreUpdates.nextPaymentDueDate instanceof Date) {
      const { Timestamp } = await import('firebase-admin/firestore');
      firestoreUpdates.nextPaymentDueDate = Timestamp.fromDate(firestoreUpdates.nextPaymentDueDate);
    }

    const updated = await this.getFirestore().updateOffer(id, firestoreUpdates);
    if (!updated) throw new Error('Offer not found');
    return updated;
  }

  async getUpcomingDueOffers(days: number): Promise<any[]> {
    // This would require a more complex Firestore query
    // For now, return empty array - can be implemented later
    return [];
  }

  async getOffersWithOverduePayments(): Promise<Offer[]> {
    // This would require a more complex Firestore query
    // For now, return empty array - can be implemented later  
    return [];
  }

  // Payments
  async getOfferPayments(offerId: string): Promise<Payment[]> {
    return await this.getFirestore().getPaymentsByOfferId(offerId);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    return await this.getFirestore().createPayment(payment);
  }

  async updatePayment(id: string, updates: UpdatePayment): Promise<Payment> {
    const updated = await this.getFirestore().updatePayment(id, updates);
    if (!updated) throw new Error('Payment not found');
    return updated;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const payment = await this.getFirestore().getPaymentById(id);
    return payment || undefined;
  }

  async getPayments(): Promise<Payment[]> {
    // This would require a more complex query - for now return empty
    return [];
  }

  async deletePayment(paymentId: string): Promise<void> {
    // For now, mark as rejected instead of actually deleting
    await this.getFirestore().updatePayment(paymentId, { status: 'rejected' });
  }

  // Notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await this.getFirestore().getNotificationsByUserId(userId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return await this.getFirestore().createNotification(notification);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.getFirestore().markNotificationAsRead(id);
  }

  async updateNotification(id: string, updates: Partial<InsertNotification>): Promise<Notification> {
    // For now, return a stub - would need full implementation
    throw new Error('updateNotification not implemented for Firestore');
  }

  // Advanced notification features (stubs for now)
  async getUserNotificationPreferences(userId: string, type: string): Promise<any> {
    return null;
  }

  async createUserNotificationPreferences(preferences: any): Promise<any> {
    return preferences;
  }

  async getTodayNotificationCount(userId: string, date: Date): Promise<number> {
    return 0;
  }

  async getPendingBatchNotifications(userId: string, batchType: string): Promise<any[]> {
    return [];
  }

  async createNotificationBatch(batch: any): Promise<any> {
    return batch;
  }

  async createNotificationDelivery(delivery: any): Promise<any> {
    return delivery;
  }

  async updateNotificationDelivery(id: string, updates: any): Promise<any> {
    return updates;
  }

  async getScheduledNotifications(beforeDate: Date): Promise<any[]> {
    return [];
  }

  async getNotificationAnalytics(userId: string, days: number): Promise<any> {
    return {
      totalSent: 0,
      totalRead: 0,
      totalDelivered: 0,
      totalFailed: 0,
      readRate: 0,
      deliveryRate: 0,
      channelBreakdown: {},
      typeBreakdown: {}
    };
  }

  // Pending offer notifications
  async createPendingOfferNotification(data: any): Promise<any> {
    return this.getFirestore().createPendingOfferNotification(data);
  }

  async getPendingOfferNotificationsByPhone(phone: string): Promise<any[]> {
    return this.getFirestore().getPendingOfferNotificationsByPhone(phone);
  }

  async markPendingOfferNotificationAsDelivered(id: string): Promise<void> {
    return this.getFirestore().markPendingOfferNotificationAsDelivered(id);
  }

  // OTP methods removed - Firebase Auth handles phone verification

  async deleteExpiredOtps(): Promise<void> {
    await this.getFirestore().cleanupExpiredOTPs();
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();