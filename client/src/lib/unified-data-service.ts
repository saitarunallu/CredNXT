/**
 * Unified Data Service - Single source of truth for all data access
 * Automatically handles environment detection and chooses appropriate data source
 */

import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { apiRequest } from './queryClient';
import type { User, Offer, Payment, Notification } from '@shared/firestore-schema';

interface UnifiedDataService {
  // Environment detection
  isProduction(): boolean;
  
  // Users
  getUser(id: string): Promise<User | null>;
  getUserByPhone(phone: string): Promise<User | null>;
  
  // Offers
  getOffer(id: string): Promise<Offer | null>;
  getOfferWithDetails(id: string): Promise<any>;
  getUserOffers(userId: string): Promise<any[]>;
  getReceivedOffers(userId: string): Promise<any[]>;
  
  // Payments
  getOfferPayments(offerId: string): Promise<Payment[]>;
  getOfferSchedule(offerId: string): Promise<any>;
  getOfferPaymentInfo(offerId: string): Promise<any>;
  
  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
}

class UnifiedDataServiceImpl implements UnifiedDataService {
  private db?: any;
  private auth?: any;
  
  private async initFirebase() {
    if (!this.db) {
      this.db = getFirestore();
      this.auth = getAuth();
    }
  }
  
  isProduction(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('firebaseapp.com') || 
           window.location.hostname.includes('web.app') ||
           window.location.hostname.includes('crednxt-ef673');
  }
  
  private async getCurrentUserId(): Promise<string | null> {
    if (!this.isProduction()) {
      // In development, try to get from localStorage first
      const token = localStorage.getItem('firebase_auth_token') || localStorage.getItem('auth_token');
      if (!token) return null;
      
      // Try API call to get user info
      try {
        const response = await apiRequest('GET', '/api/auth/me');
        const data = await response.json();
        return data.user?.id || null;
      } catch (error) {
        console.log('Failed to get user from API, trying Firebase auth...');
      }
    }
    
    // Use Firebase auth
    await this.initFirebase();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 3000);
      const unsubscribe = this.auth.onAuthStateChanged((user: any) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user?.uid || null);
      });
    });
  }
  
  private normalizeFirestoreData(data: any): any {
    if (!data) return null;
    
    const normalized = { ...data };
    
    // Convert Firestore Timestamps to ISO strings for consistency
    Object.keys(normalized).forEach(key => {
      const value = normalized[key];
      if (value && typeof value === 'object') {
        if (value._seconds && typeof value._seconds === 'number') {
          // Firestore Timestamp format
          normalized[key] = new Date(value._seconds * 1000 + (value._nanoseconds || 0) / 1000000).toISOString();
        } else if (value.seconds && typeof value.seconds === 'number') {
          // Alternative Firestore Timestamp format
          normalized[key] = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000).toISOString();
        }
      }
    });
    
    return normalized;
  }
  
  private async directFirestoreAccess<T>(docPath: string, collectionPath?: string, queryConstraints?: any[]): Promise<T | T[] | null> {
    await this.initFirebase();
    
    try {
      if (collectionPath) {
        // Collection query
        let q = query(collection(this.db, collectionPath));
        if (queryConstraints) {
          q = query(collection(this.db, collectionPath), ...queryConstraints);
        }
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => this.normalizeFirestoreData({ id: doc.id, ...doc.data() }));
        return results as T[];
      } else {
        // Single document
        const docRef = doc(this.db, docPath);
        const snapshot = await getDoc(docRef);
        
        if (!snapshot.exists()) return null;
        
        const data = this.normalizeFirestoreData({ id: snapshot.id, ...snapshot.data() });
        return data as T;
      }
    } catch (error) {
      console.error('Direct Firestore access error:', error);
      return null;
    }
  }
  
  private async apiAccess<T>(endpoint: string): Promise<T | null> {
    try {
      const response = await apiRequest('GET', endpoint);
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('API access error:', error);
      return null;
    }
  }
  
  private async getDataWithFallback<T>(
    apiEndpoint: string,
    firestorePath: string,
    collectionPath?: string,
    queryConstraints?: any[]
  ): Promise<T | T[] | null> {
    if (this.isProduction()) {
      console.log(`🔥 Production: Using direct Firestore access for ${firestorePath}`);
      return this.directFirestoreAccess<T>(firestorePath, collectionPath, queryConstraints);
    } else {
      console.log(`🛠️ Development: Using API endpoint ${apiEndpoint}`);
      const apiResult = await this.apiAccess<T>(apiEndpoint);
      
      if (apiResult) {
        return apiResult;
      }
      
      console.log(`🔄 API failed, falling back to direct Firestore access for ${firestorePath}`);
      return this.directFirestoreAccess<T>(firestorePath, collectionPath, queryConstraints);
    }
  }
  
  // Authentication methods
  async getCurrentUser(): Promise<any> {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();
      
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            resolve({ id: user.uid, phone: user.phoneNumber, email: user.email });
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  // User methods
  async getUser(id: string): Promise<User | null> {
    const result = await this.getDataWithFallback<User>(
      `/api/users/${id}`,
      `users/${id}`
    );
    
    if (Array.isArray(result)) {
      return result[0] || null;
    }
    return result;
  }
  
  async getUserByPhone(phone: string): Promise<User | null> {
    const result = await this.getDataWithFallback<User>(
      `/api/users/by-phone/${encodeURIComponent(phone)}`,
      'users',
      'users',
      [where('phone', '==', phone), limit(1)]
    );
    
    if (Array.isArray(result)) {
      return result[0] || null;
    }
    return result;
  }
  
  // Offer methods
  async getOffer(id: string): Promise<Offer | null> {
    const result = await this.getDataWithFallback<Offer>(
      `/api/offers/${id}`,
      `offers/${id}`
    );
    
    if (Array.isArray(result)) {
      return result[0] || null;
    }
    return result;
  }
  
  async getOfferWithDetails(id: string): Promise<any> {
    const result = await this.getDataWithFallback<any>(
      `/api/offers/${id}`,
      `offers/${id}`
    );
    
    if (result && typeof result === 'object' && 'offer' in result) {
      return result; // API format
    } else {
      return { offer: result }; // Firestore format, wrap in API-compatible structure
    }
  }
  
  async getUserOffers(userId: string): Promise<any[]> {
    const result = await this.getDataWithFallback<any[]>(
      `/api/offers?userId=${userId}`,
      'offers',
      'offers',
      [where('fromUserId', '==', userId), orderBy('createdAt', 'desc')]
    );
    
    return Array.isArray(result) ? result : [];
  }
  
  async getReceivedOffers(userId: string): Promise<any[]> {
    const result = await this.getDataWithFallback<any[]>(
      `/api/offers/received?userId=${userId}`,
      'offers',
      'offers',
      [where('toUserId', '==', userId), orderBy('createdAt', 'desc')]
    );
    
    return Array.isArray(result) ? result : [];
  }
  
  // Payment methods
  async getOfferPayments(offerId: string): Promise<Payment[]> {
    const result = await this.getDataWithFallback<Payment[]>(
      `/api/offers/${offerId}/payments`,
      'payments',
      'payments',
      [where('offerId', '==', offerId), orderBy('createdAt', 'desc')]
    );
    
    if (!result) return [];
    if (Array.isArray(result)) {
      // Handle nested arrays
      return result.flat();
    }
    return [result];
  }
  
  async getOfferSchedule(offerId: string): Promise<any> {
    return this.getDataWithFallback<any>(
      `/api/offers/${offerId}/schedule`,
      `offer-schedules/${offerId}`
    );
  }
  
  async getOfferPaymentInfo(offerId: string): Promise<any> {
    return this.getDataWithFallback<any>(
      `/api/offers/${offerId}/payment-info`,
      `payment-info/${offerId}`
    );
  }
  
  // Notification methods
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const result = await this.getDataWithFallback<Notification[]>(
      `/api/notifications?userId=${userId}`,
      'notifications',
      'notifications',
      [where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50)]
    );
    
    if (!result) return [];
    if (Array.isArray(result)) {
      // Handle nested arrays
      return result.flat();
    }
    return [result];
  }
  
  // Offer Actions
  async acceptOffer(offerId: string): Promise<any> {
    console.log('🎯 Starting offer acceptance for:', offerId);
    
    // Get current user for authorization
    const currentUser = await this.getCurrentUser();
    console.log('👤 Current user:', currentUser?.id);
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Try API first with proper authentication
    try {
      const user = await this.getFirebaseUser();
      if (user) {
        const token = await (user as any).getIdToken();
        const response = await fetch(`/api/offers/${offerId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'accepted' }),
          credentials: 'include'
        });

        if (response.ok) {
          console.log('✅ API offer acceptance successful');
          return await response.json();
        }
      }
    } catch (apiError) {
      console.log('⚠️ API call failed, using direct Firestore fallback:', apiError);
    }

    // Fallback to direct Firestore
    console.log('🔥 Using direct Firestore for offer acceptance');
    await this.initFirebase();
    const { updateDoc, doc, serverTimestamp, getDoc } = await import('firebase/firestore');
    
    try {
      const offerRef = doc(this.db, 'offers', offerId);
      const offerSnap = await getDoc(offerRef);
      
      if (!offerSnap.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerSnap.data();
      
      if (offerData.toUserId !== currentUser.id) {
        throw new Error('Not authorized to accept this offer');
      }
      
      await updateDoc(offerRef, {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Offer accepted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Direct Firestore offer acceptance error:', error);
      throw error;
    }
  }
  
  async rejectOffer(offerId: string): Promise<any> {
    console.log('🎯 Starting offer rejection for:', offerId);
    
    // Get current user for authorization
    const currentUser = await this.getCurrentUser();
    console.log('👤 Current user:', currentUser?.id);
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Try API first with proper authentication
    try {
      const user = await this.getFirebaseUser();
      if (user) {
        const token = await (user as any).getIdToken();
        const response = await fetch(`/api/offers/${offerId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'declined' }),
          credentials: 'include'
        });

        if (response.ok) {
          console.log('✅ API offer rejection successful');
          return await response.json();
        }
      }
    } catch (apiError) {
      console.log('⚠️ API call failed, using direct Firestore fallback:', apiError);
    }

    // Fallback to direct Firestore
    console.log('🔥 Using direct Firestore for offer rejection');
    await this.initFirebase();
    const { updateDoc, doc, serverTimestamp, getDoc } = await import('firebase/firestore');
    
    try {
      const offerRef = doc(this.db, 'offers', offerId);
      const offerSnap = await getDoc(offerRef);
      
      if (!offerSnap.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerSnap.data();
      
      if (offerData.toUserId !== currentUser.id) {
        throw new Error('Not authorized to reject this offer');
      }
      
      await updateDoc(offerRef, {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Offer rejected successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Direct Firestore offer rejection error:', error);
      throw error;
    }
  }

  // PDF Download Methods
  async downloadContract(offerId: string): Promise<Blob> {
    console.log('📄 Starting contract download for offer:', offerId);
    
    if (this.isProduction()) {
      console.log('🌐 Production: Using Firebase Functions for contract download');
      try {
        const user = await this.getFirebaseUser();
        if (!user) {
          throw new Error('Authentication required');
        }

        const token = await (user as any).getIdToken();
        const response = await fetch(`/api/offers/${offerId}/pdf/contract`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.blob();
      } catch (error) {
        console.error('❌ Production contract download failed:', error);
        throw error;
      }
    } else {
      console.log('🛠️ Development: Using API for contract download');
      try {
        const response = await apiRequest('GET', `/api/offers/${offerId}/pdf/contract`);
        return await response.blob();
      } catch (error) {
        console.error('❌ API contract download error:', error);
        throw error;
      }
    }
  }

  async downloadKFS(offerId: string): Promise<Blob> {
    console.log('📋 Starting KFS download for offer:', offerId);
    
    if (this.isProduction()) {
      console.log('🌐 Production: Using Firebase Functions for KFS download');
      try {
        const user = await this.getFirebaseUser();
        if (!user) {
          throw new Error('Authentication required');
        }

        const token = await (user as any).getIdToken();
        const response = await fetch(`/api/offers/${offerId}/pdf/kfs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.blob();
      } catch (error) {
        console.error('❌ Production KFS download failed:', error);
        throw error;
      }
    } else {
      console.log('🛠️ Development: Using API for KFS download');
      try {
        const response = await apiRequest('GET', `/api/offers/${offerId}/pdf/kfs`);
        return await response.blob();
      } catch (error) {
        console.error('❌ API KFS download error:', error);
        throw error;
      }
    }
  }

  async downloadRepaymentSchedule(offerId: string): Promise<Blob> {
    console.log('📅 Starting repayment schedule download for offer:', offerId);
    
    if (this.isProduction()) {
      console.log('🌐 Production: Using Firebase Functions for schedule download');
      try {
        const user = await this.getFirebaseUser();
        if (!user) {
          throw new Error('Authentication required');
        }

        const token = await (user as any).getIdToken();
        const response = await fetch(`/api/offers/${offerId}/pdf/schedule`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.blob();
      } catch (error) {
        console.error('❌ Production schedule download failed:', error);
        throw error;
      }
    } else {
      console.log('🛠️ Development: Using API for schedule download');
      try {
        const response = await apiRequest('GET', `/api/offers/${offerId}/pdf/schedule`);
        return await response.blob();
      } catch (error) {
        console.error('❌ API schedule download error:', error);
        throw error;
      }
    }
  }

  // Helper method to get Firebase auth user
  private async getFirebaseUser() {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();
      
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    } catch (error) {
      console.error('❌ Failed to get Firebase user:', error);
      return null;
    }
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataServiceImpl();