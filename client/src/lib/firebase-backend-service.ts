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

// Firebase Functions URLs - Using correct Firebase Functions format
const FIREBASE_FUNCTIONS_BASE = 'https://us-central1-crednxt-ef673.cloudfunctions.net';
const API_BASE_URL = `${FIREBASE_FUNCTIONS_BASE}/api`;
const PDF_SERVICE_URL = `${FIREBASE_FUNCTIONS_BASE}/pdfService`;

// Environment-aware PDF service URL - Use main API for all PDF operations
const getPdfServiceUrl = () => {
  if (isProduction()) {
    return API_BASE_URL; // Use main Firebase Functions API for PDFs
  }
  // Use current domain for Replit development environment
  const currentOrigin = window.location.origin;
  return `${currentOrigin}/api`; // Local development
};

// Check if we're in production (Firebase hosting)
const isProduction = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('firebaseapp.com') || 
         hostname.includes('web.app') || 
         hostname.includes('crednxt-ef673');
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

class FirebaseBackendService {
  // Get offer with details (for view page)
  async getOfferWithDetails(offerId: string): Promise<any> {
    try {
      console.log('🔍 Fetching offer details for:', offerId);
      
      if (isProduction()) {
        // In production, try to use Firebase Functions API first
        try {
          const token = await getAuthToken();
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/offers/${offerId}`);
          
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

  // PDF download methods with proper environment detection
  async downloadContractPDF(offerId: string): Promise<void> {
    try {
      console.log('📄 Starting contract download for offer:', offerId);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/contract`;
      
      console.log('🔗 PDF service URL:', url);
      console.log('🔍 Is production:', isProduction());
      console.log('🔑 Token available:', !!token);
      console.log('🌐 Current hostname:', window.location.hostname);
      
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
        throw new Error(`Failed to download contract: ${errorMessage}`);
      }

      const blob = await response.blob();
      console.log('✅ Contract PDF blob received, initiating download...');
      
      // Create and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `loan-contract-${offerId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('✅ Contract PDF downloaded successfully');
    } catch (error) {
      console.error('Contract download failed:', error);
      throw error;
    }
  }

  async downloadKFSPDF(offerId: string): Promise<void> {
    try {
      console.log('📄 Starting KFS download...');
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/kfs`;
      
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
        throw new Error(`Failed to download KFS: ${errorMessage}`);
      }

      const blob = await response.blob();
      console.log('✅ KFS PDF blob received, initiating download...');
      
      // Create and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `kfs-${offerId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('✅ KFS PDF downloaded successfully');
    } catch (error) {
      console.error('KFS download failed:', error);
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

  // Check if phone number is registered
  async checkPhone(phoneNumber: string): Promise<{ exists: boolean; user?: any }> {
    try {
      console.log('🔍 Checking phone number:', phoneNumber);
      
      // Normalize phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const normalizedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
        ? cleanPhone.substring(2) 
        : cleanPhone;
      
      // Check multiple phone formats
      const phoneVariants = [
        phoneNumber,
        normalizedPhone,
        `+91${normalizedPhone}`,
        `91${normalizedPhone}`
      ];
      
      console.log('📱 Phone variants to check:', phoneVariants);
      
      // Query Firestore for user with this phone number
      const usersRef = collection(db, 'users');
      
      for (const phoneVariant of phoneVariants) {
        const q = query(usersRef, where('phone', '==', phoneVariant));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          console.log('✅ Found registered user:', userData.name);
          return {
            exists: true,
            user: {
              id: snapshot.docs[0].id,
              ...normalizeFirestoreData(userData)
            }
          };
        }
      }
      
      console.log('❌ Phone number not found in database');
      return { exists: false };
    } catch (error) {
      console.error('Phone check error:', error);
      return { exists: false };
    }
  }

  // Get offer schedule (repayment schedule)
  async getOfferSchedule(offerId: string): Promise<any[]> {
    try {
      console.log('📅 Getting offer schedule for:', offerId);
      
      // Get offer details first
      const offer = await this.getOfferWithDetails(offerId);
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Calculate repayment schedule based on offer terms
      const { amount, interestRate, tenure, tenureUnit, frequency } = offer;
      const schedule = [];
      
      const totalAmount = parseFloat(amount);
      const rate = parseFloat(interestRate) / 100;
      const tenureNumber = parseInt(tenure);
      
      // Simple calculation - can be enhanced with more complex logic
      let installmentAmount = totalAmount;
      let numberOfInstallments = 1;
      
      if (frequency !== 'end-of-tenure' && frequency !== 'lumpsum') {
        // Calculate based on frequency
        switch (frequency) {
          case 'weekly':
            numberOfInstallments = tenureUnit === 'months' ? tenureNumber * 4 : tenureNumber * 52;
            break;
          case 'monthly':
            numberOfInstallments = tenureUnit === 'years' ? tenureNumber * 12 : tenureNumber;
            break;
          case 'quarterly':
            numberOfInstallments = tenureUnit === 'years' ? tenureNumber * 4 : Math.ceil(tenureNumber / 3);
            break;
        }
        
        // Simple EMI calculation
        const monthlyRate = rate / 12;
        const totalMonths = tenureUnit === 'years' ? tenureNumber * 12 : tenureNumber;
        
        if (rate > 0) {
          installmentAmount = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                            (Math.pow(1 + monthlyRate, totalMonths) - 1);
        } else {
          installmentAmount = totalAmount / numberOfInstallments;
        }
      }
      
      // Generate schedule entries
      const startDate = new Date(offer.createdAt);
      for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        
        switch (frequency) {
          case 'weekly':
            dueDate.setDate(startDate.getDate() + (i + 1) * 7);
            break;
          case 'monthly':
            dueDate.setMonth(startDate.getMonth() + (i + 1));
            break;
          case 'quarterly':
            dueDate.setMonth(startDate.getMonth() + (i + 1) * 3);
            break;
          default:
            // Lump sum at end
            if (tenureUnit === 'months') {
              dueDate.setMonth(startDate.getMonth() + tenureNumber);
            } else if (tenureUnit === 'years') {
              dueDate.setFullYear(startDate.getFullYear() + tenureNumber);
            }
        }
        
        schedule.push({
          installmentNumber: i + 1,
          dueDate: dueDate.toISOString(),
          amount: Math.round(installmentAmount * 100) / 100,
          status: 'pending',
          type: frequency === 'end-of-tenure' ? 'final' : 'regular'
        });
      }
      
      return schedule;
    } catch (error) {
      console.error('Failed to get offer schedule:', error);
      throw error;
    }
  }

  // Update offer status
  async updateOfferStatus(offerId: string, status: string, reason?: string): Promise<void> {
    try {
      console.log('📝 Updating offer status:', { offerId, status, reason });
      
      const offerRef = doc(db, 'offers', offerId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (reason) {
        updateData.statusReason = reason;
      }
      
      await updateDoc(offerRef, updateData);
      console.log('✅ Offer status updated successfully');
    } catch (error) {
      console.error('Failed to update offer status:', error);
      throw error;
    }
  }

  // Create new offer
  async createOffer(offerData: any): Promise<any> {
    try {
      console.log('💼 Creating new offer:', offerData);
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required');
      }
      
      // Prepare offer document
      const offerDoc = {
        ...offerData,
        fromUserId: currentUser.uid,
        fromUserPhone: currentUser.phoneNumber || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      const offersRef = collection(db, 'offers');
      const docRef = await addDoc(offersRef, offerDoc);
      
      console.log('✅ Offer created with ID:', docRef.id);
      
      return {
        id: docRef.id,
        ...offerDoc
      };
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  // Get all offers for the current user
  async getOffers(): Promise<any[]> {
    try {
      console.log('📋 Fetching all offers for current user...');
      
      if (!auth?.currentUser) {
        throw new Error('User not authenticated');
      }
      
      const userId = auth.currentUser.uid;
      const allOffers = [];
      
      // Get offers where user is the sender (fromUserId)
      const sentQuery = query(
        collection(db, 'offers'),
        where('fromUserId', '==', userId)
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentOffers = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data())
      }));
      
      console.log(`Found ${sentOffers.length} sent offers`);
      allOffers.push(...sentOffers);
      
      // Get offers where user is the recipient (toUserId)
      const receivedQuery = query(
        collection(db, 'offers'),
        where('toUserId', '==', userId)
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedOffers = receivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data())
      }));
      
      console.log(`Found ${receivedOffers.length} received offers`);
      allOffers.push(...receivedOffers);
      
      // Remove duplicates
      const uniqueOffers = allOffers.filter((offer, index, self) => 
        index === self.findIndex(o => o.id === offer.id)
      );
      
      console.log(`Total unique offers: ${uniqueOffers.length}`);
      return uniqueOffers;
    } catch (error) {
      console.error('Failed to get offers:', error);
      throw error;
    }
  }

  // Create a test offer for demo purposes
  async createTestOffer(): Promise<any> {
    try {
      console.log('🧪 Creating test offer...');
      
      if (!auth?.currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Create a test offer
      const testOffer = {
        fromUserId: auth.currentUser.uid,
        fromUserPhone: auth.currentUser.phoneNumber || '+919876543211',
        toUserId: 'test-recipient', // Dummy recipient
        toUserPhone: '9876543210',
        toUserName: 'Test Borrower',
        amount: 50000,
        interestRate: 12,
        tenure: 12,
        tenureUnit: 'months',
        purpose: 'Test loan for demo purposes',
        status: 'pending',
        offerType: 'lend',
        interestType: 'simple',
        repaymentType: 'installment',
        frequency: 'monthly',
        allowPartPayment: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'offers'), testOffer);
      console.log('✅ Test offer created with ID:', docRef.id);
      
      return {
        id: docRef.id,
        ...testOffer
      };
    } catch (error) {
      console.error('Failed to create test offer:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseBackend = new FirebaseBackendService();