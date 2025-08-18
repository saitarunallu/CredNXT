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
  return 'http://localhost:5000/api'; // Local development
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
  // PDF download methods with proper environment detection
  async downloadContractPDF(offerId: string): Promise<void> {
    try {
      console.log('📄 Starting contract download...');
      
      const token = await getAuthToken();
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/contract`;
      
      console.log('🔗 PDF service URL:', url);
      console.log('🔍 Is production:', isProduction());
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF download error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `loan-contract-${offerId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Contract download failed:', error);
      throw error;
    }
  }

  async downloadKFSPDF(offerId: string): Promise<void> {
    try {
      console.log('📄 Starting KFS download...');
      
      const token = await getAuthToken();
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/kfs`;
      
      console.log('🔗 PDF service URL:', url);
      console.log('🔍 Is production:', isProduction());
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF download error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `kfs-${offerId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('KFS download failed:', error);
      throw error;
    }
  }

  async downloadRepaymentSchedule(offerId: string): Promise<Blob> {
    try {
      console.log('📄 Starting repayment schedule download...');
      
      const token = await getAuthToken();
      const pdfServiceUrl = getPdfServiceUrl();
      const url = `${pdfServiceUrl}/offers/${offerId}/pdf/schedule`;
      
      console.log('🔗 PDF service URL:', url);
      console.log('🔍 Is production:', isProduction());
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF download error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Repayment schedule download failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseBackend = new FirebaseBackendService();