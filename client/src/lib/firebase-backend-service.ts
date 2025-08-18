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
const PDF_SERVICE_URL = 'http://localhost:5000/api';

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
      const user = auth?.currentUser;
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
      const user = auth?.currentUser;
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
      const user = auth?.currentUser;
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
        const user = auth?.currentUser;
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
        const user = auth?.currentUser;
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

  async downloadRepaymentSchedule(offerId: string): Promise<Blob> {
    try {
      console.log('📄 Starting repayment schedule download...');
      
      // Check if we're in production environment
      if (isProduction()) {
        // Use Firebase Functions URL
        const token = await getAuthToken();
        const url = `${PDF_SERVICE_URL}/offers/${offerId}/pdf/schedule`;
        const response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.blob();
      } else {
        // Use local API
        const response = await makeAuthenticatedRequest(`/api/offers/${offerId}/pdf/schedule`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.blob();
      }
    } catch (error) {
      console.error('Repayment schedule download failed:', error);
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

  // Get offer schedule - ALWAYS fresh calculation
  async getOfferSchedule(offerId: string): Promise<any> {
    try {
      console.log(`💫 FORCING fresh schedule calculation for offer: ${offerId}`);
      
      // SKIP API and any cached data - calculate fresh every time
      const offerDetails = await this.getOfferWithDetails(offerId);
      if (!offerDetails?.offer) {
        return { schedule: null };
      }

      const offer = offerDetails.offer;
      
      // FORCE fresh calculation - ignore any stored values
      const schedule = this.calculateOfferSchedule(offer);
      console.log(`✅ Fresh calculation complete:`, {
        emiAmount: schedule?.emiAmount,
        totalAmount: schedule?.totalAmount,
        numberOfPayments: schedule?.numberOfPayments
      });
      
      return { schedule };
    } catch (error) {
      console.error('Error getting offer schedule:', error);
      return { schedule: null };
    }
  }

  // Client-side schedule calculation - ALWAYS recalculates fresh
  private calculateOfferSchedule(offer: any): any {
    try {
      const principal = parseFloat(offer.amount) || 0;
      const annualRate = parseFloat(offer.interestRate) || 0;
      const tenureValue = parseInt(offer.tenureValue) || 0;
      const tenureUnit = offer.tenureUnit || 'months';
      const repaymentType = offer.repaymentType || 'emi';
      const repaymentFrequency = offer.repaymentFrequency || 'monthly';
      const interestType = offer.interestType || 'reducing';

      console.log(`🔥 FRESH CALCULATION for offer:
        - Amount: ₹${principal}
        - Rate: ${annualRate}%
        - Tenure: ${tenureValue} ${tenureUnit}
        - Type: ${repaymentType}
        - Frequency: ${repaymentFrequency}
      `);

      if (principal <= 0 || annualRate < 0 || tenureValue <= 0) {
        console.error('❌ Invalid input values');
        return null;
      }

      // Calculate payment frequency multipliers
      const getPaymentsPerYear = (frequency: string): number => {
        switch (frequency) {
          case 'weekly': return 52;
          case 'bi_weekly': return 26;
          case 'monthly': return 12;
          case 'quarterly': return 4;
          case 'half_yearly': return 2;
          case 'yearly': return 1;
          default: return 12; // Default to monthly
        }
      };

      const getFrequencyMonths = (frequency: string): number => {
        switch (frequency) {
          case 'weekly': return 1/4.33; // Approximately 1 week in months
          case 'bi_weekly': return 0.5;
          case 'monthly': return 1;
          case 'quarterly': return 3;
          case 'half_yearly': return 6;
          case 'yearly': return 12;
          default: return 1;
        }
      };

      // Convert tenure to months and calculate payments
      const tenureInMonths = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
      const paymentsPerYear = getPaymentsPerYear(repaymentFrequency);
      const periodicRate = annualRate / 100 / paymentsPerYear;
      const frequencyInMonths = getFrequencyMonths(repaymentFrequency);
      const numberOfPayments = Math.ceil(tenureInMonths / frequencyInMonths);
      
      // Debug logging
      console.log(`📊 Calculation Debug:
        - Principal: ₹${principal.toLocaleString('en-IN')}
        - Annual Rate: ${annualRate}%
        - Tenure: ${tenureValue} ${tenureUnit} (${tenureInMonths} months)
        - Frequency: ${repaymentFrequency} (${paymentsPerYear} payments/year)
        - Periodic Rate: ${periodicRate * 100}% (${periodicRate})
        - Number of Payments: ${numberOfPayments}
      `);
      
      let emiAmount = 0;
      let totalInterest = 0;
      let schedule: any[] = [];

      const startDate = new Date(offer.startDate?._seconds ? offer.startDate._seconds * 1000 : offer.startDate || Date.now());

      if (repaymentType === 'emi' && periodicRate > 0) {
        // Calculate EMI using reducing balance method
        emiAmount = (principal * periodicRate * Math.pow(1 + periodicRate, numberOfPayments)) / 
                   (Math.pow(1 + periodicRate, numberOfPayments) - 1);
        emiAmount = Math.round(emiAmount * 100) / 100;

        // Generate payment schedule
        let remainingBalance = principal;

        for (let i = 1; i <= numberOfPayments; i++) {
          const interestAmount = Math.round(remainingBalance * periodicRate * 100) / 100;
          const principalAmount = Math.min(Math.round((emiAmount - interestAmount) * 100) / 100, remainingBalance);
          remainingBalance = Math.max(0, remainingBalance - principalAmount);
          
          const dueDate = this.calculateDueDate(startDate, i, repaymentFrequency);

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
      } else if (repaymentType === 'interest_only') {
        // Interest-only payments with principal due at the end
        // For ₹1,00,000 at 24% annual with monthly frequency:
        // Monthly rate = 24% / 12 = 2%
        // Monthly interest = ₹1,00,000 × 2% = ₹2,000
        const periodicInterest = Math.round(principal * periodicRate * 100) / 100;
        console.log(`🔍 Interest-Only Detailed Calculation:
          - Principal: ₹${principal.toLocaleString('en-IN')}
          - Annual Rate: ${annualRate}%
          - Payments Per Year: ${paymentsPerYear}
          - Periodic Rate: ${periodicRate} (${(periodicRate * 100).toFixed(4)}%)
          - Calculated Interest: ₹${principal} × ${periodicRate} = ₹${periodicInterest}
          - Expected for ₹1L at 24% monthly: ₹2,000
        `);
        emiAmount = periodicInterest;
        totalInterest = periodicInterest * numberOfPayments;

        // Regular interest payments
        for (let i = 1; i <= numberOfPayments; i++) {
          const dueDate = this.calculateDueDate(startDate, i, repaymentFrequency);

          schedule.push({
            installmentNumber: i,
            dueDate: dueDate,
            principalAmount: 0,
            interestAmount: periodicInterest,
            totalAmount: periodicInterest,
            remainingBalance: principal
          });
        }

        // Final principal payment
        const finalDueDate = this.calculateDueDate(startDate, numberOfPayments + 1, repaymentFrequency);
        
        schedule.push({
          installmentNumber: numberOfPayments + 1,
          dueDate: finalDueDate,
          principalAmount: principal,
          interestAmount: 0,
          totalAmount: principal,
          remainingBalance: 0
        });
      } else if (repaymentType === 'full_payment') {
        // Lump sum payment
        if (interestType === 'fixed') {
          totalInterest = principal * (annualRate / 100) * (tenureInMonths / 12);
        } else {
          totalInterest = principal * Math.pow(1 + annualRate / 100, tenureInMonths / 12) - principal;
        }
        totalInterest = Math.round(totalInterest * 100) / 100;
        emiAmount = principal + totalInterest;

        const dueDate = new Date(startDate);
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
        numberOfPayments: repaymentType === 'interest_only' ? numberOfPayments + 1 : (repaymentType === 'full_payment' ? 1 : numberOfPayments),
        paymentFrequency: repaymentFrequency,
        schedule
      };
    } catch (error) {
      console.error('Error calculating schedule:', error);
      return null;
    }
  }

  // Helper method to calculate due dates based on frequency
  private calculateDueDate(startDate: Date, paymentNumber: number, frequency: string): Date {
    const dueDate = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + (paymentNumber * 7));
        break;
      case 'bi_weekly':
        dueDate.setDate(dueDate.getDate() + (paymentNumber * 14));
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + paymentNumber);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + (paymentNumber * 3));
        break;
      case 'half_yearly':
        dueDate.setMonth(dueDate.getMonth() + (paymentNumber * 6));
        break;
      case 'yearly':
        dueDate.setFullYear(dueDate.getFullYear() + paymentNumber);
        break;
      default:
        dueDate.setMonth(dueDate.getMonth() + paymentNumber);
    }
    
    return dueDate;
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