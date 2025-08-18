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

// Firebase Functions URLs
const FUNCTIONS_BASE_URL = 'https://us-central1-crednxt-ef673.cloudfunctions.net';
const API_BASE_URL = `${FUNCTIONS_BASE_URL}/api`;
const PDF_SERVICE_URL = `${FUNCTIONS_BASE_URL}/pdfService`;

// Check if we're in production (Firebase hosting)
const isProduction = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('firebaseapp.com') || hostname.includes('web.app');
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
      const response = await fetch(`${API_BASE_URL}/health`);
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
      const response = await fetch(`${API_BASE_URL}/users/check-phone?phone=${encodeURIComponent(phone)}`);
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/users/me`);
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers`);
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

      const sentQuery = query(
        collection(db, 'offers'),
        where('fromUserId', '==', user.uid)
      );
      const receivedQuery = query(
        collection(db, 'offers'),
        where('toUserId', '==', user.uid)
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const allOffers = [
        ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })),
        ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }))
      ];

      return allOffers;
    } catch (error) {
      console.error('Get offers failed:', error);
      throw error;
    }
  }

  async getOffer(id: string): Promise<any> {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${id}`);
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${id}`, {
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers`, {
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
      const url = `${PDF_SERVICE_URL}/offers/${offerId}/pdf/contract`;
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
      const url = `${PDF_SERVICE_URL}/offers/${offerId}/pdf/kfs`;
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
      const url = `${PDF_SERVICE_URL}/offers/${offerId}/pdf/schedule`;
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
      // Try API first if available
      if (!isProduction()) {
        try {
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${offerId}`);
          if (response.ok) {
            const data = await response.json();
            return normalizeFirestoreData(data);
          }
        } catch (error) {
          console.log('API not available, using direct Firestore');
        }
      }

      // Direct Firestore access
      const offerDoc = await getDoc(doc(db, 'offers', offerId));
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }

      const offerData = { id: offerDoc.id, ...offerDoc.data() } as any;
      
      // Get related user data
      const fromUserDoc = await getDoc(doc(db, 'users', offerData.fromUserId));
      const toUserDoc = offerData.toUserId ? await getDoc(doc(db, 'users', offerData.toUserId)) : null;
      
      return {
        offer: normalizeFirestoreData(offerData),
        fromUser: fromUserDoc.exists() ? normalizeFirestoreData({ id: fromUserDoc.id, ...fromUserDoc.data() }) : null,
        toUser: toUserDoc?.exists() ? normalizeFirestoreData({ id: toUserDoc.id, ...toUserDoc.data() }) : null
      };
    } catch (error) {
      console.error('Error getting offer details:', error);
      throw error;
    }
  }

  // Get offer schedule
  async getOfferSchedule(offerId: string): Promise<any> {
    try {
      // Try API first if available
      if (!isProduction()) {
        try {
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${offerId}/schedule`);
          if (response.ok) {
            const data = await response.json();
            return normalizeFirestoreData(data);
          }
        } catch (error) {
          console.log('API not available for schedule');
        }
      }

      // Get offer details to calculate schedule
      const offerDetails = await this.getOfferWithDetails(offerId);
      if (!offerDetails?.offer) {
        return { schedule: null };
      }

      const offer = offerDetails.offer;
      
      // Calculate schedule using client-side logic
      const schedule = this.calculateOfferSchedule(offer);
      return { schedule };
    } catch (error) {
      console.error('Error getting offer schedule:', error);
      return { schedule: null };
    }
  }

  // Client-side schedule calculation
  private calculateOfferSchedule(offer: any): any {
    try {
      const principal = parseFloat(offer.amount) || 0;
      const annualRate = parseFloat(offer.interestRate) || 0;
      const tenureValue = parseInt(offer.tenureValue) || 0;
      const tenureUnit = offer.tenureUnit || 'months';
      const repaymentType = offer.repaymentType || 'emi';
      const interestType = offer.interestType || 'reducing';

      if (principal <= 0 || annualRate < 0 || tenureValue <= 0) {
        return null;
      }

      // Convert tenure to months
      const tenureInMonths = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
      const monthlyRate = annualRate / 100 / 12;
      
      let emiAmount = 0;
      let totalInterest = 0;
      let numberOfPayments = tenureInMonths;
      let schedule: any[] = [];

      if (repaymentType === 'emi' && monthlyRate > 0) {
        // Calculate EMI using reducing balance method
        emiAmount = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureInMonths)) / 
                   (Math.pow(1 + monthlyRate, tenureInMonths) - 1);
        emiAmount = Math.round(emiAmount * 100) / 100;

        // Generate payment schedule
        let remainingBalance = principal;
        const startDate = new Date(offer.startDate?._seconds ? offer.startDate._seconds * 1000 : offer.startDate || Date.now());

        for (let i = 1; i <= tenureInMonths; i++) {
          const interestAmount = Math.round(remainingBalance * monthlyRate * 100) / 100;
          const principalAmount = Math.min(Math.round((emiAmount - interestAmount) * 100) / 100, remainingBalance);
          remainingBalance = Math.max(0, remainingBalance - principalAmount);
          
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          schedule.push({
            installmentNumber: i,
            dueDate: dueDate,
            principalAmount,
            interestAmount,
            totalAmount: principalAmount + interestAmount,
            remainingBalance
          });

          totalInterest += interestAmount;
        }
      } else if (repaymentType === 'full_payment') {
        // Lump sum payment
        if (interestType === 'fixed') {
          totalInterest = principal * (annualRate / 100) * (tenureInMonths / 12);
        } else {
          totalInterest = principal * Math.pow(1 + annualRate / 100, tenureInMonths / 12) - principal;
        }
        totalInterest = Math.round(totalInterest * 100) / 100;
        emiAmount = principal + totalInterest;
        numberOfPayments = 1;

        const dueDate = new Date(offer.startDate?._seconds ? offer.startDate._seconds * 1000 : offer.startDate || Date.now());
        if (tenureUnit === 'years') {
          dueDate.setFullYear(dueDate.getFullYear() + tenureValue);
        } else {
          dueDate.setMonth(dueDate.getMonth() + tenureValue);
        }

        schedule.push({
          installmentNumber: 1,
          dueDate: dueDate,
          principalAmount: principal,
          interestAmount: totalInterest,
          totalAmount: principal + totalInterest,
          remainingBalance: 0
        });
      }

      return {
        principal,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalAmount: Math.round((principal + totalInterest) * 100) / 100,
        emiAmount: Math.round(emiAmount * 100) / 100,
        numberOfPayments,
        schedule
      };
    } catch (error) {
      console.error('Error calculating schedule:', error);
      return null;
    }
  }

  // Get offer payment info
  async getOfferPaymentInfo(offerId: string): Promise<any> {
    try {
      // Try API first if available
      if (!isProduction()) {
        try {
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${offerId}/payment-info`);
          if (response.ok) {
            const data = await response.json();
            return normalizeFirestoreData(data);
          }
        } catch (error) {
          console.log('API not available for payment info');
        }
      }

      // Get payments for this offer
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('offerId', '==', offerId),
        orderBy('createdAt', 'desc')
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => 
        normalizeFirestoreData({ id: doc.id, ...doc.data() })
      );

      return { payments };
    } catch (error) {
      console.error('Error getting payment info:', error);
      return { payments: [] };
    }
  }
}

// Export singleton instance
export const firebaseBackend = new FirebaseBackendService();