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

// Environment-aware PDF service URL
const getPdfServiceUrl = () => {
  if (isProduction()) {
    return `${FUNCTIONS_BASE_URL}/pdfService`; // Firebase Functions PDF API
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
      console.log('📄 Starting contract download...');
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/contract`;
      
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
}

// Export singleton instance
export const firebaseBackend = new FirebaseBackendService();