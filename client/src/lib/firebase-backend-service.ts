import { auth } from './firebase-config';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';

const db = getFirestore();

// Check if we're in production (Firebase hosting) - Define first to avoid circular dependency
const isProduction = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('firebaseapp.com') || 
         hostname.includes('web.app') || 
         hostname.includes('crednxt-ef673') ||
         hostname.includes('crednxt.com');
};

// Firebase Functions URLs - Environment-aware routing
const getApiBaseUrl = (): string => {
  // Use environment variable if explicitly set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  if (isProduction()) {
    // Dynamic Cloud Run URL generation
    const projectId = 'crednxt-ef673';
    const functionName = 'api';
    return `https://${functionName}-mzz6re522q-uc.a.run.app`;
  }
  // Development - use standard Firebase Functions format
  const FIREBASE_FUNCTIONS_BASE = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'crednxt-ef673'}.cloudfunctions.net`;
  return `${FIREBASE_FUNCTIONS_BASE}/api`;
};

// Environment-aware PDF service URL - Use main API for all PDF operations
const getPdfServiceUrl = () => {
  // Use environment variable if explicitly set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  if (isProduction()) {
    // Dynamic Cloud Run URL generation
    const projectId = 'crednxt-ef673';
    const functionName = 'api';
    return `https://${functionName}-mzz6re522q-uc.a.run.app`;
  }
  // Use current domain for Replit development environment
  const currentOrigin = window.location.origin;
  return `${currentOrigin}/api`; // Local development
};

// Get auth token for API calls
const getAuthToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null;
  
  try {
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

// Make authenticated API request
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

// Normalize Firestore data for consistent timestamps
const normalizeFirestoreData = (data: any): any => {
  if (!data) return data;
  
  const normalized = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  Object.keys(normalized).forEach(key => {
    if (normalized[key] && typeof normalized[key] === 'object') {
      if (normalized[key].toDate && typeof normalized[key].toDate === 'function') {
        normalized[key] = normalized[key].toDate().toISOString();
      } else if (normalized[key].seconds !== undefined) {
        // Handle Firestore Timestamp objects
        normalized[key] = new Date(normalized[key].seconds * 1000).toISOString();
      }
    }
  });
  
  return normalized;
};

export class FirebaseBackendService {
  // Health check
  async healthCheck(): Promise<{ status: string; responseTime: number }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${getApiBaseUrl()}/health`);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return { status: data.status, responseTime };
      } else {
        return { status: 'error', responseTime };
      }
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', responseTime: 0 };
    }
  }

  // User management
  async checkPhone(phone: string): Promise<{ exists: boolean; user?: any }> {
    try {
      // Try API first
      const response = await fetch(`${getApiBaseUrl()}/users/check-phone?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
    }

    // Fallback to direct Firestore access
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      const phoneVariants = [
        phone,
        normalizedPhone,
        `+91${normalizedPhone}`,
        normalizedPhone.startsWith('91') ? normalizedPhone.substring(2) : normalizedPhone
      ];

      for (const phoneVariant of phoneVariants) {
        const usersQuery = query(
          collection(db, 'users'),
          where('phone', '==', phoneVariant),
          limit(1)
        );
        const snapshot = await getDocs(usersQuery);
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = normalizeFirestoreData(userDoc.data());
          return {
            exists: true,
            user: {
              id: userDoc.id,
              name: userData.name || '',
              phone: userData.phone
            }
          };
        }
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Phone check failed:', error);
      return { exists: false };
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/users/me`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
    }

    // Fallback to direct Firestore access
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = normalizeFirestoreData(userDoc.data());
        return {
          id: userDoc.id,
          ...userData
        };
      }
      throw new Error('User not found');
    } catch (error) {
      console.error('Get current user failed:', error);
      throw error;
    }
  }

  // Offer management
  async getOffers(): Promise<any[]> {
    try {
      const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/offers`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
    }

    // Fallback to direct Firestore access
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      // Get current user data to find phone number
      const currentUserData = await this.getCurrentUser();
      
      const sentQuery = query(
        collection(db, 'offers'),
        where('fromUserId', '==', user.uid)
      );
      const receivedQuery = query(
        collection(db, 'offers'),
        where('toUserId', '==', user.uid)
      );
      
      // Also search by phone number for offers sent to this user's phone
      // Handle both formats: with + and without +
      const phoneQueries = [];
      if (currentUserData?.phone) {
        const phoneWithPlus = currentUserData.phone;
        const phoneWithoutPlus = currentUserData.phone.startsWith('+') 
          ? currentUserData.phone.substring(1) 
          : currentUserData.phone;
        
        // Query for phone with + prefix
        phoneQueries.push(query(
          collection(db, 'offers'),
          where('toUserPhone', '==', phoneWithPlus)
        ));
        
        // Query for phone without + prefix (if different)
        if (phoneWithPlus !== phoneWithoutPlus) {
          phoneQueries.push(query(
            collection(db, 'offers'),
            where('toUserPhone', '==', phoneWithoutPlus)
          ));
        }
      }

      const queryPromises = [
        getDocs(sentQuery),
        getDocs(receivedQuery),
        ...phoneQueries.map(phoneQuery => getDocs(phoneQuery))
      ];

      const snapshots = await Promise.all(queryPromises);
      const [sentSnapshot, receivedSnapshot, phoneSnapshot] = snapshots;

      const sentOffers = sentSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
      const receivedOffers = receivedSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
      const phoneOffers = phoneSnapshot ? phoneSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) : [];
      
      // Filter out duplicates (offers found both by userId and phone)
      const receivedOfferIds = new Set(receivedOffers.map(offer => offer.id));
      const uniquePhoneOffers = phoneOffers.filter(offer => !receivedOfferIds.has(offer.id));
      
      const allOffers = [
        ...sentOffers,
        ...receivedOffers,
        ...uniquePhoneOffers
      ];

      return allOffers;
    } catch (error) {
      console.error('Get offers failed:', error);
      throw error;
    }
  }

  async getOffer(id: string): Promise<any> {
    try {
      const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/offers/${id}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
    }

    // Fallback to direct Firestore access
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const offerDoc = await getDoc(doc(db, 'offers', id));
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }

      const offerData = normalizeFirestoreData(offerDoc.data());
      
      // Check authorization
      if (offerData.fromUserId !== user.uid && offerData.toUserId !== user.uid) {
        throw new Error('Access denied');
      }

      return {
        id: offerDoc.id,
        ...offerData
      };
    } catch (error) {
      console.error('Get offer failed:', error);
      throw error;
    }
  }

  async updateOfferStatus(id: string, status: string): Promise<any> {
    try {
      const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/offers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update offer');
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
      
      // Fallback to direct Firestore access
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const offerRef = doc(db, 'offers', id);
        const offerDoc = await getDoc(offerRef);
        
        if (!offerDoc.exists()) {
          throw new Error('Offer not found');
        }

        const offerData = offerDoc.data();
        
        // Check authorization
        if (status === 'accepted' || status === 'declined') {
          if (offerData?.toUserId !== user.uid) {
            throw new Error('Only offer recipient can accept/decline');
          }
        } else if (status === 'cancelled') {
          if (offerData?.fromUserId !== user.uid) {
            throw new Error('Only offer sender can cancel');
          }
        }

        await updateDoc(offerRef, {
          status,
          updatedAt: serverTimestamp()
        });

        const updatedDoc = await getDoc(offerRef);
        return {
          id: updatedDoc.id,
          ...normalizeFirestoreData(updatedDoc.data())
        };
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async createOffer(offerData: any): Promise<any> {
    try {
      const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/offers`, {
        method: 'POST',
        body: JSON.stringify(offerData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create offer');
    } catch (error) {
      console.warn('API call failed, trying direct Firestore access:', error);
      
      // Fallback to direct Firestore access
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        // Calculate due date
        const dueDate = new Date();
        if (offerData.tenureUnit === 'days') {
          dueDate.setDate(dueDate.getDate() + offerData.tenure);
        } else if (offerData.tenureUnit === 'months') {
          dueDate.setMonth(dueDate.getMonth() + offerData.tenure);
        } else if (offerData.tenureUnit === 'years') {
          dueDate.setFullYear(dueDate.getFullYear() + offerData.tenure);
        }

        const firestoreData = {
          ...offerData,
          fromUserId: user.uid,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          dueDate: Timestamp.fromDate(dueDate)
        };

        const offerRef = await addDoc(collection(db, 'offers'), firestoreData);
        const createdDoc = await getDoc(offerRef);
        
        return {
          id: offerRef.id,
          ...normalizeFirestoreData(createdDoc.data())
        };
      } catch (fallbackError) {
        console.error('Fallback create failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // PDF download methods
  async downloadContractPDF(offerId: string): Promise<void> {
    try {
      const token = await getAuthToken();
      const url = `${getPdfServiceUrl()}/offers/${offerId}/pdf/contract`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `loan-contract-${offerId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error('Failed to download contract PDF');
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      throw error;
    }
  }

  async downloadKFSPDF(offerId: string): Promise<void> {
    try {
      const token = await getAuthToken();
      const url = `${getPdfServiceUrl()}/offers/${offerId}/pdf/kfs`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `kfs-${offerId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error('Failed to download KFS PDF');
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      throw error;
    }
  }

  async downloadSchedulePDF(offerId: string): Promise<void> {
    try {
      const token = await getAuthToken();
      const url = `${getPdfServiceUrl()}/offers/${offerId}/pdf/schedule`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `repayment-schedule-${offerId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error('Failed to download schedule PDF');
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      throw error;
    }
  }

  // Get offer with details (for view page)
  async getOfferWithDetails(offerId: string): Promise<any> {
    try {
      console.log('🔍 Fetching offer details for:', offerId);
      
      if (isProduction()) {
        // In production, try to use Firebase Functions API first
        try {
          const token = await getAuthToken();
          const apiBaseUrl = getApiBaseUrl();
          const response = await makeAuthenticatedRequest(`${apiBaseUrl}/offers/${offerId}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Got offer from Firebase Functions API');
            return result;
          }
        } catch (error) {
          console.warn('Firebase Functions API failed, falling back to direct Firestore:', error);
        }
      }
      
      // Direct Firestore access (development or fallback)
      const offerDoc = await getDoc(doc(db, 'offers', offerId));
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = normalizeFirestoreData(offerDoc.data());
      
      // Get related user data
      let fromUser = null;
      let toUser = null;
      
      if (offerData.fromUserId) {
        const fromUserDoc = await getDoc(doc(db, 'users', offerData.fromUserId));
        if (fromUserDoc.exists()) {
          fromUser = normalizeFirestoreData(fromUserDoc.data());
        }
      }
      
      if (offerData.toUserId) {
        const toUserDoc = await getDoc(doc(db, 'users', offerData.toUserId));
        if (toUserDoc.exists()) {
          toUser = normalizeFirestoreData(toUserDoc.data());
        }
      }
      
      // Get payments for this offer
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('offerId', '==', offerId),
        orderBy('createdAt', 'desc')
      );
      
      let payments = [];
      try {
        const paymentsSnapshot = await getDocs(paymentsQuery);
        payments = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...normalizeFirestoreData(doc.data())
        }));
      } catch (error) {
        console.warn('Failed to fetch payments:', error);
        payments = [];
      }
      
      console.log('✅ Got offer from direct Firestore');
      
      // Return in API-compatible format
      return {
        offer: {
          id: offerId,
          ...offerData
        },
        fromUser,
        toUser,
        payments,
        totalPaid: payments
          .filter(p => p.status === 'paid' || p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0),
        pendingAmount: payments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0)
      };
    } catch (error) {
      console.error('Failed to get offer with details:', error);
      throw error;
    }
  }


  async downloadRepaymentSchedule(offerId: string): Promise<Blob> {
    try {
      console.log('📄 Starting repayment schedule download...');
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/schedule`;
      
      console.log('🔗 PDF service URL:', url);
      console.log('🔍 Is production:', isProduction());
      console.log('🔑 Token available:', !!token);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        console.error('PDF download error response:', errorMessage);
        throw new Error(`Failed to download repayment schedule: ${errorMessage}`);
      }

      const blob = await response.blob();
      console.log('✅ Repayment schedule PDF blob received successfully');
      return blob;
    } catch (error) {
      console.error('Repayment schedule download failed:', error);
      throw error;
    }
  }

}

// Export singleton instance
export const firebaseBackend = new FirebaseBackendService();