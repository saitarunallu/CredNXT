import admin from 'firebase-admin';
import { initializeFirebase } from './firebase-config';
import { 
  User, Offer, Payment, Notification, OTPCode, 
  InsertUser, InsertOffer, InsertPayment, InsertNotification,
  UpdatePayment 
} from '../shared/firestore-schema';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

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
  linkOffersToUser(userId: string, phone: string): Promise<void>;
  
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

  // Enhanced helper methods for Firebase data operations
  /**
   * Converts a given Firestore timestamp to a JavaScript Date object.
   * @example
   * timestampToDate(firebaseTimestamp)
   * // Returns a Date object corresponding to the provided Firebase Timestamp.
   * @param {any} timestamp - The timestamp object or value to convert into a Date. Can be a Firebase Timestamp, Firestore timestamp, ISO string, or regular date.
   * @returns {Date} A JavaScript Date object representing the equivalent date and time of the given timestamp.
   */
  private timestampToDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    
    try {
      // Handle Firebase Timestamp objects
      if (timestamp._seconds !== undefined) {
        return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
      }
      
      // Handle Firestore toDate() method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      
      // Handle ISO strings and regular dates
      return new Date(timestamp);
    } catch (error) {
      console.error('Error converting timestamp:', error, timestamp);
      return new Date();
    }
  }

  /**
   * Converts a provided date into a Timestamp.
   * @example
   * dateToTimestamp(new Date());
   * // returns a Timestamp object based on the current date
   * @param {(Date|string|any)} date - The date to convert to a Timestamp, which can be a Date object, a date string, or any object with a _seconds property.
   * @returns {Timestamp} The function returns a Timestamp object representing the provided date. If conversion fails, it returns the current Timestamp.
   */
  private dateToTimestamp(date: Date | string | any): Timestamp {
    try {
      if (date instanceof Date) {
        return Timestamp.fromDate(date);
      }
      if (typeof date === 'string') {
        return Timestamp.fromDate(new Date(date));
      }
      if (date?._seconds !== undefined) {
        return date as Timestamp;
      }
      return Timestamp.fromDate(new Date(date));
    } catch (error) {
      console.error('Error converting date to timestamp:', error, date);
      return Timestamp.now();
    }
  }

  /**
   * Converts specific fields in an object from their original format to a Timestamp format if applicable.
   * @example
   * convertTimestampFields({ createdAt: someValue })
   * // Returns the object with 'createdAt' converted to a Timestamp if applicable
   * @param {any} data - The data object that contains fields to be converted.
   * @returns {any} The data object with specific fields converted to Timestamps if they have a 'toDate' method.
   */
  private convertTimestampFields(data: any): any {
    if (!data) return data;
    const converted = { ...data };
    
    // Convert specific timestamp fields
    const timestampFields = ['createdAt', 'updatedAt', 'startDate', 'dueDate', 'nextPaymentDueDate', 'scheduledFor', 'expiresAt', 'paidAt'];
    
    for (const field of timestampFields) {
      if (converted[field] && typeof converted[field].toDate === 'function') {
        converted[field] = converted[field] as Timestamp;
      }
    }
    
    return converted;
  }

  // Enhanced error handling with retry logic
  /**
   * Executes an asynchronous operation with automatic retries for retryable errors.
   * @example
   * executeWithRetry(() => databaseOperation(), 5)
   * @param {() => Promise<T>} operation - The asynchronous operation to be attempted with retries.
   * @param {number} maxRetries - The maximum number of retry attempts before failing, default is 3.
   * @returns {Promise<T>} Resolves with the result of the operation if successful, or throws an error if all retries fail.
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) {
          console.error(`Operation failed after ${maxRetries} attempts:`, error);
          throw error;
        }
        
        // Check if it's a retryable error
        if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || error.code === 'resource-exhausted') {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Non-retryable error, throw immediately
        throw error;
      }
    }
    throw new Error('Unexpected end of retry loop');
  }

  // Enhanced data validation
  /**
  * Validates and cleans the input data by removing undefined values and specified fields.
  * @example
  * validateAndCleanData({ name: "John", age: undefined, password: "12345" }, ["password"])
  * // Returns: { name: "John" }
  * @param {any} data - The input data object that needs validation and cleaning.
  * @param {string[]} [excludeFields=[]] - An array of field names to be excluded from the cleaned data.
  * @returns {any} A new object with undefined values and specified fields removed.
  **/
  private validateAndCleanData(data: any, excludeFields: string[] = []): any {
    if (!data) return data;
    
    const cleaned = { ...data };
    
    // Remove undefined values and specified fields
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || excludeFields.includes(key)) {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  }

  // User operations
  /**
  * Creates a new user in the database by validating and cleaning the provided user data.
  * @example
  * createUser({ name: 'John Doe', email: 'john.doe@example.com', phone: '1234567890' })
  * returns Promise resolving to the created User object with additional metadata like id and timestamps.
  * @param {InsertUser} userData - The user data object containing details like name, email, and phone.
  * @returns {Promise<User>} A promise that resolves to a User object containing the stored user data with additional attributes like id, createdAt, and updatedAt.
  **/
  async createUser(userData: InsertUser): Promise<User> {
    return this.executeWithRetry(async () => {
      const id = this.generateId();
      const now = Timestamp.now();
      
      const cleanedData = this.validateAndCleanData(userData);
      
      const user: User = {
        id,
        phone: cleanedData.phone,
        name: cleanedData.name,
        email: cleanedData.email,
        isVerified: cleanedData.isVerified || false,
        createdAt: now as any,
        updatedAt: now as any,
      };

      await this.db.collection('users').doc(id).set(user);
      return user;
    });
  }

  /**
   * Retrieves a user by their phone number from the Firestore database.
   * @example
   * getUserByPhone('+1234567890')
   * // returns Promise<User | null> with the user's data or null if not found
   * @param {string} phone - The phone number to search for in the database.
   * @returns {Promise<User | null>} A Promise that resolves to a User object or null if no user is found.
   */
  async getUserByPhone(phone: string): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const snapshot = await this.db.collection('users').where('phone', '==', phone).limit(1).get();
      if (snapshot.empty) return null;
      
      const userData = snapshot.docs[0].data();
      
      // Ensure string fields are properly serialized
      if (userData) {
        if (userData.name && typeof userData.name === 'object') {
          userData.name = String(userData.name);
        }
        if (userData.email && typeof userData.email === 'object') {
          userData.email = String(userData.email);
        }
        if (userData.phone && typeof userData.phone === 'object') {
          userData.phone = String(userData.phone);
        }
      }
      
      return this.convertTimestampFields(userData) as User;
    });
  }

  /**
  * Retrieves a user by their ID from the Firestore database.
  * @example
  * getUserById('12345')
  * Promise<User | null>
  * @param {string} id - The ID of the user to retrieve.
  * @returns {Promise<User | null>} A promise that resolves to a User object if found, or null if the user does not exist.
  **/
  async getUserById(id: string): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const doc = await this.db.collection('users').doc(id).get();
      if (!doc.exists) return null;
      
      const userData = doc.data();
      
      // Ensure string fields are properly serialized
      if (userData) {
        if (userData.name && typeof userData.name === 'object') {
          userData.name = String(userData.name);
        }
        if (userData.email && typeof userData.email === 'object') {
          userData.email = String(userData.email);
        }
        if (userData.phone && typeof userData.phone === 'object') {
          userData.phone = String(userData.phone);
        }
      }
      
      return this.convertTimestampFields(userData) as User;
    });
  }

  /**
  * Updates a user document in the database with specified fields and returns the updated user or null if not found.
  * @example
  * updateUser('userId123', {name: 'John Doe'})
  * // Returns: { id: 'userId123', name: 'John Doe', updatedAt: ... }
  * @param {string} id - The ID of the user document to update.
  * @param {Partial<User>} updates - An object containing the fields to be updated in the user document.
  * @returns {Promise<User | null>} The updated user object or null if the document does not exist.
  **/
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
  /**
   * Creates a new offer and stores it in the database.
   * @example
   * createOffer({
   *   fromUserId: 'user123',
   *   toUserPhone: '1234567890',
   *   toUserName: 'John Doe',
   *   offerType: 'loan',
   *   amount: 1000,
   *   interestRate: 5,
   *   interestType: 'fixed',
   *   tenureValue: 12,
   *   tenureUnit: 'months',
   *   repaymentType: 'EMI',
   *   startDate: new Date(),
   *   dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
   * })
   * // Returns a Promise resolving to an Offer object
   * @param {InsertOffer} offerData - The data required to create an offer, including user IDs, amount, interest details, tenure, and more.
   * @returns {Promise<Offer>} A promise that resolves to the created Offer object.
   */
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
    return this.executeWithRetry(async () => {
      const doc = await this.db.collection('offers').doc(id).get();
      if (!doc.exists) return null;
      
      const offerData = doc.data();
      return this.convertTimestampFields(offerData) as Offer;
    });
  }

  /**
   * Retrieves and sorts offers created by a specific user.
   * @example
   * getOffersByUserId('user123')
   * Promise resolving to an array of Offer objects sorted by creation date in descending order.
   * @param {string} userId - The ID of the user for which to retrieve offers.
   * @returns {Promise<Offer[]>} A promise that resolves to an array of offers created by the specified user, sorted by creation date in descending order.
   */
  async getOffersByUserId(userId: string): Promise<Offer[]> {
    return this.executeWithRetry(async () => {
      // Get offers where user is the creator (fromUserId)
      const snapshot = await this.db.collection('offers')
        .where('fromUserId', '==', userId)
        .get();

      // Convert and sort on the client side to avoid composite index requirement
      const offers = snapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestampFields(data) as Offer;
      });
      
      return offers.sort((a, b) => {
        const aTime = this.timestampToDate(a.createdAt).getTime();
        const bTime = this.timestampToDate(b.createdAt).getTime();
        return bTime - aTime; // Desc order
      });
    });
  }

  /**
   * Retrieves and returns the received offers for a user by their userId.
   * @example
   * getReceivedOffersByUserId('user123')
   * Promise resolves to a sorted array of Offer objects
   * @param {string} userId - The ID of the user for whom to retrieve received offers.
   * @returns {Promise<Offer[]>} A promise that resolves to an array of offers, sorted in descending order by creation date.
   */
  async getReceivedOffersByUserId(userId: string): Promise<Offer[]> {
    return this.executeWithRetry(async () => {
      // Get offers where user is the recipient by userId (already linked offers)
      const directOffersSnapshot = await this.db.collection('offers')
        .where('toUserId', '==', userId)
        .get();

      const directOffers = directOffersSnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestampFields(data) as Offer;
      });

      console.log(`Found ${directOffers.length} received offers for user ${userId}`);

      // Sort using enhanced timestamp conversion
      return directOffers.sort((a, b) => {
        const aTime = this.timestampToDate(a.createdAt).getTime();
        const bTime = this.timestampToDate(b.createdAt).getTime();
        return bTime - aTime; // Desc order
      });
    });
  }

  /**
   * Links offers in the database to a user based on their phone number.
   * @example
   * linkOffersToUser('123456', '+919876543210')
   * // Returns a promise that resolves when the offers are linked and notifications are created
   * @param {string} userId - The ID of the user to whom the offers will be linked.
   * @param {string} phone - The phone number used to find offers in the database.
   * @returns {Promise<void>} A promise that resolves when the offers are successfully linked to the user.
   */
  async linkOffersToUser(userId: string, phone: string): Promise<void> {
    try {
      // With consistent phone normalization, we only need to check one format
      // All phone numbers are now stored consistently with +91 prefix
      console.log(`Linking offers to user ${userId} with phone ${phone}`);

      // Get offers where toUserPhone matches and toUserId is null
      const phoneOffersSnapshot = await this.db.collection('offers')
        .where('toUserPhone', '==', phone)
        .where('toUserId', '==', null)
        .get();
      
      const phoneOffers = phoneOffersSnapshot.docs.map(doc => doc.data() as Offer);
      
      console.log(`Found ${phoneOffers.length} offers to link to user ${userId}`);
      
      // Update each offer to link it to the user
      for (const offer of phoneOffers) {
        await this.db.collection('offers').doc(offer.id).update({ toUserId: userId });
        
        // Create notification for the linked offer
        const notification = {
          id: randomUUID(),
          userId: userId,
          offerId: offer.id,
          type: 'offer_received' as const,
          title: 'New Offer Received',
          message: `You have received a new ${offer.offerType} offer for ₹${offer.amount}`,
          priority: 'high' as const,
          isRead: false,
          scheduledFor: new Date(),
          createdAt: new Date()
        };
        
        await this.db.collection('notifications').doc(notification.id).set(notification);
        console.log(`Created notification for linked offer ${offer.id} to user ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to link offers to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves and paginates offers made by a specific user.
   * @example
   * getOffersByUserIdWithPagination('user123', 10, 'docId456')
   * // Returns: Promise<{ offers: Offer[], hasMore: boolean, lastDoc?: string }>
   * @param {string} userId - The ID of the user whose offers need to be retrieved.
   * @param {number} limit - The maximum number of offers to return.
   * @param {string} [startAfter] - The document ID after which to start retrieving offers.
   * @returns {Promise<{ offers: Offer[], hasMore: boolean, lastDoc?: string }>} An object containing the paginated offers, a flag indicating if there are more offers, and optionally the document ID of the last offer retrieved.
   */
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

  /**
   * Updates an existing offer in the database with the specified updates and returns the updated offer.
   * @example
   * updateOffer("offer123", { price: 99.99 })
   * // Returns the updated offer object or null if not found
   * @param {string} id - The unique identifier of the offer to update.
   * @param {Partial<Offer>} updates - An object containing the fields to update with their new values.
   * @returns {Promise<Offer|null>} Returns a promise that resolves to the updated offer object or null if the offer does not exist.
   */
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
  /**
   * Asynchronously creates a payment record in the database and returns the created payment object.
   * @example
   * createPayment({ offerId: '123', amount: 100, installmentNumber: 1, paymentMode: 'credit', refString: 'REF123', status: 'completed' })
   * // Returns a promise that resolves to the created Payment object
   * @param {InsertPayment} paymentData - The payment data to be validated, cleaned, and stored in the database.
   * @returns {Promise<Payment>} A promise that resolves to the payment object created in the database.
   */
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    return this.executeWithRetry(async () => {
      const id = this.generateId();
      const now = Timestamp.now();
      
      const cleanedData = this.validateAndCleanData(paymentData);
      
      const payment: Payment = {
        id,
        offerId: cleanedData.offerId,
        amount: cleanedData.amount,
        installmentNumber: cleanedData.installmentNumber,
        paymentMode: cleanedData.paymentMode,
        refString: cleanedData.refString,
        status: cleanedData.status || 'pending',
        createdAt: now as any,
      };

      await this.db.collection('payments').doc(id).set(payment);
      return payment;
    });
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const doc = await this.db.collection('payments').doc(id).get();
    if (!doc.exists) return null;
    
    return doc.data() as Payment;
  }

  /**
   * Retrieves a list of payments associated with a specific offer ID, sorted by creation date in descending order.
   * @example
   * getPaymentsByOfferId('offer123')
   * // Returns a promise that resolves to an array of Payment objects associated with 'offer123'
   * @param {string} offerId - The unique identifier of the offer for which payments need to be retrieved.
   * @returns {Promise<Payment[]>} A promise that resolves to an array of Payment objects sorted by creation date in descending order.
   */
  async getPaymentsByOfferId(offerId: string): Promise<Payment[]> {
    return this.executeWithRetry(async () => {
      if (!offerId || offerId === 'undefined') {
        console.warn('Invalid offerId provided to getPaymentsByOfferId:', offerId);
        return [];
      }
      
      const snapshot = await this.db.collection('payments')
        .where('offerId', '==', offerId)
        .get();
      
      // Convert and sort on the client side to avoid composite index requirement
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestampFields(data) as Payment;
      });
      
      return payments.sort((a, b) => {
        const aTime = this.timestampToDate(a.createdAt).getTime();
        const bTime = this.timestampToDate(b.createdAt).getTime();
        return bTime - aTime; // Desc order
      });
    });
  }

  /**
  * Updates the specified payment with the provided changes and returns the updated payment data.
  * @example
  * updatePayment("paymentId123", { amount: 100, paidAt: new Date() })
  * { id: "paymentId123", amount: 100, paidAt: "2023-09-21T14:52:00.000Z" }
  * @param {string} id - The ID of the payment document to update.
  * @param {UpdatePayment} updates - The payment updates to apply.
  * @returns {Promise<Payment | null>} The updated payment data or null if the document does not exist.
  **/
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
  /**
   * Creates and saves a notification in the database with given data.
   * @example
   * createNotification({
   *   userId: 'user123',
   *   offerId: 'offer456',
   *   type: 'info',
   *   priority: 'high',
   *   title: 'Sample Title',
   *   message: 'Sample message content',
   *   scheduledFor: new Date('2023-10-05'),
   *   expiresAt: new Date('2023-10-10'),
   *   metadata: {},
   *   batchId: 'batch789'
   * }).then(notification => console.log(notification))
   * // Returns the notification object saved in the database.
   * @param {InsertNotification} notificationData - An object containing all necessary notification details.
   * @returns {Promise<Notification>} A promise that resolves to the created notification object.
   */
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    return this.executeWithRetry(async () => {
      const id = this.generateId();
      const now = Timestamp.now();
      
      const cleanedData = this.validateAndCleanData(notificationData);
      
      const notification: Notification = {
        id,
        userId: cleanedData.userId,
        offerId: cleanedData.offerId,
        type: cleanedData.type,
        priority: cleanedData.priority || 'medium',
        title: cleanedData.title,
        message: cleanedData.message,
        isRead: false,
        scheduledFor: cleanedData.scheduledFor ? this.dateToTimestamp(cleanedData.scheduledFor) as any : now as any,
        expiresAt: cleanedData.expiresAt ? this.dateToTimestamp(cleanedData.expiresAt) as any : undefined,
        metadata: cleanedData.metadata,
        batchId: cleanedData.batchId,
        createdAt: now as any,
      };

      await this.db.collection('notifications').doc(id).set(notification);
      return notification;
    });
  }

  /**
   * Retrieves notifications for a specific user, ordered by creation date in descending order.
   * @example
   * getNotificationsByUserId('userId123')
   * // Returns: Promise resolving to an array of notifications
   * @param {string} userId - The ID of the user whose notifications are to be retrieved.
   * @returns {Promise<Notification[]>} A promise that resolves to an array of Notification objects.
   */
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return this.executeWithRetry(async () => {
      const snapshot = await this.db.collection('notifications')
        .where('userId', '==', userId)
        .get();
        
      // Convert timestamps and sort
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestampFields(data) as Notification;
      });
      
      return notifications.sort((a, b) => {
        const aTime = this.timestampToDate(a.createdAt).getTime();
        const bTime = this.timestampToDate(b.createdAt).getTime();
        return bTime - aTime; // Desc order
      });
    });
  }

  /**
  * Marks a notification as read in the database and returns a promise with the operation result.
  * @example
  * markNotificationAsRead('notificationId123')
  * // returns Promise<boolean>
  * @param {string} id - The ID of the notification to be marked as read.
  * @returns {Promise<boolean>} A promise that resolves to true if the notification was successfully marked as read, or false if an error occurred.
  **/
  async markNotificationAsRead(id: string): Promise<boolean> {
    return this.executeWithRetry(async () => {
      try {
        await this.db.collection('notifications').doc(id).update({
          isRead: true,
          readAt: Timestamp.now(),
        });
        return true;
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }
    });
  }

  // OTP operations
  /**
   * Generates and stores a one-time password (OTP) for a given phone number.
   * @example
   * createOTP("+1234567890", "123456").then(otp => console.log(otp));
   * @param {string} phone - The phone number for which the OTP is generated.
   * @param {string} code - The OTP code to be stored.
   * @returns {Promise<OTPCode>} A promise that resolves to the created OTP code object.
   */
  async createOTP(phone: string, code: string): Promise<OTPCode> {
    return this.executeWithRetry(async () => {
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
    });
  }

  /**
   * Retrieves a valid OTP code for the given phone and code combination.
   * @example
   * getValidOTP('+1234567890', '123456')
   * // returns a Promise resolving to an OTPCode object or null
   * @param {string} phone - The phone number associated with the OTP.
   * @param {string} code - The OTP code to validate.
   * @returns {Promise<OTPCode | null>} A promise that resolves to the valid OTPCode object if found, or null if not.
   */
  async getValidOTP(phone: string, code: string): Promise<OTPCode | null> {
    return this.executeWithRetry(async () => {
      const now = Timestamp.now();
      const snapshot = await this.db.collection('otp_codes')
        .where('phone', '==', phone)
        .where('code', '==', code)
        .where('used', '==', false)
        .where('expiresAt', '>', now)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const otpData = snapshot.docs[0].data();
      return this.convertTimestampFields(otpData) as OTPCode;
    });
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

  /**
   * Cleans up expired OTP entries from the 'otp_codes' Firestore collection.
   * @example
   * cleanupExpiredOTPs().then((deletedCount) => console.log(deletedCount))
   * // Sample output: 12
   * @returns {Promise<number>} A promise that resolves to the number of expired OTP entries deleted.
   */
  async cleanupExpiredOTPs(): Promise<number> {
    return this.executeWithRetry(async () => {
      const now = Timestamp.now();
      const snapshot = await this.db.collection('otp_codes')
        .where('expiresAt', '<', now)
        .get();
      
      if (snapshot.empty) return 0;
      
      // Process deletions in batches to avoid hitting Firestore limits (500 operations per batch)
      const batchSize = 400;
      const docs = snapshot.docs;
      let deletedCount = 0;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = this.db.batch();
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += batchDocs.length;
      }
      
      return deletedCount;
    });
  }

  // Pending offer notifications for unregistered users
  /**
   * Creates and stores a pending offer notification in the database.
   * @example
   * createPendingOfferNotification({ someData: 'value', createdAt: '2023-10-01', expiresAt: '2023-10-10' })
   * Returns the stored notification object.
   * @param {Object} data - The data for the pending offer notification, including createdAt and expiresAt dates.
   * @returns {Promise<Object>} A promise that resolves to the notification object stored in the database.
   */
  async createPendingOfferNotification(data: any): Promise<any> {
    return this.executeWithRetry(async () => {
      const id = this.generateId();
      
      const notification = {
        id,
        ...data,
        createdAt: this.dateToTimestamp(data.createdAt) as any,
        expiresAt: this.dateToTimestamp(data.expiresAt) as any,
        delivered: false
      };

      await this.db.collection('pending_offer_notifications').doc(id).set(notification);
      return notification;
    });
  }

  /**
  * Retrieves pending offer notifications for a given phone number from the database
  * @example
  * getPendingOfferNotificationsByPhone('123456789')
  * [{...}, {...}]
  * @param {string} phone - Phone number used to filter pending offer notifications.
  * @returns {Promise<any[]>} A promise that resolves to an array of pending offer notifications.
  **/
  async getPendingOfferNotificationsByPhone(phone: string): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const snapshot = await this.db.collection('pending_offer_notifications')
        .where('recipientPhone', '==', phone)
        .where('delivered', '==', false)
        .where('expiresAt', '>', Timestamp.now())
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestampFields(data);
      });
    });
  }

  async markPendingOfferNotificationAsDelivered(id: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.db.collection('pending_offer_notifications').doc(id).update({
        delivered: true,
        deliveredAt: Timestamp.now()
      });
    });
  }
}

export { FirestoreStorage };