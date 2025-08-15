import admin from 'firebase-admin';
import { initializeFirebase } from './firebase-config';
import { 
  User, Offer, Payment, Notification, OTPCode, 
  InsertUser, InsertOffer, InsertPayment, InsertNotification,
  UpdatePayment 
} from '../shared/firestore-schema';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface IFirestoreStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByPhone(phone: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  
  // Offer operations
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOfferById(id: string): Promise<Offer | null>;
  getOffersByUserId(userId: string): Promise<Offer[]>;
  getReceivedOffersByUserId(userId: string): Promise<Offer[]>;
  getOffersByUserIdWithPagination(userId: string, limit: number, startAfter?: string): Promise<{ offers: Offer[], hasMore: boolean, lastDoc?: string }>;
  updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | null>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentById(id: string): Promise<Payment | null>;
  getPaymentsByOfferId(offerId: string): Promise<Payment[]>;
  updatePayment(id: string, updates: UpdatePayment): Promise<Payment | null>;
  getExpiredPendingPayments(): Promise<Payment[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;
  
  // OTP operations
  createOTP(phone: string, code: string): Promise<OTPCode>;
  getValidOTP(phone: string, code: string): Promise<OTPCode | null>;
  markOTPAsUsed(id: string): Promise<boolean>;
  cleanupExpiredOTPs(): Promise<number>;
}

class FirestoreStorage implements IFirestoreStorage {
  private db: admin.firestore.Firestore;

  constructor() {
    // Ensure Firebase is initialized before accessing Firestore
    initializeFirebase();
    this.db = admin.firestore();
  }

  // Helper to generate ID
  private generateId(): string {
    return this.db.collection('temp').doc().id;
  }

  // Helper to convert Firestore timestamp to JS Date and vice versa
  private timestampToDate(timestamp: any): Date {
    return timestamp?.toDate() || new Date();
  }

  private dateToTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }

  private convertTimestampFields(data: any): any {
    if (!data) return data;
    const converted = { ...data };
    for (const key in converted) {
      if (converted[key] && typeof converted[key].toDate === 'function') {
        converted[key] = converted[key] as Timestamp;
      }
    }
    return converted;
  }

  // User operations
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.generateId();
    const now = Timestamp.now();
    
    const user: User = {
      id,
      phone: userData.phone,
      name: userData.name,
      email: userData.email,
      isVerified: userData.isVerified || false,
      createdAt: now as any,
      updatedAt: now as any,
    };

    await this.db.collection('users').doc(id).set(user);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const snapshot = await this.db.collection('users').where('phone', '==', phone).limit(1).get();
    if (snapshot.empty) return null;
    
    return snapshot.docs[0].data() as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    
    return doc.data() as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userRef = this.db.collection('users').doc(id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    await userRef.update(updateData);
    const doc = await userRef.get();
    
    if (!doc.exists) return null;
    return doc.data() as User;
  }

  // Offer operations
  async createOffer(offerData: InsertOffer): Promise<Offer> {
    const id = this.generateId();
    const now = Timestamp.now();
    
    // Prepare the offer object, excluding undefined values to prevent Firestore errors
    const offer: Offer = {
      id,
      fromUserId: offerData.fromUserId,
      toUserPhone: offerData.toUserPhone,
      toUserName: offerData.toUserName,
      toUserId: offerData.toUserId || null,
      offerType: offerData.offerType,
      amount: offerData.amount,
      interestRate: offerData.interestRate,
      interestType: offerData.interestType,
      tenureValue: offerData.tenureValue,
      tenureUnit: offerData.tenureUnit,
      repaymentType: offerData.repaymentType,
      allowPartPayment: offerData.allowPartPayment || false,
      gracePeriodDays: offerData.gracePeriodDays || 0,
      prepaymentPenalty: offerData.prepaymentPenalty || 0,
      latePaymentPenalty: offerData.latePaymentPenalty || 0,
      startDate: this.dateToTimestamp(offerData.startDate) as any,
      dueDate: this.dateToTimestamp(offerData.dueDate) as any,
      currentInstallmentNumber: offerData.currentInstallmentNumber || 1,
      status: offerData.status || 'pending',
      createdAt: now as any,
      updatedAt: now as any,
    };

    // Only add optional fields if they have values
    if (offerData.repaymentFrequency !== undefined) {
      offer.repaymentFrequency = offerData.repaymentFrequency;
    }
    if (offerData.purpose !== undefined) {
      offer.purpose = offerData.purpose;
    }
    if (offerData.note !== undefined) {
      offer.note = offerData.note;
    }
    if (offerData.totalInstallments !== undefined) {
      offer.totalInstallments = offerData.totalInstallments;
    }
    if (offerData.nextPaymentDueDate) {
      offer.nextPaymentDueDate = this.dateToTimestamp(offerData.nextPaymentDueDate) as any;
    }
    if (offerData.contractPdfKey !== undefined) {
      offer.contractPdfKey = offerData.contractPdfKey;
    }
    if (offerData.kfsPdfKey !== undefined) {
      offer.kfsPdfKey = offerData.kfsPdfKey;
    }
    if (offerData.schedulePdfKey !== undefined) {
      offer.schedulePdfKey = offerData.schedulePdfKey;
    }

    await this.db.collection('offers').doc(id).set(offer);
    return offer;
  }

  async getOfferById(id: string): Promise<Offer | null> {
    const doc = await this.db.collection('offers').doc(id).get();
    if (!doc.exists) return null;
    
    return doc.data() as Offer;
  }

  async getOffersByUserId(userId: string): Promise<Offer[]> {
    // Get offers where user is the creator (fromUserId)
    const snapshot = await this.db.collection('offers')
      .where('fromUserId', '==', userId)
      .get();

    // Sort on the client side to avoid composite index requirement
    const offers = snapshot.docs.map(doc => doc.data() as Offer);
    return offers.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime; // Desc order
    });
  }

  async getReceivedOffersByUserId(userId: string): Promise<Offer[]> {
    // First get the user to find their phone number
    const user = await this.getUserById(userId);
    if (!user) {
      return [];
    }

    // Get offers where user is the recipient by userId
    const directOffersSnapshot = await this.db.collection('offers')
      .where('toUserId', '==', userId)
      .get();

    // Get offers where user is the recipient by phone number (for offers created before registration)
    const phoneOffersSnapshot = await this.db.collection('offers')
      .where('toUserPhone', '==', user.phone)
      .where('toUserId', '==', null)
      .get();

    // Combine both sets of offers
    const directOffers = directOffersSnapshot.docs.map(doc => doc.data() as Offer);
    const phoneOffers = phoneOffersSnapshot.docs.map(doc => doc.data() as Offer);
    
    // Link phone-based offers to the user now that they're registered
    for (const offer of phoneOffers) {
      try {
        await this.db.collection('offers').doc(offer.id).update({ toUserId: userId });
        offer.toUserId = userId; // Update local copy too
      } catch (error) {
        console.warn(`Failed to link offer ${offer.id} to user ${userId}:`, error);
      }
    }

    // Combine and deduplicate offers
    const allOffers = [...directOffers, ...phoneOffers];
    const uniqueOffers = allOffers.filter((offer, index, self) => 
      index === self.findIndex(o => o.id === offer.id)
    );

    // Sort on the client side to avoid composite index requirement
    return uniqueOffers.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime; // Desc order
    });
  }

  async getOffersByUserIdWithPagination(userId: string, limit: number, startAfter?: string): Promise<{ offers: Offer[], hasMore: boolean, lastDoc?: string }> {
    // For now, get all offers and handle pagination on client side to avoid composite index
    const snapshot = await this.db.collection('offers')
      .where('fromUserId', '==', userId)
      .get();

    // Sort on the client side
    const allOffers = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id } as Offer & { docId: string }));
    const sortedOffers = allOffers.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime; // Desc order
    });

    // Handle pagination logic
    let startIndex = 0;
    if (startAfter) {
      startIndex = sortedOffers.findIndex(offer => offer.docId === startAfter) + 1;
    }

    const paginatedOffers = sortedOffers.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedOffers.length;
    const lastDoc = hasMore && paginatedOffers.length > 0 ? paginatedOffers[paginatedOffers.length - 1].docId : undefined;

    // Remove the temporary docId field
    const offers = paginatedOffers.map(({ docId, ...offer }) => offer as Offer);

    return { offers, hasMore, lastDoc };
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | null> {
    const offerRef = this.db.collection('offers').doc(id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    await offerRef.update(updateData);
    const doc = await offerRef.get();
    
    if (!doc.exists) return null;
    return doc.data() as Offer;
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.generateId();
    const now = Timestamp.now();
    
    const payment: Payment = {
      id,
      offerId: paymentData.offerId,
      amount: paymentData.amount,
      installmentNumber: paymentData.installmentNumber,
      paymentMode: paymentData.paymentMode,
      refString: paymentData.refString,
      status: paymentData.status || 'pending',
      createdAt: now as any,
    };

    await this.db.collection('payments').doc(id).set(payment);
    return payment;
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const doc = await this.db.collection('payments').doc(id).get();
    if (!doc.exists) return null;
    
    return doc.data() as Payment;
  }

  async getPaymentsByOfferId(offerId: string): Promise<Payment[]> {
    const snapshot = await this.db.collection('payments')
      .where('offerId', '==', offerId)
      .get();
    
    // Sort on the client side to avoid composite index requirement
    const payments = snapshot.docs.map(doc => doc.data() as Payment);
    return payments.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime; // Desc order
    });
  }

  async updatePayment(id: string, updates: UpdatePayment): Promise<Payment | null> {
    const paymentRef = this.db.collection('payments').doc(id);
    const updateData: any = { ...updates };
    
    if (updates.paidAt) {
      const paidAt = updates.paidAt as any;
      updateData.paidAt = this.dateToTimestamp(paidAt.toDate ? paidAt.toDate() : paidAt) as any;
    }
    
    await paymentRef.update(updateData);
    const doc = await paymentRef.get();
    
    if (!doc.exists) return null;
    return doc.data() as Payment;
  }

  async getExpiredPendingPayments(): Promise<Payment[]> {
    const now = Timestamp.now();
    const snapshot = await this.db.collection('payments')
      .where('status', '==', 'pending')
      .where('createdAt', '<', Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000)) // 24 hours ago
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Payment);
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.generateId();
    const now = Timestamp.now();
    
    const notification: Notification = {
      id,
      userId: notificationData.userId,
      offerId: notificationData.offerId,
      type: notificationData.type,
      priority: notificationData.priority || 'medium',
      title: notificationData.title,
      message: notificationData.message,
      isRead: false,
      scheduledFor: notificationData.scheduledFor ? this.dateToTimestamp(notificationData.scheduledFor) as any : now as any,
      expiresAt: notificationData.expiresAt ? this.dateToTimestamp(notificationData.expiresAt) as any : undefined,
      metadata: notificationData.metadata,
      batchId: notificationData.batchId,
      createdAt: now as any,
    };

    await this.db.collection('notifications').doc(id).set(notification);
    return notification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const snapshot = await this.db.collection('notifications')
      .where('userId', '==', userId)
      .get();
    
    // Sort on the client side to avoid composite index requirement
    const notifications = snapshot.docs.map(doc => doc.data() as Notification);
    return notifications.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime; // Desc order
    });
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      await this.db.collection('notifications').doc(id).update({
        isRead: true,
        readAt: Timestamp.now(),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // OTP operations
  async createOTP(phone: string, code: string): Promise<OTPCode> {
    const id = this.generateId();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000); // 10 minutes
    
    const otp: OTPCode = {
      id,
      phone,
      code,
      expiresAt: expiresAt as any,
      used: false,
      createdAt: now as any,
    };

    await this.db.collection('otp_codes').doc(id).set(otp);
    return otp;
  }

  async getValidOTP(phone: string, code: string): Promise<OTPCode | null> {
    const now = Timestamp.now();
    const snapshot = await this.db.collection('otp_codes')
      .where('phone', '==', phone)
      .where('code', '==', code)
      .where('used', '==', false)
      .where('expiresAt', '>', now)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as OTPCode;
  }

  async markOTPAsUsed(id: string): Promise<boolean> {
    try {
      await this.db.collection('otp_codes').doc(id).update({
        used: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async cleanupExpiredOTPs(): Promise<number> {
    const now = Timestamp.now();
    const snapshot = await this.db.collection('otp_codes')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  }
}

export { FirestoreStorage };